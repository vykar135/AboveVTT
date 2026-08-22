/** @import { TokenHitPointInfo } from './Token.types.js' */

import { HitPoint } from "./CoreEnums.mjs";
import StatBlock from "./StatBlock.mjs";

/** Assists with the management of the various types of hit points for a token */
export default class HitPointBlock {
    /** @type {StatBlock} */
    #statBlock;
    /** @type {TokenHitPointInfo} */
    #expectedHitPoints;

    /**
     * @param {StatBlock} stats The stat block to retrieve the hit point metadata for
     */
    constructor(stats){
        this.#statBlock = stats;
        this.resetExpected();
    }

    /** @returns {TokenHitPointInfo} The hit point information that is stored on the token */
    get #hitPointInfo() {
        if (this.#statBlock.token.options.hitPointInfo == null) {
            this.#statBlock.token.options.hitPointInfo = {
                maximum: 0,
                current: 0,
                temp: 0
            };
        }

        const info = this.#statBlock.token.options.hitPointInfo;
        HitPointBlock.fix(info);
        return info;
    }

    #expects() {
        if (!this.#statBlock.isPlayer) {
            return null;
        }
        
        if (this.#expectedHitPoints == null) {
            const info = this.#hitPointInfo;

            // We omit max HP from this because it is managed by the numeric properties of the stat block
            this.#expectedHitPoints = {
                current: info.current,
                temp: info.temp
            };
        }

        return this.#expectedHitPoints;
    }

    /**
     * Converts any strings or null values in hit point metadata to numeric values.
     * @param {TokenHitPointInfo} info - The hit point metadata to review.
     * @returns {TokenHitPointInfo} The updated values.
     */
    static fix(info) {
        if (info.current == null) {
            info.current = 0;
        } else if (!isNaN(info.current)) {
            info.current = parseInt(info.current);
        }
        
        if (info.temp == null) {
            info.temp = 0;
        } else if (!isNaN(info.temp)) {
            info.temp = parseInt(info.temp);
        }
        
        if (info.maximum == null) {
            info.maximum = 0;
        } else if (!isNaN(info.maximum)) {
            info.maximum = parseInt(info.maximum);
        }
        
        return info;
    }

    /** @returns {number} The calculated maximum hit points of the creature or object */
    get maximum() {
        return this.#statBlock.getNumeric(HitPoint.Maximum.uri)?.current ?? 0;
    }

    /** @returns {number} The remaining number of hit points that the creature or object has before it will either die or begin making death saving throws  */
    get remaining() {
        return this.#hitPointInfo.current ?? 0;
    }

    /** @returns {number} The total number of hit points the creature or object has including temporary hit hpoints */
    get total() {
        return this.remaining + this.temp;
    }

    /** @returns {number} The number of temporary hit hpoints that the creature or object has */
    get temp() {
        return this.#hitPointInfo.temp ?? 0;
    }

    /** Review the reported values for the player sheet when available against the expected amounts. */
    isPlayerNotSynced() {
        const outcome = {
            maximum: false,
            remaining: false,
            temp: false
        };

        if (!this.#statBlock.isPlayer) {
            return outcome;
        }

        const expected = this.#expectedHitPoints;
        if (expected == null) {
            return outcome;
        }

        const reported = this.#statBlock.reportedHp;
        if (reported == null) {
            return outcome;
        }

        outcome.maximum = (reported.maximum !== this.maximum);
        outcome.remaining = (reported.current !== expected.current);
        outcome.temp = (reported.temp !== expected.temp);

        if (!outcome.maximum && !outcome.remaining && !outcome.temp) {
            this.resetExpected();
        }

        return outcome;
    }

    /** Resets the expected hit point values to the ones from the token. */
    resetExpected() {
        this.#expectedHitPoints = null;
    }

    /**
     * 
     * @param {number} amount - The amount of damage dealt.
     * @param {string[]} tags - Tags that describe how the damage was dealt so that we can apply resistances and other effects.
     * @returns {number} The new remaining hit points after the damage was applied.
     */
    damage(amount, tags) {
        const info = this.#hitPointInfo;
        if (amount <= 0) {
            return this.total;
        }

        // Being lazy with the null coalesce here just to not have to check if player over and over
        const expects = this.#expects() ?? {};

        let temp = info.temp;
        if (temp >= amount) {
            temp = temp - amount;
            info.temp = temp;
            expects.temp = temp;
            return this.total;

        } else if (temp > 0) {
            amount = amount - temp;
            info.temp = 0;
            expects.temp = 0;
        }

        let remaining = info.current - amount;
        if (remaining < 0) {
            remaining = 0;
        }

        info.current = remaining;
        expects.current = remaining;
        return this.total;
    }

    /**
     * Sets the amount of remaining hit points to the amount specified; only checking that the value is within the bounds of the maximum hit points.
     * @param {number} amount - The amount of remaining hit points to set
     */
    setRemaining(amount) {
        const info = this.#hitPointInfo;
        const max = info.maximum;

        if (amount < 0) {
            amount = 0;
        } else if (amount > max) {
            amount = max;
        }

        info.current = amount;
        if (this.#statBlock.isPlayer) {
            this.#expects().current = amount;
        }

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

        this.#hitPointInfo.temp = amount;
        if (this.#statBlock.isPlayer) {
            this.#expects().temp = amount;
        }
        
        return amount;
    }

    /**
     * Requests a number of temporary hit points to be assigned; if this value is less than the current amount it is ignored.
     * @param {number} amount - The requested amount of temporary hit points to assign
     * @returns {number} The number of temporarily hit points that are currently applied
     */
    applyTemp(amount){
        const info = this.#hitPointInfo;
        const current = info.temp;
        if (current != null && current >= amount) {
            if (this.#statBlock.isPlayer) {
                this.#expects().temp = current;
            }

            return current;
        }

        info.temp = amount;
        if (this.#statBlock.isPlayer) {
            this.#expects().temp = amount;
        }

        return amount;
    }
}