/**
 * @typedef {'str' | 'con' | 'dex' | 'wis' | 'int' | 'cha'} AbilityModifierType
 * 
 * @typedef {'heal' | 'temp' | 'true_heal' | 'true_temp' | 'true_damage' | 'slashing' | 'piercing' | 'bludgeoning' | 'acid' | 'cold' | 'fire' | 'force' | 
 *  'lightning' | 'necrotic' | 'poison' | 'psychic' | 'radiant' | 'thunder'} HitPointEffect
*/

import StatBlock from "./StatBlock.mjs";

export class DiceAction extends DiceActionFeatures {
    /** @type {StatBlock} */
    #stats;
    /** @type {string} */
    #uri;
    /** @type {string} */
    #name;
    /** @type {TagSet}*/
    #tags;
    /** @type {TagSet} */
    #properties;
    /** @type {boolean} */
    #d20test;
    /** @type {AbilityModifierType} */
    #ability;
    /** @type {boolean} */
    #abilityLocked;
    /** @type {TagSet} */
    #resultTags;
    /** @type {DiceActionModifier[]} */
    #actionModifiers;

    /**
     * Initializes the dice action with the baseline details before addressing modifiers.
     * @param {StatBlock} stats - The creature stat block to execute the dice action for.
     * @param {string} uri - The idetifier of the dice action being taken for quick lookups
     * @param {string} name - The friendly name of the dice action to be shown to the user.
     * @param {boolean} d20test - Whether this is a d20 test
     * @param {AbilityModifierType} ability - The ability modifier to apply to the dice roll.
     * @param {boolean} abilityLocked - Whether the ability modifier can be changed for the roll.
     */
    constructor(stats, uri, name, d20test, ability, abilityLocked) {
        this.#stats = stats;
        this.#uri = uri;
        this.#name = name;
        this.#d20test = d20test;
        this.#ability = ability;
        this.#abilityLocked = (abilityLocked === false);
        this.#tags = new TagSet();
        this.#properties = new TagSet();
        this.#resultTags = new TagSet();
        this.#actionModifiers = [];

        Object.seal(this);
    }

