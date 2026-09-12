/**
 * @typedef {'str' | 'con' | 'dex' | 'wis' | 'int' | 'cha'} AbilityModifierType
 * 
 * @typedef {'heal' | 'temp' | 'true_heal' | 'true_temp' | 'true_damage' | 'slashing' | 'piercing' | 'bludgeoning' | 'acid' | 'cold' | 'fire' | 'force' | 
 *  'lightning' | 'necrotic' | 'poison' | 'psychic' | 'radiant' | 'thunder'} HitPointEffect
 * 
 * @typedef {number | FixedValueModifier | undefined} NumericDiceSetting
*/

/** Defines the information from a creature stat block that is needed for a dice action to be executed. */
export class DiceActionContext {
    constructor() {
        if (this.constructor === DiceActionContext) {
            throw new Error("Cannot create an instance of an dice roll features directly");
        }
    }

    /**
     * The level of the creature performing the action.
     * @returns {number}
    */
    get level() {
        throw new Error('The level getter for the derivied type based on DiceActionContext must be overridden');
    }

    /** Gets the numeric value associated with the provided URI if one exists.
     * @param {string} uri - The value to lookup within the context.
     * @returns {number}
     */
    getNumericValue(uri) {
        throw new Error('getNumericValue() for the derivied type based on DiceActionContext must be overridden');
    }

    /** The collection of available dice action modifiers
     * @returns {DiceActionModifier[]} */
    listActionModifiers() {
        throw new Error('listActionModifiers() for the derivied type based on DiceActionContext must be overridden');
    }

    /** The collection of available dice roll modifiers
     * @returns {DiceRollModifier[]} */
    listRollModifiers() {
        throw new Error('listRollModifiers() for the derivied type based on DiceActionContext must be overridden');
    }
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
    /** @type {NumericDiceSetting} The multiplier for the proficiency bonus to apply to the roll and rounded down. */
    proficiency;
    /** @type {NumericDiceSetting} The fixed bonus to apply to the base roll */
    bonus;
    /** @type {HitPointEffect | undefined} Default method used for to apply the result of damage rolls to the target's hit points; ignored for d20 tests */
    hp;
    /** @type {boolean | undefined} Defines whether advantage (true) or disadvantage (false) is active for d20 tests; otherwise undefined for neither. Will automatically cancel if both are seen for a roll. */
    advantage;
    /** @type {NumericDiceSetting} Defines the total number of additional dice to use if advantage is triggered. */
    advantageSize;
    /** @type {NumericDiceSetting} Defines the total number of additional dice to use if disadvantage is triggered. */
    disadvantageSize;
    /** @type {boolean | undefined} Whether the dice action is permitted to be execute critical rolls. */
    canCritical;
    /** @type {'standard' | 'double' | 'perfect' | undefined} The method used to calculate the effect of a critical dice action. */
    criticalStyle;
    /** @type {NumericDiceSetting} For a d20 test, if the roll is at or over this amount, it is considered a critical success. */
    criticalThreshold;
    /** @type {NumericDiceSetting} For a d20 test, if the roll is at or under this amount, it is considered a critical failure. */
    fumbleThreshold;
}

export class DiceAction extends DiceActionFeatures {
    /** @type {DiceActionContext} */
    #context;
    /** @type {string} */
    #uri;
    /** @type {string} */
    #name;
    /** @type {DiceTagSet}*/
    #tags;
    /** @type {DiceTagSet} */
    #properties;
    /** @type {boolean} */
    #d20test;
    /** @type {AbilityModifierType | undefined} */
    #ability;
    /** @type {boolean} */
    #abilityLocked;
    /** @type {DiceTagSet} */
    #resultTags;
    /** @type {DiceActionModifier[]} */
    #actionModifiers;

