/**
 * @typedef {HitPointNormalized & Object.<string, number>} HitPointInfo
 * 
 * @typedef {Object} HitPointNormalized - Defines normalized hit point data while maintaining the shape from D&D Beyond
 * @property {number} maximum - The effective total hit points for the stat block
 * @property {number} current - The remaining hit points, excluding temporary hit points.
 * @property {number} temp - The amount of temporary hit points.
 */

import NumericStatTracker from "./NumericStatTracker.mjs";
import StatBlock from "./StatBlock.mjs";

/**
 * Player API call
 * PUT https://character-service.dndbeyond.com/character/v5/life/hp/damage-taken
 * {"characterId":100920342,"remainingHitPoints":10,"temporaryHitPoints":0}
 */

/** Assists with the management of the various types of hit points for a token */
export default class HitPointBlock {
    #statBlock;
    #maximum;
    #remaining;
    #temp;

    /**
     * @param {StatBlock} stats The stat block to retrieve the hit point metadata for
     */
    constructor(stats){
        this.#statBlock = stats;
        this.#maximum = new NumericStatTracker(stats, 'hp:max', 0, 'Maximum Hit Points');
        this.#remaining = 0;
        this.#temp = 0;
    }

    /** The total number of hit points the creature or object has including temporary hit hpoints */
    get total() {
        if (this.remaining <= 0) {
            return 0;
        }

        return this.remaining + this.temp;
    }

    /** Provides the numeric stat tracker for the maximum hit point. */
    get maximumChanges() { return this.#maximum; }

    /** The calculated maximum hit points of the creature or object. */
    get maximum() { return this.#maximum.current ?? 0; }

    /** The amount of hit points that the creature or object has remaining excluding temporary hit points. */
    get remaining() {
        const max = this.maximum;
        let amount = this.#remaining ?? 0;

        if (amount < 0) {
            amount = 0;
        } else if (amount > max) {
            amount = max;
        }

        return amount;
    }

    /** @returns {number} The number of temporary hit hpoints that the creature or object has */
    get temp() { return this.#temp ?? 0; }

    /** @returns {HitPointInfo} The hit point information that is stored on the stat block */
    #getCurrent() {
        const options = this.#statBlock.getOptions();
        if (options.hitPointInfo == null) {
            options.hitPointInfo = {
                maximum: 0,
                remaining: 0,
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

        this.#maximum.setBaseValue(info.maximum ?? 0);
        this.#remaining = info.current;
        this.#temp = info.temp;

        return info;
    }

    /** Verifies that the remaining hit point value does not exceed the maximum.
     * @param {boolean} preventSync - Whether to prevent automatically syncing any changes.
    */
    checkMaximum(preventSync) {
        if (this.#statBlock.isPlayer) {
            return;
        }

        let changed = false;
        const max = this.maximum;

        const info = this.#getCurrent();
        let remaining = info.current;
        if (remaining > max) {
            changed = true;
            info.current = max;
            this.#remaining = max;
        }

        if (changed && preventSync !== true) {
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
            
            this.#commit();
            return this.total;

        } else if (temp > 0) {
            amount = amount - temp;
            this.#temp = info.temp = 0;
        }

        this.#remaining -= amount;
        if (this.#remaining < 0) {
            this.#remaining = 0;
        }

        info.current = this.#remaining;
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

        this.#remaining += amount;
        if (this.#remaining > max) {
            this.#remaining = max;
        }

        info.current = this.#remaining;
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

        this.#remaining = amount;
        if (info.current === amount) {
            return amount;
        }

        info.current = amount;
        this.#commit();

        return amount;
    }

    /**
     * Requests a number of temporary hit points to be assigned; if this value is less than the remaining amount it is ignored.
     * @param {number} amount - The requested amount of temporary hit points to assign
     * @param {string[]} tags - Tags that describe how the healing was received so that we can apply bonuses and other effects.
     * @returns {number} The number of temporarily hit points that are remainingly applied
     */
    applyTemp(amount, tags){
        const info = this.#getCurrent();
        let remaining = info.temp;
        if (remaining >= amount) {
            return remaining;
        }

        info.temp = amount;
        this.#temp = amount;

        this.#commit();

        return amount;
    }

    /**
     * Sets the amount of temporary hit points to the amount specified without checking the remaining value.
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
            this.#statBlock.hasPendingChanges(true);
            this.#statBlock.update_and_sync();
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