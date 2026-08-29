import StatBlock from "./StatBlock.mjs";

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
    /** @type {{ [instance: string]: { amount: number, version: number }} */
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

    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get current() {
        if (this.#stats.isPlayer) {
            return (this.#snapshot ?? this.#base) + this.#calculated;
        }

        return this.#base + this.#calculated;
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
        let calculated = 0;
        const version = this.#stats.statusEffects.version;

        for (const [key, applied] of Object.entries(this.#sources)) {
            if (applied.version === version) {
                calculated += applied.amount;
            } else {
                delete this.#sources[key];
            }
        }

        this.#calculated = calculated;
        return this.current;
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
     * @param {number} value - The value assigned to the instance of modification effect.
     */
    addInstance(instance, value) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of numeric stat ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLocaleLowerCase();
        this.#sources[instance] = { amount: value, version: this.#stats.statusEffects.version };
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