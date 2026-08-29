import StatBlock from "./StatBlock.mjs";

/**
 * Tracks whether a condition should be applied to a stat block.
 */
export default class ConditionTracker {
    /** @type {StatBlock} */
    #stats
    /** @type {string} */
    #uri;
    /** @type {boolean} */
    #tokenActive;
    /** @type {boolean} */
    #playerActive;
    /** @type {boolean} */
    #effectActive;
    /** @type {{ [instance: string]: number}} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the condition.
     * @param {boolean} fromToken - Whether the condition is active within the legacy condition management on the token
     * @param {boolean} fromPlayer - Whether the condition is active on a player's character sheet
     */
    constructor(stats, uri, fromToken, fromPlayer){
        this.#stats = stats;
        this.#uri = uri;
        this.#tokenActive = (fromToken === true);
        this.#playerActive = (fromPlayer === true);
        this.#sources = [];
    }

    /** The URI of the condition being tracked */
    get uri() {
        return this.#uri;
    }

    /** The base value of the property. */
    get isActive() {
        return (this.#effectActive === true) || (this.#tokenActive === true) || (this.#playerActive === true);
    }

    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get fromToken() {
        return (this.#tokenActive === true);
    }

    /** Whether the condition is active on a player's character sheet */
    get fromPlayer() {
        return (this.#playerActive === true) && this.#stats.isPlayer;
    }

    /** Whether the condition is active within the legacy condition management on the token */
    get fromEffect() {
        return (this.#effectActive === true);
    }

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
     */
    setBaseValue(fromToken, fromPlayer) {
        this.#tokenActive = (fromToken === true);
        this.#playerActive = (fromPlayer === true);
    }

    /**
     * Recalculates whether the condition is currently active based on a status effect.
     * @returns {boolean} Whether the condition is currently active
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        let active = false;

        for (const [key, applied] of this.#sources) {
            if (applied === version) {
                active = true;
            } else {
                delete this.#sources[key];
            }
        }

        this.#effectActive = active;
        return this.isActive;
    }

    /**
     * Appends an instance of the condition being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    addInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        this.#sources[instance] = this.#stats.statusEffects.version;
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