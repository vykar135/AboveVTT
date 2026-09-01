/** @import { ProficiencySettings } from './CoreEnums.mjs' */
import StatBlock from "./StatBlock.mjs";
import { AbilityScore, ProficiencyType } from './CoreEnums.mjs'

/**
 * Manages a proficiency level that can have status effects applied to it.
 * This process will apply changes relative to the baseline proficiency bonus
 * on a per effect basis but will never exceed "Expert" level.
 */
export default class ProficiencyTracker {
    /** @type {StatBlock} */
    #stats
    /** @type {string} */
    #uri;
    /** @type {ProficiencySettings} */
    #base;
    /** @type {number} */
    #calculated;
    /** @type {{ instance: string, config: ProficiencySettings, version: number }[]} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the property.
     */
    constructor(stats, uri){
        this.#uri = uri;
        this.#stats = stats;
        this.#base = ProficiencyType.None;
        this.#calculated = undefined;
        this.#sources = [];
    }

    /** The base proficiency level of the property. */
    get base() {
        return this.#base;
    }

    /** The current numeric modifier that matches the proficiency bonus for the associated. */
    get current() {
        return this.#calculated ?? 0;
    }

    /**
     * Updates the base proficiency level for the property.
     * @param {ProficiencySettings} value - The new base proficiency level to assign
     */
    setBaseValue(value) {
        this.#base = value;
    }

    /**
     * Recalculates the current value of the property after effects are applied.
     * @returns {number} The numeric modifier that matches the proficiency bonus for the associated.
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        const baseline = Math.abs(this.#stats.getNumeric(AbilityScore.ProficiencyBonus.uri).current ?? 2);
        const max = Math.abs(baseline) * 2; // Expert
        const min = -max; // Majorly Flawed

        let calculated = this.#calculateEffect(0, baseline, this.#base, min, max);
        if (this.#sources.length == 0) {
            this.#calculated = calculated;
            return this.current;
        }

        // First pass is a version check to remove anything that is no longer applicable
        for (let i = this.#sources.length - 1; i >= 0; i--) {
            if (this.#sources[i].version !== version) {
                this.#sources.splice(i, 1);
            }
        }

        // Now we process the effects in the order they were applied to the stat block
        for (const settings of this.#sources) {
            calculated = this.#calculateEffect(calculated, baseline, settings, min, max);
        }

        this.#calculated = calculated;
        return this.#calculated;
    }

    /**
     * Calculates the new proficiency modifier .
     * @param {number} current 
     * @param {number} baseline - The baseline proficiency bonus to use for the calculation.
     * @param {ProficiencySettings} settings - The proficience settings to apply.
     * @param {number} min - The minimum allowed proficiency level; equates to "Majorly Flawed"
     * @param {number} max - The maximum allowed proficiency level; equates to "Expert"
     * @returns {number} The amount to change the task specific proficiency modifier by
     */
    #calculateEffect(current, baseline, settings, min, max) {
        const multipler = (settings?.multiplier ?? 0);
        if (typeof multipler !== 'number' || multipler === 0) {
            return current;
        }

        // We always round down for RAW
        const updated = current + Math.floor(baseline * multipler);

        if (updated > max) {
            return max;
        } else if (updated < min) {
            return min;
        }

        return updated;
    }

    /**
     * Appends an instance of a modification being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     * @param {ProficiencySettings} config - The config of the proficiency level assigned to the instance.
     */
    addInstance(instance, config) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of a proficiency level ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        const append = { instance: instance, config: config, version: this.#stats.statusEffects.version };
        this.#sources.push(append);
    }

    /**
     * Removes an instance of a modification being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove a modification from proficiency level ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        for (let i = this.#sources.length; i >= 0; i--) {
            if (this.#sources[i].instance !== instance) {
                this.#sources.splice(i, 1);
            }
        }
    }

    /**
     * Removes all modification instances
     */
    clearInstances() {
        this.#sources = [];
        this.#calculated = undefined;
    }
}