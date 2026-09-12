/**
 * @typedef {HitPointNormalized & Object.<string, number>} HitPointInfo
 * 
 * @typedef {Object} HitPointNormalized - Defines normalized hit point data while maintaining the shape from D&D Beyond
 * @property {number} maximum - The effective total hit points for the stat block
 * @property {number} current - The current hit points, excluding temporary hit points.
 * @property {number} temp - The amount of temporary hit points.
 * @property {number} [baseTotalHp] - The base maximum hit points before modifiers and overrides.
 * @property {number} [override] - The value that the maximum hit points was explicitly overridden to.
 * @property {number} [removedHp] - The amount of hit points that have been lost by the token; allows for current to be correctly determined by a change to max HP.
 */

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
    #removed;
    #temp;

    /**
     * @param {StatBlock} stats The stat block to retrieve the hit point metadata for
     */
    constructor(stats){
        this.#statBlock = stats;
        this.#maximum = new NumericStatTracker(stats, 'hp:max', 0, 'Maximum Hit Points');
        this.#removed = 0;
        this.#temp = 0;
    }

    /** The total number of hit points the creature or object has including temporary hit hpoints */
    get total() { return this.remaining + this.temp; }

    /** Provides the numeric stat tracker for the maximum hit point. */
    get maximumChanges() { return this.#maximum; }

    /** The calculated maximum hit points of the creature or object. */
    get maximum() { return this.#maximum.current ?? 0; }

    /** The amount of hit points that have been lost from the total hit point pool. */
    get removed() { return this.#removed ?? 0; }

    /** @returns {number} The number of temporary hit hpoints that the creature or object has */
    get temp() { return this.#temp ?? 0; }

    /** @returns {number} The remaining number of hit points that the creature or object has before it will either die or begin making death saving throws  */
    get remaining() {
        const max = this.maximum;
        let amount = max - this.removed;

        if (amount < 0) {
            amount = 0;
        } else if (amount > max) {
            amount = max;
        }

        return amount;
    }

    /** @returns {HitPointInfo} The hit point information that is stored on the token */
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
        return this.#fix(info);
    }

    /**
     * Converts any strings or null values in hit point metadata to numeric values.
     * @param {HitPointInfo} info - The hit point metadata to review.
     */
    #fix(info) {
        if (info.maximum == null) {
            info.maximum = 0;
        } else if (typeof info.maximum === 'string') {
            info.maximum = parseInt(info.maximum);
        }

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

        if (typeof info.removedHp === 'string') {
            info.removedHp = parseInt(info.removedHp);
            if (isNaN(info.removedHp)) {
                info.removedHp = undefined;
            }
        }

        if (typeof info.override === 'string') {
            info.override = parseInt(info.override);
            if (isNaN(info.override)) {
                info.override = undefined;
            }
        }

        for (const [key, value] of Object.entries(info)) {
            if (value != null && isNaN(value)) {
                info[key] = 0;
            }
        }

        if (info.removedHp == null) {
            info.removedHp = (info.maximum - info.current);
        }

        this.#maximum.setBaseValue(info.maximum ?? 0);
        this.#removed = info.removedHp;
        this.#temp = info.temp;

        return info;
    }

    /** Verifies that the current hit point value does not exceed the maximum. */
    checkMaximum() {
        let changed = false;
        const info = this.#getCurrent();

        const max = this.maximum;
        if (this.#statBlock.isPlayer && info.maximum !== max) {
            changed = true;
        }

        let current = info.current;
        if (current > max) {
            changed = true;
            info.current = max;
            info.removedHp = 0;
            this.#removed = 0;
        }

        if (changed) {
            this.#commit();
        }
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
        if (temp >= amount) {
            temp = temp - amount;
            this.#temp = info.temp = temp;
            
            return this.total;

        } else if (temp > 0) {
            amount = amount - temp;
            this.#temp = info.temp = 0;
        }

        const max = this.maximum;
        this.#removed += amount;
        if (this.#removed > max) {
            this.#removed = max;
        }

        info.removedHp = this.#removed;
        info.current = this.remaining;

        this.#commit();

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

        this.#removed -= amount;
        if (this.#removed > max) {
            this.#removed = max;
        }

        info.removedHp = this.#removed;
        info.current = this.remaining;

        this.#commit();

        return this.total;
    }

    /**
     * Sets the amount of remaining hit points to the amount specified; only checking that the value is within the bounds of the maximum hit points.
     * @param {number} amount - The amount of remaining hit points to set
     */
    setRemaining(amount) {
        const info = this.#getCurrent();
        const max = info.maximum;

        if (amount < 0) {
            amount = 0;
        } else if (amount > max) {
            amount = max;
        }

        const removed = (max - amount);
        this.#removed = removed;

        if (info.current === amount && info.removedHp === removed) {
            return amount;
        }

        info.current = amount;
        info.removedHp = removed;

        this.#commit();

        return amount;
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
        if (current >= amount) {
            return current;
        }

        info.temp = amount;
        this.#temp = amount;

        this.#commit();

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

        const info = this.#getCurrent();
        if (info.temp === amount) {
            return amount;
        }

        info.temp = amount;
        this.#temp = amount;
        
        this.#commit();

        return amount;
    }

    /** Queues up the commit process for changes being made to the hit point block. */
    #commit() {
        if (!this.#statBlock.isContributor) {
            return;
        }

        if (!this.#statBlock.isPlayer) {
            this.#statBlock.token?.sync();
            return;
        }

        const info = this.#getCurrent();
        const commitMax = this.#shouldOverrideMax(info);
    }

    /**
     * Determines whether a change to the tracked maximum value has occurred and should be commited.
     * @param {HitPointInfo} info */
    #shouldOverrideMax(info) {
        if (!this.#maximum.hasChanges) {
            return (info.override != null);
        }

        const overrideTo = this.#maximum.current;
        const commitOverride = (info.override !== overrideTo);

        info.maximum = overrideTo;
        info.override = overrideTo;

        return commitOverride;
    }
}