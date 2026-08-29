import StatBlock from "./StatBlock.mjs";

/**
 * @typedef {Object} NumericStatImpact
 * @property {number} version - The version of the status effect collect at the time the impact was applied.
 * @property {number} amount - The fixed amount to change the property by
 * @property {string} imports - The URI of the numeric property to import the current value for and apply to the requesting property.
 * @property {boolean} importPenalty - Whether the imported value is treated as a penalty against the requesting property.
 */

/**
 * Manages a numberic property value that can have status effects applied to it.
 */
export default class NumericStatTracker {
    /** @type {StatBlock} */
    #stats
    /** @type {string} */
    #uri;
    /** @type {number} */
    #base;
    /** @type {number | undefined} */
    #snapshot;
    /** @type {{ [instance: string]: NumericStatImpact }} */
    #sources;
    /** @type {number} */
    #calculated;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the property.
     * @param {number} value - The initial value for the property.
     */
    constructor(stats, uri, value){
        this.#uri = uri;
        this.#stats = stats;
        this.#base = value;
        this.#sources = {};
        this.#calculated = 0;
        this.#snapshot = undefined;
    }

    /** The base value of the property. */
    get base() {
        return this.#base;
    }

    /** The effective base value of the property adjusted for a snapshot at the time an effect was applied. */
    get baseEffective() {
        if (this.#stats.isPlayer) {
            return (this.#snapshot ?? this.#base);
        }

        return this.#base;
    }

    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get current() {
        return this.baseEffective + this.#calculated;
    }

    /** The reported value of the property based on the token's current state. */
    get reported() {
        return this.#base + this.#calculated;
    }

    /** @returns {number | undefined} The snapshot of the value taken before effects were applied. */
    get snapshot() {
        return this.#snapshot;
    }

    /** @returns {number} The amount that was calculated based on the effects that are applied to the stat block. */
    get calculated() {
        return this.#calculated;
    }

    /** @returns {boolean} Whether the player's character sheet is not synced with the campaign. */
    isNotSynced() {
        if (!this.#stats.isPlayer || this.#snapshot === undefined) {
            return false;
        }

        const expected = this.#snapshot + this.#calculated;
        const adjusted = this.#base - this.#calculated;
        return (expected !== adjusted);
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
        this.#calculated = this.#recalculateGraph(version, undefined);
        return this.current;
    }

    /**
     * Recalculates the current value of the property after effects are applied.
     * @param {number} version - The version of the status effects being applied.
     * @param {Set} visited - The collection of properties that have already been imported within a given effect.
     * @returns {number} The calculated value for the property
    */
    #recalculateGraph(version, visited) {
        let calculated = 0;

        for (const [key, applied] of Object.entries(this.#sources)) {
            if (applied.version !== version) {
                delete this.#sources[key];
                continue;
            }

            calculated += (applied.amount ?? 0);

            if (applied.imports == null || typeof applied.imports !== 'string' || visited?.has(this.#uri) === true) {
                continue;
            }

            // Are we at the entry point of the recalculation process?
            if (visited == null) {
                visited = new Set();
            }

            visited.add(this.#uri);

            const importing = this.#stats.getNumeric(applied.imports);
            const imported = importing.baseEffective + importing.#recalculateGraph(version, visited);
            if (applied.importPenalty === true && imported > 0) {
                calculated -= imported;
            } else {
                calculated += imported;
            }
        }

        return calculated;
    }

    /** Snapshots the current base value for the property */
    takeSnapshot() {
        this.setSnapshot(this.#base, true);
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
        if (typeof value === "string") {
            value = parseInt(value);
        }

        const modified = (this.#snapshot !== value);
        this.#snapshot = value;

        if (!canWrite || !modified || !this.stats.isPlayer) {
            return;
        }

        const snapshots = this.#stats.token.options.snapshots;
        if (snapshots == null) {
            snapshots = {};
            this.#stats.token.options.snapshots = snapshots;
        }

        const properties = snapshots.numeric;
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
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     * @param {NumericStatImpact} impact - The changes to apply to the property.
     */
    addInstance(instance, impact) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an effect impact to numeric stat ${this.#uri} without a valid instance identifier`);
            return;
        }

        if (typeof impact !== 'object') {
            console.warn(`Attempting to append an effect impact to numeric stat ${this.#uri} without a valid configuration`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        impact.version = this.#stats.statusEffects.version;
        this.#sources[instance] = impact;
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

        instance = instance.toLocaleLowerCase();
        delete this.#sources[instance];
    }

    /**
     * Removes all modification instances
     */
    clearInstances() {
        this.#sources = {};
    }
}