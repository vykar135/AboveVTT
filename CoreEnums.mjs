/**
 * @typedef {Object} EnumWithName
 * @property {string} uri - The system identifier for the enumeration value
 * @property {string} name - The friendly name of the enumeration value
 */

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const DamageType = Object.freeze({
    Slashing: Object.freeze({ uri: 'slashing', name: 'Slashing' }),
    Piercing: Object.freeze({ uri: 'piercing', name: 'Piercing' }),
    Bludgeoning: Object.freeze({ uri: 'bludgeoning', name: 'Bludgeoning' }),
    Acid: Object.freeze({ uri: 'acid', name: 'Acid' }),
    Cold: Object.freeze({ uri: 'cold', name: 'Cold' }),
    Fire: Object.freeze({ uri: 'fire', name: 'Fire' }),
    Force: Object.freeze({ uri: 'force', name: 'Force' }),
    Lightning: Object.freeze({ uri: 'lightning', name: 'Lightning' }),
    Necrotic: Object.freeze({ uri: 'necrotic', name: 'Necrotic' }),
    Poison: Object.freeze({ uri: 'poison', name: 'Poison' }),
    Psychic: Object.freeze({ uri: 'psychic', name: 'Psychic' }),
    Radiant: Object.freeze({ uri: 'radiant', name: 'Radiant' }),
    Thunder: Object.freeze({ uri: 'thunder', name: 'Thunder' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const DiceType = Object.freeze({
    d4: Object.freeze({ uri: 'd4', name: 'd4' }),
    d6: Object.freeze({ uri: 'd6', name: 'd6' }),
    d8: Object.freeze({ uri: 'd8', name: 'd8' }),
    d10: Object.freeze({ uri: 'd10', name: 'd10' }),
    d12: Object.freeze({ uri: 'd12', name: 'd12' }),
    d20: Object.freeze({ uri: 'd20', name: 'd20' }),
    d100: Object.freeze({ uri: 'd100', name: 'd100' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const AbilityCheck = Object.freeze({
    STR: Object.freeze({ uri: 'str', name: 'Strength' }),
    DEX: Object.freeze({ uri: 'dex', name: 'Dexterity' }),
    CON: Object.freeze({ uri: 'con', name: 'Constitution' }),
    INT: Object.freeze({ uri: 'int', name: 'Intelligence' }),
    WIS: Object.freeze({ uri: 'wis', name: 'Wisdom' }),
    CHA: Object.freeze({ uri: 'cha', name: 'Charisma' }),
    Proficiency: Object.freeze({ uri: 'pb', name: 'Proficiency Bonus' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const SavingThrow = Object.freeze({
    STR: Object.freeze({ uri: 'save:str', name: 'Strength Saving Throw' }),
    DEX: Object.freeze({ uri: 'save:dex', name: 'Dexterity Saving Throw' }),
    CON: Object.freeze({ uri: 'save:con', name: 'Constitution Saving Throw' }),
    INT: Object.freeze({ uri: 'save:int', name: 'Intelligence Saving Throw' }),
    WIS: Object.freeze({ uri: 'save:wis', name: 'Wisdom Saving Throw' }),
    CHA: Object.freeze({ uri: 'save:cha', name: 'Charisma Saving Throw' }),
    Death: Object.freeze({ uri: 'save:death', name: 'Death Saving Throw' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const SkillCheck = Object.freeze({
    Acrobatics: Object.freeze({ uri: 'skill:acrobatics', name: '' }),
    AnimalHandling: Object.freeze({ uri: 'skill:animal_handling', name: '' }),
    Arcana: Object.freeze({ uri: 'skill:arcana', name: '' }),
    Athletics: Object.freeze({ uri: 'skill:athletics', name: '' }),
    Deception: Object.freeze({ uri: 'skill:deception', name: '' }),
    History: Object.freeze({ uri: 'skill:history', name: '' }),
    Insight: Object.freeze({ uri: 'skill:insight', name: '' }),
    Intimidation: Object.freeze({ uri: 'skill:intimidation', name: '' }),
    Investigation: Object.freeze({ uri: 'skill:investigation', name: '' }),
    Medicine: Object.freeze({ uri: 'skill:medicine', name: '' }),
    Nature: Object.freeze({ uri: 'skill:nature', name: '' }),
    Perception: Object.freeze({ uri: 'skill:perception', name: '' }),
    Performance: Object.freeze({ uri: 'skill:performance', name: '' }),
    Persuasion: Object.freeze({ uri: 'skill:persuasion', name: '' }),
    Religion: Object.freeze({ uri: 'skill:religion', name: '' }),
    SleightOfHand: Object.freeze({ uri: 'skill:sleight_of_hand', name: '' }),
    Stealth: Object.freeze({ uri: 'skill:stealth', name: '' }),
    Survival: Object.freeze({ uri: 'skill:survival', name: '' })
});