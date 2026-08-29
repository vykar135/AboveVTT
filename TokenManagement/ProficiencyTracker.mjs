/** @import { ProficiencySettings } from './CoreEnums.mjs' */
import StatBlock from "./StatBlock.mjs";
import { ProficiencyType } from './CoreEnums.mjs'

/**
 * Manages a proficiency level that can have status effects applied to it.
 * This property class is LIFO to keep it as easy to understand as possible.
 */
export default class ProficiencyTracker {
    /** @type {StatBlock} */
    #stats
    /** @type {string} */
    #uri;
    /** @type {ProficiencySettings} */
    #base;
    /** @type {ProficiencySettings} */
    #last;
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
        this.#last = undefined;
        this.#sources = [];
    }

    /** The base proficiency level of the property. */
    get base() {
        return this.#base;
    }

    /** The current value of the proficiency level for the property. */
    get current() {
        return this.#last ?? this.#base;
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
     * @returns {ProficiencySettings} The updated proficiency level for the property
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;

        for (let i = this.#sources.length - 1; i >= 0; i--) {
            if (this.#sources[i].version !== version) {
                this.#sources.splice(i, 1);
            }
        }

        this.#last = this.#sources.length > 0 ? this.#sources[this.#sources.length - 1] : undefined;

        return this.current;
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
        this.#last = config;
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

        this.#last = this.#sources.length > 0 ? this.#sources[this.#sources.length - 1] : undefined;
    }

    /**
     * Removes all modification instances
     */
    clearInstances() {
        this.#sources = [];
        this.#last = undefined;
    }
}