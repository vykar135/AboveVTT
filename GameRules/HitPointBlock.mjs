/** @import { TokenHitPointInfo } from '../types/Token.types.js' */

import NumericStatTracker from "./NumericStatTracker.mjs";
import StatBlock from "./StatBlock.mjs";

/**
 * Player API call
 * PUT https://character-service.dndbeyond.com/character/v5/life/hp/damage-taken
 * {"characterId":100920342,"removedHitPoints":10,"temporaryHitPoints":0}
 */

/** Assists with the management of the various types of hit points for a token */
export default class HitPointBlock {
    #statBlock;
    #maximum;

    /**
     * @param {StatBlock} stats The stat block to retrieve the hit point metadata for
     */
    constructor(stats){
        this.#statBlock = stats;
        this.#maximum = new NumericStatTracker(stats, 'hp:max', 0, 'Maximum Hit Points');
    }

    /** Provides the numeric stat tracker for the maximum hit point. */
    get maximumChanges() { return this.#maximum; }

    /** The calculated maximum hit points of the creature or object */
    get maximum() { return this.#maximum.current ?? 0; }

    /** @returns {number} The remaining number of hit points that the creature or object has before it will either die or begin making death saving throws  */
    get remaining() {
        let amount = this.#getCurrent().current;
        if (typeof amount === 'string') {
            amount = parseInt(amount);
        }

        return amount ?? 0;
    }

    /** The total number of hit points the creature or object has including temporary hit hpoints */
    get total() { return this.remaining + this.temp; }

    /** @returns {number} The number of temporary hit hpoints that the creature or object has */
    get temp() {
        let amount = this.#getCurrent().temp;
        if (typeof amount === 'string') {
            amount = parseInt(amount);
        }

        return amount ?? 0;
    }

    /** @returns {TokenHitPointInfo} The hit point information that is stored on the token */
    #getCurrent() {
        const options = this.#statBlock.getOptions();
        if (options.hitPointInfo == null) {
            options.hitPointInfo = {
                maximum: 0,
                current: 0,
                temp: 0
            };
        }

        const info = options.hitPointInfo;
        HitPointBlock.fix(info);
        return info;
    }

    /**
     * Converts any strings or null values in hit point metadata to numeric values.
     * @param {TokenHitPointInfo} info - The hit point metadata to review.
     * @returns {TokenHitPointInfo} The updated values.
     */
    static fix(info) {
        if (info.current == null) {
            info.current = 0;
        } else if (typeof info.current === 'string') {
            info.current = parseInt(info.current);
        }
        
        if (info.temp == null) {
            info.temp = 0;
        } else if (typeof info.temp === 'string') {
            info.temp = parseInt(info.temp);
        }
        
        if (info.maximum == null) {
            info.maximum = 0;
        } else if (typeof info.maximum === 'string') {
            info.maximum = parseInt(info.maximum);
        }
        
        return info;
    }

    /**
     * @param {number} amount - The amount of damage dealt.
     * @param {string[]} tags - Tags that describe how the damage was dealt so that we can apply resistances and other effects.
     * @returns {number} The new remaining hit points after the damage was applied.
     */
    damage(amount, tags) {
        if (amount <= 0) {
            return this.total;
        }

        const info = this.#getCurrent();

        let temp = info.temp;
        if (typeof temp === 'string') {
            temp = parseInt(temp);
        }

        if (temp >= amount) {
            temp = temp - amount;
            info.temp = temp;
            
            return this.total;

        } else if (temp > 0) {
            amount = amount - temp;
            info.temp = 0;
        }

        let current = info.current;
        if (typeof current === 'string') {
            current = parseInt(current);
        }

        let remaining = current - amount;
        if (remaining < 0) {
            remaining = 0;
        }

        info.current = remaining;

        return this.total;
    }

    /**
     * @param {number} amount - The amount of healing received.
     * @param {string[]} tags - Tags that describe how the healing was received so that we can apply bonuses and other effects.
     * @returns {number} The new remaining hit points after the damage was applied.
     */
    heal(amount, tags) {
        if (amount <= 0) {
            return this.total;
        }

        const info = this.#getCurrent();
        const max = this.maximum;
        let current = info.current;
        if (typeof current === 'string') {
            current = parseInt(current);
        }

        let remaining = current + amount;
        if (remaining > max) {
            remaining = max;
        }

        info.current = remaining;

        return this.total;
    }

    /** Verifies that the current hit point value does not exceed the maximum. */
    checkMaximum() {
        const info = this.#getCurrent();
        const max = this.maximum;
        let current = info.current;
        if (typeof current === 'string') {
            current = parseInt(current);
        }

        if (current <= max) {
            return;
        }

        info.current = max;
    }

    /**
     * Requests a number of temporary hit points to be assigned; if this value is less than the current amount it is ignored.
     * @param {number} amount - The requested amount of temporary hit points to assign
     * @param {string[]} tags - Tags that describe how the healing was received so that we can apply bonuses and other effects.
     * @returns {number} The number of temporarily hit points that are currently applied
     */
    applyTemp(amount, tags){
        const info = this.#getCurrent();
        let current = info.temp;
        if (typeof current === 'string') {
            current = parseInt(current);
        }

        if (current != null && current >= amount) {
            return current;
        }

        info.temp = amount;

        return amount;
    }

    /**
     * Sets the amount of remaining hit points to the amount specified; only checking that the value is within the bounds of the maximum hit points.
     * @param {number} amount - The amount of remaining hit points to set
     */
    setRemaining(amount) {
        const info = this.#getCurrent();
        let max = info.maximum;
        if (typeof max === 'string') {
            max = parseInt(max);
        }

        if (amount < 0) {
            amount = 0;
        } else if (amount > max) {
            amount = max;
        }

        info.current = amount;

        return amount;
    }

    /**
     * Sets the amount of temporary hit points to the amount specified without checking the current value.
     * @param {number} amount - The amount of temporary hit points to set
     */
    setTemp(amount) {
        if (amount < 0) {
            amount = 0;
        }

        this.#getCurrent().temp = amount;
        
        return amount;
    }
}