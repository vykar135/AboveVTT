import StatBlock from "./StatBlock.mjs";

/**
 * Tracks whether a condition should be applied to a stat block.
 */
export default class ConditionTracker {
    #stats
    #uri;
    #name;
    #srd;
    #dndBeyond;
    #incapacitates;
    #tokenActive;
    #playerActive;
    #effectActive;
    #baseIntensity;
    #intensity;
    #baseImmunity;
    #immunity;

    /** @type {{ [instance: string]: { version: number, intensity: number, immunity: boolean | undefined } }} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the condition.
     * @param {string} name - The name to display for the condition.
     * @param {string} srd - The URI of the condition found on player character sheets.
     * @param {number} dndBeyond - The value of the condition within D&D Beyond.
     * @param {boolean} incapacitates - Whether the condition incapacitates the token while active.
     */
    constructor(stats, uri, name, srd, dndBeyond, incapacitates){
        this.#stats = stats;
        this.#uri = uri;
        this.#name = name;
        this.#srd = srd;
        this.#dndBeyond = dndBeyond;
        this.#incapacitates = incapacitates;
        this.#tokenActive = false;
        this.#playerActive = false;
        this.#effectActive = false;
        this.#baseIntensity = 0;
        this.#intensity = 0;
        this.#baseIntensity = false;
        this.#immunity = false;
        this.#sources = [];

        Object.freeze(this);
    }

    /** The URI of the condition being tracked */
    get uri() { return this.#uri; }

    /** The name to display for the condition. */
    get name() { return this.#name; }

    /** The value of the condition within D&D Beyond. */
    get dndBeyond() { return this.#dndBeyond; }

    /** The URI of the condition found on player character sheets. */
    get srd() { return this.#srd; }

    /** Whether the condition incapacitates the token while active. */
    get incapacitates() { return this.#incapacitates; }

    /** Whether the condition is currently active and the creature is not immune. */
    get isActive() { return this.#effectActive && !this.#immunity; }

    /** The current intensity level for the condition. */
    get intensity() { return this.#intensity; }

    /** Whether the creature is immune to the effects of the condition. */
    get immune() { return this.#immunity; }

    /** @returns {boolean} Whether the player's character sheet is not synced with the campaign. */
    isNotSynced() {
        if (!this.#stats.isPlayer) {
            return false;
        }

        return this.#effectActive !== this.#playerActive;
    }

    /**
     * Updates the base values for the condition.
     * @param {boolean} fromToken - Whether the condition is active within the legacy condition management on a token
     * @param {boolean} fromPlayer - Whether the condition is active on a player's character sheet
     * @param {number} intensity - The numeric value representing the intensity of the effects from the condition
     * @param {boolean} immunity - Whether the creature is immune to the effects of the condition.
     */
    setBaseValue(fromToken, fromPlayer, intensity, immunity) {
        this.#tokenActive = (fromToken === true);
        this.#playerActive = (fromPlayer === true);
        this.#baseIntensity = intensity ?? ((this.#tokenActive || this.#playerActive) ? 1 : 0);
        this.#baseImmunity = (immunity === true);
    }

    /**
     * Recalculates whether the condition is currently active based on a status effect.
     * @returns {boolean} Whether the condition is currently active
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        let active = (this.#playerActive === true || this.#tokenActive === true);
        let intensity = this.#baseIntensity ?? 0;
        let immunity = this.#baseImmunity;

        for (const [key, applied] of this.#sources) {
            if (applied.version === version) {
                active = true;
                intensity += (applied.intensity ?? 1);
                immunity = applied.immunity ?? immunity;
            } else {
                delete this.#sources[key];
            }
        }

        this.#effectActive = active;
        this.#intensity = intensity;
        this.#immunity = immunity;

        return this.isActive;
    }

    /**
     * Appends an instance of the condition being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     * @param {number} intensity - The numeric value representing the intensity of the effects from the condition
     */
    addInstance(instance, intensity) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        this.#sources[instance] = { version: this.#stats.statusEffects.version, intensity }
    }

    /**
     * Removes an instance of the condition being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        delete this.#sources[instance];
    }

    /**
     * Removes all instances of the condition
     */
    clearInstances() {
        this.#sources = {};
    }
}