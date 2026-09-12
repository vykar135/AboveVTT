import StatBlock from "./StatBlock.mjs";

/**
 * @typedef {Object} DefenseImpact
 * @property {string} [instance] - The reference to the status effect that produced the change.
 * @property {number} [version] - The version of the status effect collect at the time the impact was applied.
 * @property {boolean} [fromCondition] - Whether the effect is from a condition.
 * @property {number} [priority] - The priority of the effect.
 * @property {boolean} [immunity] - Whether immunity to the damage type is being granted or denied.
 * @property {boolean} [resistance] - Whether resistance to the damage type is being granted or denied.
 * @property {boolean} [vulnerability] - Whether vulnerability to the damage type is being granted or denied.
 */

/** Tracks whether a form of defenses for the specified damage type should be applied to a stat block. */
export default class DefenseTracker {
    #stats
    #damageType;
    #name;
    #baseImmunity;
    #baseResistance;
    #baseVulnerability;
    #immunity;
    #resistance;
    #vulnerability;

    /** @type {DefenseImpact[]} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} damageType - The identifier of the type of damage.
     * @param {string} name - The name to display for the damage type.
     */
    constructor(stats, damageType, name){
        this.#stats = stats;
        this.#damageType = damageType;
        this.#name = name;
        this.#baseImmunity = false;
        this.#baseResistance = false;
        this.#baseVulnerability = false;
        this.#immunity = false;
        this.#resistance = false;
        this.#vulnerability = false;
        this.#sources = [];

        Object.freeze(this);
    }

    /** The type of damage being tracked for defenses */
    get damageType() { return this.#damageType; }

    /** The name to display for the damage type. */
    get name() { return this.#name; }

    /** Whether the creature is immune to type of damage. */
    get immune() { return this.#immunity; }

    /** Whether the creature is resistant to type of damage. */
    get resistant() { return this.#resistance; }

    /** Whether the creature is vulnerable to type of damage. */
    get vulnerable() { return this.#vulnerability; }

    /**
     * Updates the base values for the creature's defenses.
     * @param {boolean} immunity - Whether the creature is immune to the type of damage.
     * @param {boolean} resistance - Whether the creature is resistant to the type of damage.
     * @param {boolean} vulnerability - Whether the creature is vulnerable to the type of damage.
     */
    setBaseValue(immunity, resistance, vulnerability) {
        this.#baseImmunity = (immunity === true);
        this.#baseResistance = (resistance === true);
        this.#baseVulnerability = (vulnerability === true);
    }

    /** Recalculates what damage defenses are currently active based on the applied status effects. */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        let immune = this.#baseImmunity;
        let resistant = this.#baseResistance;
        let vulnerable = this.#baseVulnerability;

        this.#sources = this.#sources.filter(entry => entry.version === version || entry.fromCondition === true);
        this.#sources.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

        for (const applied of this.#sources) {
            immune = applied.immunity ?? immune;
            resistant = applied.resistance ?? resistant;
            vulnerable = applied.vulnerability ?? vulnerable;
        }

        this.#immunity = immune;
        this.#resistance = resistant;
        this.#vulnerability = vulnerable;
    }

    /**
     * Appends an instance of the damage defenses being applied to the stat block.
     * @param {DefenseImpact} settings
     */
    addInstance(settings) {
        let { instance, fromCondition, priority, immunity, resistance, vulnerability } = settings;

        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of defense against ${this.#damageType} without a valid instance identifier`);
            return;
        }

        if (typeof priority !== 'number' && priority != null) {
            console.warn(`Attempting to append priority to ${this.#damageType} without a valid numeric value`);
            priority = undefined;
        }

        if (typeof immunity !== 'boolean' && immunity != null) {
            console.warn(`Attempting to append immunity to ${this.#damageType} without a valid boolean value`);
            immunity = undefined;
        }

        if (typeof resistance !== 'boolean' && resistance != null) {
            console.warn(`Attempting to append resistance to ${this.#damageType} without a valid boolean value`);
            resistance = undefined;
        }

        if (typeof vulnerability !== 'boolean' && vulnerability != null) {
            console.warn(`Attempting to append vulnerability to ${this.#damageType} without a valid boolean value`);
            vulnerability = undefined;
        }

        instance = instance.toLowerCase();
        const index = this.#sources.findIndex(entry => entry.instance === instance);

        const impact = /** @type {DefenseImpact} */ {
            fromCondition: (fromCondition === true),
            instance, priority, immunity, resistance, vulnerability,
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
     * Removes an instance of the defenses being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove an instance of ${this.#damageType} defense without a valid instance identifier`);
            return;
        }

        instance = instance.toLowerCase();
        this.#sources = this.#sources.filter(entry => entry.instance !== instance);
    }

    /** Removes all instances of the defense effects */
    clearInstances() {
        if (this.#sources.length === 0) {
            return;
        }
        
        this.#sources = [];
    }
}