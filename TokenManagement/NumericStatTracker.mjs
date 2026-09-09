import StatBlock from "./StatBlock.mjs";

/**
 * @typedef {Object} NumericStatImpact
 * @property {string} instance - The reference to the status effect that produced the change.
 * @property {number} version - The version of the status effect collect at the time the impact was applied.
 * @property {boolean} fromCondition - Whether the effect is from a condition.
 * @property {number} priority - The priority of the effect.
 * @property {number} setTo - The fixed amount to set the value of the property to.
 * @property {number} amount - The fixed amount to change the property by.
 * @property {number} multiplier - The multiplier to apply to the value of the property.
 * @property {string} imports - The URI of the numeric property to import the current value for and apply to the requesting property.
 * @property {boolean} importPenalty - Whether the imported value is treated as a penalty against the requesting property.
 */

/** Manages a numberic property value that can have status effects applied to it. */
export default class NumericStatTracker {
    #stats
    #uri;
    #name;
    #base;

    /** @type {number} */
    #baseOverride;
    /** @type {number} */
    #multiplier;
    /** @type {number | undefined} */
    #snapshot;
    /** @type {NumericStatImpact[]} */
    #sources;
    /** @type {number} */
    #calculated;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the property.
     * @param {number} value - The initial value for the property.
     * @param {string} name - The name of the property.
     */
    constructor(stats, uri, value, name){
        this.#uri = uri;
        this.#name = name;
        this.#stats = stats;
        this.#base = value;
        this.#sources = [];
        this.#calculated = 0;
        this.#multiplier = 1;
        this.#baseOverride = undefined;
        this.#snapshot = undefined;
    }

    /** The name of the property. */
    get name() { return this.#name; }

    /** The base value of the property. */
    get base() { return this.#base; }

    /** The effective base value of the property adjusted for a snapshot at the time an effect was applied. */
    get baseEffective() {
        if (this.#stats.isPlayer) {
            return (this.#baseOverride ?? this.#snapshot ?? this.#base);
        }

        return this.#baseOverride ?? this.#base;
    }

    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get current() {
        return (this.baseEffective + this.#calculated) * this.#multiplier;
    }

    /** @returns {number | undefined} The snapshot of the value taken before effects were applied. */
    get snapshot() {
        return this.#snapshot;
    }

    /** @returns {number} The amount that was calculated based on the effects that are applied to the stat block. */
    get calculated() {
        return this.#calculated;
    }

    /** @returns {number} The multiplier on the base + calculated amount on the effects that are applied to the stat block. */
    get multiplier() {
        return this.#multiplier ?? 1;
    }

    /** @returns {boolean} Whether the player's character sheet is not synced with the campaign. */
    isNotSynced() {
        if (!this.#stats.isPlayer || this.#snapshot === undefined) {
            return false;
        }

        return (this.#snapshot !== this.#base);
    }

    /**
     * Updates the base value for the property.
     * @param {number} value - The new value to assign
     */
    setBaseValue(value) {
        this.#base = value;
    }

    /**
     * Recalculates the current value of the property after effects are applied.
     * @returns {number} The updated value for the property
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        
        // We leave the visited property undefined here so that it will create it for each individual effect
        const [base, calculated, multipler] = this.#recalculateGraph(version, undefined);

        this.#baseOverride = ((this.#snapshot ?? this.#base) !== base) ? base : undefined;
        this.#calculated = calculated;
        this.#multiplier = multipler;

        return this.current;
    }

    /**
     * Recalculates the current value of the property after effects are applied.
     * @param {number} version - The version of the status effects being applied.
     * @param {Set} visited - The collection of properties that have already been imported within a given effect.
     * @returns {number} The calculated value for the property
    */
    #recalculateGraph(version, visited) {
        let base = undefined;
        let multipler = undefined;
        let calculated = 0;

        this.#sources = this.#sources.filter(entry => entry.version === version || entry.fromCondition === true);
        this.#sources.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        
        for (const applied of this.#sources) {
            if (applied.setTo != null) {
                base = applied.setTo;
                multipler = undefined;
                calculated = 0;
            }

            if (applied.multiplier != null) {
                multipler = (multipler ?? 0) + Math.abs(applied.multiplier);
            }

            calculated += (applied.amount ?? 0);
            
            if (applied.imports == null || typeof applied.imports !== 'string' || visited?.has(this.#uri) === true) {
                continue;
            }

            // Are we at the entry point of the recalculation process?
            const localVisited = visited ?? new Set();
            localVisited.add(this.#uri);

            const importing = this.#stats.getNumeric(applied.imports);
            const [importBase, importAmount, importMulti] = importing.#recalculateGraph(version, localVisited);
            const imported = (importBase + importAmount) * importMulti;
            if (applied.importPenalty === true && imported > 0) {
                calculated -= imported;
            } else {
                calculated += imported;
            }
        }

        return [(base ?? this.#snapshot ?? this.#base), calculated, (multipler ?? 1)];
    }

    /** Removes the current snapshot */
    resetSnapshot() {
        this.setSnapshot(undefined, true);
    }

    /**
     * The value to assign to the snapshot for this property.
     * @param {number | undefined} value - The value to assign to the snapshot.
     * @param {boolean} canWrite - Whether the snapshot value can be written back to the stat block as a pending update
     */
    setSnapshot(value, canWrite) {
        if (!this.#stats.isPlayer) {
            return;
        }

        if (typeof value === "string") {
            value = parseInt(value);
        }

        const modified = (this.#snapshot !== value);
        this.#snapshot = value;

        if (!canWrite || !modified) {
            return;
        }

        let snapshots = this.#stats.token.options.snapshots;
        if (snapshots == null) {
            snapshots = {};
            this.#stats.token.options.snapshots = snapshots;
        }

        let properties = snapshots.numeric;
        if (properties == null) {
            properties = {};
            snapshots.numeric = properties;
        }

        if (value == null) {
            delete properties[this.#uri];
        } else {
            properties[this.#uri] = value;
        }
        
        this.#stats.hasPendingChanges(true);
    }

    /**
     * Appends an instance of a modification being applied to the stat block.
     * @param {NumericStatImpact} settings - The changes to apply to the property.
     */
    addInstance(settings) {
        let { instance, fromCondition, priority, setTo, amount, multiplier, imports, importPenalty } = settings;

        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an effect impact to numeric stat ${this.#uri} without a valid instance identifier`);
            return;
        }

        const snapshot = this.#snapshot ?? this.#base;
        this.setSnapshot(snapshot, true);

        instance = instance.toLowerCase();
        const index = this.#sources.findIndex(entry => entry.instance === instance);

        const applying = { instance, priority, setTo, amount, multiplier, imports, importPenalty };
        applying.version = this.#stats.statusEffects.version;
        applying.fromCondition = (fromCondition === true);
        Object.freeze(applying);
        
        if (index < 0) {
            this.#sources.push(applying);
        } else {
            this.#sources[index] = applying;
        }
    }

    /**
     * Removes an instance of a modification being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove a modification from numeric stat ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLowerCase();
        this.#sources = this.#sources.filter(entry => entry.instance !== instance);

        if (this.#sources.length === 0) {
            this.resetSnapshot();
        }
    }

    /** Removes all modification instances */
    clearInstances() {
        if (this.#sources.length === 0) {
            return;
        }
        
        this.#sources = [];
        this.resetSnapshot();
    }
}