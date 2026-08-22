/**
 * Manages a numberic property value that can have status effects applied to it.
 */
export default class NumericStatProperty {
    /** @type {boolean} */
    #player
    /** @type {number} */
    #base;
    /** @type {number | undefined} */
    #snapshot;
    /** @type {number} */
    #calculated;

    /**
     * @param {number} value - The initial value for the property.
     * @param {boolean} player 
     */
    constructor(value, player){
        this.#player = (player === true);
        this.#base = value;
        this.#calculated = 0;
        this.#snapshot = undefined;
    }

    /** The base value of the property. */
    get base() {
        return this.#base;
    }

    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get current() {
        if (this.#player) {
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

    /** @returns {boolean} Whether the player controlled value is not synced with the campaign. */
    isNotSynced() {
        if (!this.#player || this.#snapshot === undefined) {
            return false;
        }

        const expected = this.#snapshot + this.#calculated;
        const adjusted = this.#base - this.#calculated;
        return (expected !== adjusted);
    }

    /**
     * Updates the base value for the property and recalculates the current value.
     * @param {number} value - The new value to assign
     * @param {boolean} player - Whether the stat is for a player character sheet
     */
    setBaseValue(value, player) {
        this.#player = player;
        this.#base = value;
    }

    /**
     * Recalculates the current value of the property after effects are applied.
     * @returns {number} The updated value for the property
    */
    recalculate() {
        return this.current;
    }

    /** Snapshots the current base value for the property */
    takeSnapshot() {
        this.setSnapshot(this.#base);
    }

    /** Removes the current snapshot */
    resetSnapshot() {
        this.setSnapshot(undefined);
    }

    /**
     * The value to assign to the snapshot for this property.
     * @param {number | undefined} value - The value to assign to the snapshot.
     */
    setSnapshot(value) {
        if (typeof value === "string") {
            value = parseInt(value);
        }

        this.#snapshot = value;
    }
}