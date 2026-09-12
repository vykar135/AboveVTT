import StatBlock from "./StatBlock.mjs";

/** Tracks whether a boolean property is enabled on a stat block. */
export default class ToggleTracker {
    #stats
    #uri;
    #name;
    #baseEnabled;
    #enabled;

    /** @type {{ instance: string, version: number, fromCondition: boolean, priority: number, enabled: boolean | undefined }[]} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the property.
     * @param {string} name - The name to display for the property.
     */
    constructor(stats, uri, name){
        this.#stats = stats;
        this.#uri = uri;
        this.#name = name;
        this.#baseEnabled = false;
        this.#enabled = false;
        this.#sources = [];

        Object.freeze(this);
    }

    /** The URI of the property being tracked */
    get uri() { return this.#uri; }

    /** The name to display for the property. */
    get name() { return this.#name; }

    /** Whether the property is enabled. */
    get enabled() { return this.#enabled; }

    /**
     * Updates the base value for the property.
     * @param {boolean} enabled - Whether the property is enabled.
     */
    setBaseValue(enabled) {
        this.#baseEnabled = (enabled === true);
    }

    /**
     * Recalculates whether the property is currently enabled based on a status effect.
     * @returns {boolean} Whether the property is currently enabled
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        let enabled = this.#baseEnabled;

        this.#sources = this.#sources.filter(entry => entry.version === version || entry.fromCondition === true);
        this.#sources.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

        for (const applied of this.#sources) {
            enabled = applied.enabled ?? immunity;
        }

        this.#enabled = enabled;
        return this.#enabled;
    }

    /**
     * Appends an instance of the property to enable of the stat block.
     * @param {{ instance: string , fromCondition: boolean, priority: number, enabled: boolean }} settings 
     */
    addInstance(settings) {
        let { instance, fromCondition, priority, enabled } = settings;
        
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of toggle ${this.#uri} without a valid instance identifier`);
            return;
        }

        if (typeof priority !== 'number' && priority != null) {
            console.warn(`Attempting to append priority to ${this.#uri} without a valid numeric value`);
            priority = undefined;
        }

        if (typeof enabled !== 'boolean' && enabled != null) {
            console.warn(`Attempting to append a toggle on ${this.#uri} without a valid boolean value`);
            enabled = undefined;
        }

        instance = instance.toLowerCase();
        const index = this.#sources.findIndex(entry => entry.instance === instance);

        const impact = {
            instance, enabled, priority,
            fromCondition: (fromCondition === true),
            version: this.#stats.statusEffects.version
        };
        Object.freeze(impact);

        if (index < 0) {
            this.#sources.push(impact);
        } else {
            this.#sources[index] = impact;
        }
    }

    /**
     * Removes an instance of the property being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove an instance of toggle ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLowerCase();
        this.#sources = this.#sources.filter(entry => entry.instance !== instance);
    }

    /** Removes all instances of the property */
    clearInstances() {
        if (this.#sources.length === 0) {
            return;
        }

        this.#sources = [];
    }
}