    /** The creature stat block to execute the dice action for */
    get stats() { return this.#stats; }
    /** The idetifier of the dice action being taken for quick lookups */
    get uri() { return this.#uri; }
    /** The friendly name of the dice action to be shown to the user. */
    get name() { return this.#name; }
    /** The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome.  */
    get tags() { return this.#tags; }
    /** Automatically injects a d20 roll into the die collection but tracks it as the only roll eligible for advantage and imports the same tags as the baseline. */
    get d20test() { return this.#d20test; }
    /** Collection of user visible properties for the dice action. */
    get properties() { this.#properties; }
    /** The set of tags assigned to any top-level fixed values such as proficiency bonus and ability modifier.*/
    get resultTags() { return this.#resultTags; }
    /** The set of dice action modifiers that are specific to this action. */
    get actionModifiers() { return this.#actionModifiers; }
    /** Whether the ability modifier can be changed for the roll; defaults to true. */
    get abilityLocked() { return this.#abilityLocked; }
    /** The ability modifier to apply to the dice roll. */
    get ability() { return this.#ability; }
    set ability(value) {
        if (this.#abilityLocked === false) {
            this.#ability = value;
        }
    }
}

/** Defines a change in to any dice roll that matches the specified tags */
export class DiceActionModifier extends DiceActionFeatures {
    /** @type {TagSet} */
    #tags;

    constructor() {
        super();
        this.#tags = new TagSet();
        Object.seal(this);
    }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();

        for (const property of this) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }
    
    /** @type {(string | string[])[]} The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND */
    get tags() { return this.#tags; }
    /** @type {number} The order that the modification will be applied to the baseline relative to other queued modifications. */
    priority;
    /** @type {AbilityModifierType} The ability modifier to apply to the dice roll. */
    ability;
}

/** The base features for a dice action */
class DiceActionFeatures {
    /** @type {DiceRollConfig[]} */
    #die;
    /** @type {DiceRollModifier[]} */
    #rollModifiers;

    constructor() {
        if (this.constructor === DiceActionFeatures) {
            throw new Error("Cannot create an instance of an dice action features directly");
        }

        this.#die = [];
        this.#rollModifiers = [];
    }

    /** The baseline set of dice rolls to include; such as weapon damage die. */
    get die() { return this.#die; }
    /** The set of dice roll modifiers that are specific to this action. */
    get rollModifiers() { return this.#rollModifiers; }
    /** @type {HitPointEffect} Default method used for to apply the result of damage rolls to the target's hit points; ignored for d20 tests */
    hp;
    /** @type {number | FixedValueModifier} The multiplier for the proficiency bonus to apply to the roll and rounded down. */
    proficiency;
    /** @type {number | FixedValueModifier} The fixed bonus to apply to the base roll */
    bonus;
    /** @type {boolean?} Defines whether advantage (true) or disadvantage (false) is active for d20 tests; otherwise undefined for neither. Will automatically cancel if both are seen for a roll. */
    advantage;
    /** @type {number | FixedValueModifier} Defines the total number of additional dice to use if advantage is triggered. */
    advantageSize;
    /** @type {number | FixedValueModifier} Defines the total number of additional dice to use if disadvantage is triggered. */
    disadvantageSize;
    /** @type {boolean} Whether the dice action is permitted to be execute critical rolls. */
    canCritical;
    /** @type {'standard' | 'double' | 'perfect'} The method used to calculate the effect of a critical dice action. */
    criticalStyle;
    /** @type {number | FixedValueModifier} For a d20 test, if the roll is at or over this amount, it is considered a critical success. */
    criticalThreshold;
    /** @type {number | FixedValueModifier} For a d20 test, if the roll is at or under this amount, it is considered a critical failure. */
    fumbleThreshold;
}

/** Defines a dice roll that has been requested */
class DiceRoll extends DiceRollFeatures {
    /** @type {StatBlock} */
    #stats;
    /** @type {boolean} */
    #d20test;

    /**
     * @param {StatBlock} stats - The stat block being rolled against.
     * @param {boolean} d20test - Whether this is for a d20 test
     */
    constructor(stats, d20test) {
        super();
        this.#stats = stats;
        this.#d20test = d20test;

        if (d20test === true) {
            super.count = 1;
            super.sides = 20;
        }

        Object.seal(this);
    }

    /** Whether this dice roll is considered a d20 test */
    get d20test() { return this.#d20test; }

    /**
     * Imports the provided dice roll features.
     * @param {DiceRollFeatures} feature 
     */
    import(features) {
        if (features == null) {
            return;
        }

        this.#importCommon(features);

        if (this.#d20test !== true) {
            this.#importStandard(features);
        }
    }

    /**
     * Imports the dice roll features that are exclusive to non-d20 tests.
     * @param {DiceRollFeatures} feature 
     */
    #importStandard(feature) {
        super.count = this.#modifyValue(super.count, feature.count);
        super.sides = this.#swapValue(super.sides, feature.sides);
        super.hp = this.#swapValue(super.hp, feature.hp);
        super.fixed = this.#modifyValue(super.fixed, feature.fixed);
        super.critical = this.#swapValue(super.critical, feature.critical);
        super.d20trigger = this.#modifyValue(super.d20trigger, feature.d20trigger);
        super.penalty = this.#swapValue(super.penalty, feature.penalty);
        super.explosive = this.#swapValue(super.explosive, feature.explosive);
        super.forceMaximum = this.#swapValue(super.forceMaximum, feature.forceMaximum);
        super.keep = this.#modifyValue(super.keep, feature.keep);
        super.additionalCount = this.#modifyValue(super.additionalCount, feature.additionalCount);
    }

    /**
     * Imports the dice roll features that are common to all roll types.
     * @param {DiceRollFeatures} feature 
     */
    #importCommon(feature) {
        super.fixed = this.#modifyValue(super.fixed, feature.fixed)
        super.rerollOver = this.#modifyValue(super.rerollOver, feature.rerollOver);
        super.rerollOverUntil = this.#swapValue(super.rerollOverUntil, feature.rerollOverUntil);
        super.rerollUnder = this.#modifyValue(super.rerollUnder, feature.rerollUnder);
        super.rerollUnderUntil = this.#swapValue(super.rerollUnderUntil, feature.rerollUnderUntil);
        super.minimum = this.#modifyValue(super.minimum, feature.minimum);
        super.maximum = this.#modifyValue(super.maximum, feature.maximum);
    }

    #swapValue(current, requested) {
        if (requested === undefined) {
            // We will preserve the current value if nothing was requested at all
            return current;
        } else if (requested === null) {
            // If the value was explicitly set to null, they are requesting to delete the roll property.
            return undefined;
        }

        return requested;
    }

    #modifyValue(current, requested) {
        if (requested === undefined) {
            // We will preserve the current value if nothing was requested at all
            return current;
        } else if (requested === null) {
            // If the value was explicitly set to null, they are requesting to delete the roll property.
            return undefined;
        }

        if (requested instanceof FixedValueModifier) {
            return requested.getValue(this.#stats, current);
        }

        return requested;
    }
}

/** Defines a dice roll associated with a dice action */
export class DiceRollConfig extends DiceRollFeatures {
    /** @type {TagSet} */
    #tags;

    constructor() {
        super();
        this.#tags = new TagSet();
        Object.seal(this);
    }

    /** @type {string} The friendly name for the roll when applicable. */
    name;
    /** The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome. */
    get tags() { return this.#tags; }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();

        for (const property of this) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }

    /**
     * Generates a dice roll based on the configuration.
     * @param {StatBlock} stats - The stat block being rolled against. */
    begin(stats) {
        const roll = new DiceRoll(stats, false);
        roll.import(this);
        return roll;
    }
}

/** Defines a change in to any dice roll that matches the specified tags */
export class DiceRollModifier extends DiceRollFeatures {
    /** @type {TagSet} */
    #tags;

    constructor() {
        super();
        this.#tags = new TagSet();
        Object.seal(this);
    }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();

        for (const property of this) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }

    /** @type {(string | string[])[]} The set of tags used to discover what queued dice rolls this rule applies to; top level entries are OR, collections within the main array are AND */
    get tags() { return this.#tags; }
    /** @type {number} The order that the modification will be applied to the rolls relative to other queued modifications; the final result for these properties is LIFO. */
    priority;
}

/** The base feature for a dice roll */
class DiceRollFeatures {
    constructor() {
        if (this.constructor === DiceRollFeatures) {
            throw new Error("Cannot create an instance of an dice roll features directly");
        }
    }

    /** @type {number | FixedValueModifier} The number of dice to include in the roll. */
    count;
    /** @type {number} The number of sides on the die to roll. */
    sides;
    /** @type {HitPointEffect} How the result of damage rolls are applied to the target's hit points. */
    hp;
    /** @type {number | FixedValueModifier} The fixed amount to include in the roll. */
    fixed;
    /** @type {boolean} Whether the roll is subject to critical hit rules when applicable. */
    critical;
    /** @type {number | FixedValueModifier} The dice roll only occurs when the value is greater than (positive) or less than (negative) the specified amount on the roll from the d20 test without modifiers. */
    d20trigger;
    /** @type {number | FixedValueModifier} The dice roll will first run a d100 test and only occurs when the value is greater than (positive) or less than (negative) the specified amount. */
    chance;
    /** @type {boolean} Whether the result of the roll is considered a penalty against the final result. */
    penalty;
    /** @type {'once' | 'continuous'} Whether the roll will be replayed and added to the final result if the preceding roll was for maximum value. */
    explosive;
    /** @type {boolean} Whether the roll is automatically its maximum value; see "Beacon of Hope" */
    forceMaximum;
    /** @type {number | FixedValueModifier} The number of dice roll results for non-d20 tests that are effective based on the highest or lowest; positive value for highest, negative for lowest. */
    keep;
    /** @type {number | FixedValueModifier} Modifies the number of dice included in the roll for non-d20 tests; can be used with "keep" to make advantage-like rolls */
    additionalCount;
    /** @type {number | FixedValueModifier} If the value of the roll is under this, it is rerolled once and the new value is taken. */
    rerollUnder;
    /** @type {boolean} Whether reroll under continues to happen until the condition is met. */
    rerollUnderUntil;
    /** @type {number | FixedValueModifier} If the value of the roll is over this, it is rerolled once and the new value is taken. */
    rerollOver;
    /** @type {boolean} Whether reroll over continues to happen until the condition is met. */
    rerollOverUntil;
    /** @type {number | FixedValueModifier} If the roll is under this value, it is automatically increased to the minimum. */
    minimum;
    /** @type {number | FixedValueModifier} If the roll is over this value, it is automatically reduced to the maximum. */
    maximum;
}

/** Assigns or imports a fixed value used in a dice roll from a stat block. */
export class FixedValueModifier {
    constructor() {
        Object.seal(this);
    }

    /** @type {'set' | 'add' | 'subtract' | 'multiplier'} The operation to use relavative to the current value. */
    operation;
    /** @type {number} The fixed amount used within the effect. */
    amount;
    /** @type {string} The URI of the numeric property to import the current value for and apply to the roll. */
    imports;
    /** @type {boolean} Whether the imported value is treated as a penalty against the roll. */
    penalty;

    /**
     * Calculates the fixed value to 
     * @param {StatBlock} stats - The stat block to import values from.
     * @param {number} current - The current fixed value assigned to the dice roll.
     * @returns {number}
     */
    getValue(stats, current) {
        let calculated = this.amount ?? 0;

        if (typeof this.imports === 'string') {
            const imported = stats.getNumeric(this.imports)?.current ?? 0;
            if (this.penalty === true && imported > 0) {
                calculated -= imported;
            } else {
                calculated += imported;
            }
        }

        const op = (this.operation ?? '').toLowerCase();
        if (op === 'add') {
            calculated = current + calculated;
        } else if (op === 'subtract') {
            calculated = current - calculated;
        } else if (op === 'multiplier') {
            calculated = current * calculated;
        }

        return calculated;
    }
 }


/** Manages a set that normalizes all values to lower case */
export class TagSet extends Set {
    constructor(tags) {
        super();
        this.append(tags);
    }

    /** Freezes the set */
    freeze() {
        this.add = () => undefined;
        this.delete = () => undefined;
        this.addRange = () => undefined;
        this.deleteRange = () => undefined;
        this.clear = () => undefined;

        Object.freeze(this);
    }

    /**
     * Normalizes the provided tag into the set.
     * @param {string} tag
     */
    add(tag) {
        if (typeof tag !== 'string') {
            throw new Error('May only provide string values to a tag set.');
        }

        tag = tag.trim().toLowerCase();
        if (tag !== '') {
            super.add(tag);
        }

        return this;
    }

    /**
     * Normalizes the provided tag and removes it from the set.
     * @param {string} tag
     */
    delete(tag) {
        if (typeof tag !== 'string') {
            throw new Error('May only provide string values to a tag set.');
        }

        tag = tag.trim().toLowerCase();
        if (tag !== '') {
            return super.delete(tag);
        }

        return false;
    }

    /**
     * Normalizes the provided tags into the set.
     * @param {string[]} tags 
     */
    addRange(tags) {
        if (typeof tags === 'string') {
            this.add(tags);
        }

        if (!Array.isArray(tags)) {
            throw new Error('Must provide either the array of string to append to the tag set.');
        }

        for (let tag of tags) {
            this.add(tag)
        }

        return this;
    }

    /**
     * Normalizes the provided tags and removes them from the set.
     * @param {string[]} tags 
     */
    deleteRange(tags) {
        if (typeof tags === 'string') {
            this.delete(tags);
        }

        if (!Array.isArray(tags)) {
            throw new Error('Must provide either the array of string to append to the tag set.');
        }

        for (let tag of tags) {
            this.delete(tag)
        }
    }
}