    /**
     * Initializes the dice action with the baseline details before addressing modifiers.
     * @param {DiceActionContext} context - The values used to determine what modifiers are applied to the dice action when executed.
     * @param {string} uri - The idetifier of the dice action being taken for quick lookups
     * @param {string} name - The friendly name of the dice action to be shown to the user.
     * @param {boolean} d20test - Whether this is a d20 test
     * @param {AbilityModifierType | undefined} ability - The ability modifier to apply to the dice roll.
     * @param {boolean} abilityLocked - Whether the ability modifier can be changed for the roll.
     */
    constructor(context, uri, name, d20test, ability, abilityLocked) {
        super();
        this.#context = context;
        this.#uri = uri;
        this.#name = name;
        this.#d20test = d20test;
        this.#ability = ability;
        this.#abilityLocked = (abilityLocked === true);
        this.#tags = new DiceTagSet();
        this.#properties = new DiceTagSet();
        this.#resultTags = new DiceTagSet();
        this.#actionModifiers = [];

        Object.seal(this);
    }

    /** The values used to determine what modifiers are applied to the dice action when executed. */
    get context() { return this.#context; }
    /** The idetifier of the dice action being taken for quick lookups */
    get uri() { return this.#uri; }
    /** The friendly name of the dice action to be shown to the user. */
    get name() { return this.#name; }
    /** The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome.  */
    get tags() { return this.#tags; }
    /** Automatically injects a d20 roll into the die collection but tracks it as the only roll eligible for advantage and imports the same tags as the baseline. */
    get d20test() { return this.#d20test; }
    /** Collection of user visible properties for the dice action. */
    get properties() { return this.#properties; }
    /** The set of tags assigned to results for any top-level fixed values such as the d20 test, proficiency bonus, and ability modifier.*/
    get resultTags() { return this.#resultTags; }
    /** The set of dice action modifiers that are specific to this action. */
    get actionModifiers() { return this.#actionModifiers; }
    /** Whether the ability modifier can be changed for the roll; defaults to true. */
    get abilityLocked() { return this.#abilityLocked; }
    /** The ability modifier to apply to the dice roll. */
    get ability() { return this.#ability; }

    tagFreeze() {
        this.#tags.freeze();
        this.#properties.freeze();
        this.#resultTags.freeze();
    }
}

/** Defines a change in to any dice roll that matches the specified tags */
export class DiceActionModifier extends DiceActionFeatures {
    #tags;
    #targetTags;

    constructor() {
        super();
        this.#tags = new DiceTagLookup();
        this.#targetTags = new DiceTagLookup();
        Object.seal(this);
    }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();
        this.#targetTags.freeze();

        for (const property of Object.values(this)) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }
    
    /** @type {number | undefined} The order that the modification will be applied to the baseline relative to other queued modifications. */
    priority;
    /** @type {DiceTagLookup} The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND */
    get tags() { return this.#tags; }
    /** @type {DiceTagLookup} The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND */
    get tagsOnTarget() { return this.#targetTags; }
    /** @type {number | undefined} The minimum character level or challenge rating required for this modifier to be active. */
    level;
    /** @type {number | undefined} The minimum spell slot required for this modifier to be active. */
    spellSlot;
    /** @type {AbilityModifierType | undefined} The ability modifier to apply to the dice roll. */
    ability;
}

/** The base feature for a dice roll */
class DiceRollFeatures {
    constructor() {
        if (this.constructor === DiceRollFeatures) {
            throw new Error("Cannot create an instance of an dice roll features directly");
        }
    }

    /** @type {NumericDiceSetting} The number of dice to include in the roll. */
    count;
    /** @type {number | undefined} The number of sides on the die to roll. */
    sides;
    /** @type {HitPointEffect | undefined} How the result of damage rolls are applied to the target's hit points. */
    hp;
    /** @type {boolean | undefined} Whether the effect of the dice roll is against the target's hit point pool */
    hitsTarget;
    /** @type {boolean | undefined} Whether the effect of the dice roll is against the source's hit point pool */
    hitsSelf;
    /** @type {NumericDiceSetting} The fixed amount to include in the roll. */
    fixed;
    /** @type {boolean | undefined} Whether the roll is subject to critical hit rules when applicable. */
    critical;
    /** @type {NumericDiceSetting} The dice roll only occurs when the value is greater than (positive) or less than (negative) the specified amount on the roll from the d20 test without modifiers. */
    d20trigger;
    /** @type {NumericDiceSetting} The dice roll will first run a d100 test and only occurs when the value is greater than (positive) or less than (negative) the specified amount. */
    chance;
    /** @type {boolean | undefined} Whether the result of the roll is considered a penalty against the final result. */
    penalty;
    /** @type {'once' | 'continuous' | undefined} Whether the roll will be replayed and added to the final result if the preceding roll was for maximum value. */
    explosive;
    /** @type {boolean | undefined} Whether the roll is automatically its maximum value; see "Beacon of Hope" */
    forceMaximum;
    /** @type {NumericDiceSetting} The number of dice roll results for non-d20 tests that are effective based on the highest or lowest; positive value for highest, negative for lowest. */
    keep;
    /** @type {NumericDiceSetting} Modifies the number of dice included in the roll for non-d20 tests; can be used with "keep" to make advantage-like rolls */
    additionalCount;
    /** @type {NumericDiceSetting} If the value of the roll is under this, it is rerolled once and the new value is taken. */
    rerollUnder;
    /** @type {boolean | undefined} Whether reroll under continues to happen until the condition is met. */
    rerollUnderUntil;
    /** @type {NumericDiceSetting} If the value of the roll is over this, it is rerolled once and the new value is taken. */
    rerollOver;
    /** @type {boolean | undefined} Whether reroll over continues to happen until the condition is met. */
    rerollOverUntil;
    /** @type {NumericDiceSetting} If the roll is under this value, it is automatically increased to the minimum. */
    minimum;
    /** @type {NumericDiceSetting} If the roll is over this value, it is automatically reduced to the maximum. */
    maximum;
}


/** Defines a dice roll that has been requested */
class DiceRoll extends DiceRollFeatures {
    /** @type {DiceActionContext} */
    #context;
    /** @type {boolean} */
    #d20test;

    /**
     * @param {DiceActionContext} context - The stat block being rolled against.
     * @param {boolean} d20test - Whether this is for a d20 test
     */
    constructor(context, d20test) {
        super();
        this.#context = context;
        this.#d20test = d20test;

        if (d20test === true) {
            this.count = 1;
            this.sides = 20;
        }

        Object.seal(this);
    }

    /** Whether this dice roll is considered a d20 test */
    get d20test() { return this.#d20test; }

    /**
     * Imports the provided dice roll features.
     * @param {DiceRollFeatures} features 
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
        this.count = this.#modifyValue(this.count, feature.count);
        this.sides = this.#swapValue(this.sides, feature.sides);
        this.hp = this.#swapValue(this.hp, feature.hp);
        this.hitsSelf = this.#swapValue(this.hitsSelf, feature.hitsSelf);
        this.hitsTarget = this.#swapValue(this.hitsTarget, feature.hitsTarget);
        this.fixed = this.#modifyValue(this.fixed, feature.fixed);
        this.critical = this.#swapValue(this.critical, feature.critical);
        this.d20trigger = this.#modifyValue(this.d20trigger, feature.d20trigger);
        this.penalty = this.#swapValue(this.penalty, feature.penalty);
        this.explosive = this.#swapValue(this.explosive, feature.explosive);
        this.forceMaximum = this.#swapValue(this.forceMaximum, feature.forceMaximum);
        this.keep = this.#modifyValue(this.keep, feature.keep);
        this.additionalCount = this.#modifyValue(this.additionalCount, feature.additionalCount);
    }

    /**
     * Imports the dice roll features that are common to all roll types.
     * @param {DiceRollFeatures} feature 
     */
    #importCommon(feature) {
        this.fixed = this.#modifyValue(this.fixed, feature.fixed)
        this.rerollOver = this.#modifyValue(this.rerollOver, feature.rerollOver);
        this.rerollOverUntil = this.#swapValue(this.rerollOverUntil, feature.rerollOverUntil);
        this.rerollUnder = this.#modifyValue(this.rerollUnder, feature.rerollUnder);
        this.rerollUnderUntil = this.#swapValue(this.rerollUnderUntil, feature.rerollUnderUntil);
        this.minimum = this.#modifyValue(this.minimum, feature.minimum);
        this.maximum = this.#modifyValue(this.maximum, feature.maximum);
    }

    // @ts-ignore
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

    // @ts-ignore
    #modifyValue(current, requested) {
        if (requested === undefined) {
            // We will preserve the current value if nothing was requested at all
            return current;
        } else if (requested === null) {
            // If the value was explicitly set to null, they are requesting to delete the roll property.
            return undefined;
        }

        if (requested instanceof FixedValueModifier) {
            return requested.getValue(this.#context, current);
        }

        return requested;
    }
}

/** Defines a dice roll associated with a dice action */
export class DiceRollConfig extends DiceRollFeatures {
    /** @type {DiceTagSet} */
    #tags;

    constructor() {
        super();
        this.#tags = new DiceTagSet();
        Object.seal(this);
    }

    /** @type {string | undefined} The friendly name for the roll when applicable. */
    name;
    /** The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome. */
    get tags() { return this.#tags; }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();

        for (const property of Object.values(this)) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }

    /**
     * Generates a dice roll based on the configuration.
     * @param {DiceActionContext} context - The stat block being rolled against. */
    begin(context) {
        const roll = new DiceRoll(context, false);
        roll.import(this);
        return roll;
    }
}

/** Defines a change in to any dice roll that matches the specified tags */
export class DiceRollModifier extends DiceRollFeatures {
    #tags;
    #targetTags;

    constructor() {
        super();
        this.#tags = new DiceTagLookup();
        this.#targetTags = new DiceTagLookup();
        Object.seal(this);
    }

    /** Freezes the current state of the object */
    freeze() {
        this.#tags.freeze();
        this.#targetTags.freeze();

        for (const property of Object.values(this)) {
            if (property instanceof FixedValueModifier) {
                Object.freeze(property);
            }
        }

        Object.freeze(this);
    }

    /** @type {number | undefined} The order that the modification will be applied to the rolls relative to other queued modifications; the final result for these properties is LIFO. */
    priority;
    /** @type {DiceTagLookup} The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND */
    get tags() { return this.#tags; }
    /** @type {DiceTagLookup} The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND */
    get tagsOnTarget() { return this.#targetTags; }
    /** @type {number | undefined} The minimum character level or challenge rating required for this modifier to be active. */
    level;
    /** @type {number | undefined} The minimum spell slot required for this modifier to be active. */
    spellSlot;
}

/** Assigns or imports a fixed value used in a dice roll from a stat block. */
export class FixedValueModifier {
    constructor() {
        Object.seal(this);
    }

    /** @type {'set' | 'add' | 'subtract' | 'multiplier' | 'multiplier_up' | undefined} The operation to use relavative to the current value. */
    operation;
    /** @type {number | undefined} The fixed amount used within the effect. */
    amount;
    /** @type {string | undefined} The URI of the numeric property to import the current value for and apply to the roll. */
    imports;
    /** @type {boolean | undefined} Whether the imported value is treated as a penalty against the roll. */
    penalty;

    /**
     * Calculates the fixed value to 
     * @param {DiceActionContext} context - The dice action context to import values from.
     * @param {number} current - The current fixed value assigned to the dice roll.
     * @returns {number}
     */
    getValue(context, current) {
        let calculated = this.amount ?? 0;

        if (typeof this.imports === 'string') {
            const imported = context.getNumericValue(this.imports) ?? 0;
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
            // RAW across the board is to round down unless explicitly stated otherwise
            calculated = Math.floor(current * calculated);
        } else if (op === 'multiplier_up') {
            calculated = Math.ceil(current * calculated);
        }

        return calculated;
    }
 }


/** Manages a set of strings that are normalized to lower case */
export class DiceTagSet extends Set {
    /** @param {string[]} [tags] */
    constructor(tags) {
        super();
        if (tags != null) {
            this.addRange(tags);
        }
    }

    /** Freezes the set */
    freeze() {
        this.add = () => this;
        this.delete = () => false;
        this.addRange = () => this;
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

/** Manages a set of collection of strings that are normalized to lower case */
export class DiceTagLookup {
    #require;
    #exclude;

    constructor() {
        this.#require = new DiceTagLookupGroup();
        this.#exclude = new DiceTagLookupGroup();
        Object.freeze(this);
    }

    /** The collection of tags that are required for the dice modifier to be permitted. */
    get require() { return this.#require; }
    /** The collection of tags that cannot be found for the dice modifier to be permitted. */
    get exclude() { return this.#exclude; }

    /** Freezes the tag set. */
    freeze() {
        this.#exclude.freeze();
        this.#exclude.freeze();
    }
}

/** Manages a set of collection of strings that are normalized to lower case */
class DiceTagLookupGroup {
    /** @type {string[][]} */
    #sets;

    constructor() {
        this.#sets = [];
    }

    /**
     * Determines whether the provided set of tags is covered by the lookups within this collection.
     * @param {DiceTagSet} tags - The collection of tags to review
     */
    covers(tags) {
        if (!(tags instanceof DiceTagSet)) {
            throw new Error('Must provide a tag set to review coverage of');
        }

        if (tags.size === 0) {
            return false;
        }

        for (const lookups of this.#sets) {
            let found = true;
            for (const tag of lookups) {
                if (!tags.has(tag)) {
                    found = false;
                    break;
                }
            }

            if (found) {
                return true;
            }
        }

        return false;
    }

    /** Freezes the set */
    freeze() {
        for (const entry of this.#sets) {
            Object.freeze(entry);
        }

        Object.freeze(this);
    }

    /** Clears the set */
    clear() {
        this.#sets = [];
    }

    /**
     * Normalizes the provided tag collection.
     * @param {(string | string[])} tags - The collection of tags that must be present on a modifier */
    #normalize(tags) {
        if (!Array.isArray(tags)) {
            tags = [tags];
        }

        for (let i = tags.length - 1; i >= 0; i--) {
            if (typeof tags[i] !== 'string') {
                throw new Error('May only provide string values to a tag lookup set.');
            }

            tags[i] = tags[i].toLowerCase().trim();
            if (tags[i] === '') {
                tags.splice(i, 1);
            }
        }

        if (tags.length === 0) {
            throw new Error('Must provide at least 1 value to a tag lookup set.');
        }

        tags.sort();
        return tags;
    }

    /**
     * Determines whether a normalized tag collection exists in the set.
     * @param {string[]} normalized - The collection of tags that must be present on a modifier */
    #findIndex(normalized) {
        for (let main = 0; main < this.#sets.length; main++) {
            const entry = this.#sets[main];
            if (entry.length !== normalized.length) {
                continue;
            }

            let found = true;
            for (let i = 0; i < entry.length; i++) {
                if (entry[i] !== normalized[i]) {
                    found = false;
                    break;
                }
            }

            if (!found) {
                continue;
            }

            return main;
        }

        return -1;
    }

    /**
     * Appends the provided tag collection to the set.
     * @param {(string | string[])} tags - The collection of tags that must be present on a modifier
     */
    add(tags) {
        const normalized = this.#normalize(tags);
        const indexOf = this.#findIndex(normalized);
        if (indexOf < 0) {
            this.#sets.push(normalized);
        }
    }

    /**
     * Removes the provided tag collection from the set.
     * @param {(string | string[])} tags - The collection of tags that must be present on a modifier
     */
    delete(tags) {
        const normalized = this.#normalize(tags);
        const indexOf = this.#findIndex(normalized);
        this.#sets.splice(indexOf, 1);
        return (indexOf >= 0);
    }

    /**
     * Appends the provided tag collections to the set.
     * @param {(string | string[])[]} sets 
     */
    addRange(sets) {
        if (!Array.isArray(sets)) {
            throw new Error('Must provide either the array of string to append to the tag set.');
        }

        for (let tag of sets) {
            this.add(tag)
        }
    }

    /**
     * Removes the provided tag collections from the set.
     * @param {(string | string[])[]} sets 
     */
    deleteRange(sets) {
        if (!Array.isArray(sets)) {
            throw new Error('Must provide either the array of string to append to the tag set.');
        }

        for (let tag of sets) {
            this.delete(tag)
        }
    }
}