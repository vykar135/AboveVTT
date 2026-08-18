/**
 * @readonly
 * @enum {string}
 */
export const EffectImpact = Object.freeze({
    Damage: 'damage',
    Heal: 'heal',
    Modifier: 'modifier'
});

/**
 * @readonly
 * @enum {string}
 */
export const DamageType = Object.freeze({
    Slashing: 'slashing',
    Piercing: 'piercing',
    Bludgeoning: 'bludgeoning',
    Acid: 'acid',
    Cold: 'cold',
    Fire: 'fire',
    Force: 'force',
    Lightning: 'lightning',
    Necrotic: 'necrotic',
    Poison: 'poison',
    Psychic: 'psychic',
    Radiant: 'radiant',
    Thunder: 'thunder'
});

/**
 * @readonly
 * @enum {string}
 */
export const DiceType = Object.freeze({
    d4: 'd4',
    d6: 'd6',
    d8: 'd8',
    d10: 'd10',
    d12: 'd12',
    d20: 'd20',
    d100: 'd100'
});

/**
 * @readonly
 * @enum {string}
 */
export const AbilityScore = Object.freeze({
    STR: 'str',
    DEX: 'dex',
    CON: 'con',
    INT: 'int',
    WIS: 'wis',
    CHA: 'cha',
    Proficiency: 'pb'
});

/**
 * @readonly
 * @enum {string}
 */
export const SavingThrow = Object.freeze({
    STR: 'save:str',
    DEX: 'save:dex',
    CON: 'save:con',
    INT: 'save:int',
    WIS: 'save:wis',
    CHA: 'save:cha'
});

/**
 * @readonly
 * @enum {string}
 */
export const SkillCheck = Object.freeze({
    Acrobatics: 'skill:acrobatics',
    AnimalHandling: 'skill:animal_handling',
    Arcana: 'skill:arcana',
    Athletics: 'skill:athletics',
    Deception: 'skill:deception',
    History: 'skill:history',
    Insight: 'skill:insight',
    Intimidation: 'skill:intimidation',
    Investigation: 'skill:investigation',
    Medicine: 'skill:medicine',
    Nature: 'skill:nature',
    Perception: 'skill:perception',
    Performance: 'skill:performance',
    Persuasion: 'skill:persuasion',
    Religion: 'skill:religion',
    SleightOfHand: 'skill:sleight_of_hand',
    Stealth: 'skill:stealth',
    Survival: 'skill:survival'
});