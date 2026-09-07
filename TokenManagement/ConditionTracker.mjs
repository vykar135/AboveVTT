import StatBlock from "./StatBlock.mjs";

/**
 * Tracks whether a condition should be applied to a stat block.
 */
export default class ConditionTracker {
    #stats
    #uri;
    #name;
    #incapacitates;
    #tokenActive;
    #playerActive;
    #effectActive;
    #baseIntensity;
    #intensity;
    #baseImmunity;
    #immunity;

    /** @type {{ instance: string, version: number, intensity: number, immunity: boolean | undefined }[]} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the condition.
     * @param {string} name - The name to display for the condition.
     * @param {boolean} incapacitates - Whether the condition incapacitates the token while active.
     */
    constructor(stats, uri, name, incapacitates){
        this.#stats = stats;
        this.#uri = uri;
        this.#name = name;
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

        this.#sources = this.#sources.filter(entry => entry.version === version);

        for (const applied of this.#sources) {
            active = true;
            intensity += (applied.intensity ?? 1);
            immunity = applied.immunity ?? immunity;
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
     * @param {boolean} immunity - Whether the creature is immune to the effects of the condition.
     */
    addInstance(instance, intensity, immunity) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        if (typeof immunity !== 'boolean' && immunity != null) {
            console.warn(`Attempting to append immunity to ${this.#uri} without a valid boolean value`);
            immunity = undefined;
        }

        if (typeof intensity !== 'number') {
            console.warn(`Attempting to append intensity to ${this.#uri} without a valid numeric value`);
            intensity = undefined;
        }

        instance = instance.toLocaleLowerCase();
        const index = this.#sources.findIndex(entry => entry.instance === instance);

        const impact =  {
            instance, intensity, immunity,
            version: this.#stats.statusEffects.version
        };

        if (index < 0) {
            this.#sources.push(impact);
        } else {
            this.#sources[index] = impact;
        }

        this.#stats.hasPendingChanges(true);
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

        instance = instance.toLowerCase();
        this.#sources = this.#sources.filter(entry => entry.instance !== instance);
        this.#stats.hasPendingChanges(true);
    }

    /**
     * Removes all instances of the condition
     */
    clearInstances() {
        this.#sources = [];
        this.#stats.hasPendingChanges(true);
    }
}