/**
 * @typedef PropertyConfiguration
 * @property {string} uri - The value that is intended to be persisted within token options
 * @property {string} name - The value that is intended to be displayed to users
 * @property {string} short - An abbreviated value that is intended to be displayed to users
 * @property {string[]} diceTags - The tags found on a dice roll that make it qualify for the property
 * @property {string} ability - The default ability score that is used for a property
 * @property {(amount: number) => number} apply - Method used to apply the effect of the configuration onto a given amount
 * @property {number} d20test - The number of additional dice that the configuration either awards or removes from a d20 test
 * @property {number} dndBeyond - The numerical value that D&D Beyond uses to reference this property
 */

/**
 * @typedef PropertyTypeEnum
 * @property {string} uri - The value that is intended to be persisted within token options
 * @property {string} name - The value that is intended to be displayed to users
 */

/**
 * @typedef RollTypeEnum
 * @property {string} uri - The value that is intended to be persisted within token options
 * @property {string} name - The value that is intended to be displayed to users
 * @property {boolean} proficiency - Whether a roll can be subject to the effects of proficiency
 * @property {boolean} advantage - Whether a roll can be subject to the effects of advantage and disadvantage
 * @property {boolean} critical - Whether a roll can be subject to the effects of critical damage
 */

/**
 * @typedef DieSizeEnum
 * @property {string} uri - The value that is intended to be persisted within token options
 * @property {string} name - The value that is intended to be displayed to users
 * @property {number} dieSize - The numerical value for the size of the die
 */

/**
 * @typedef ProficiencyTypeEnum
 * @property {string} uri - The value that is intended to be persisted within token options.
 * @property {string} name - The value that is intended to be displayed to users.
 * @property {(amt: number) => number} apply - Method used to modify a value based on the proficiency type.
 * @property {number} d20test - The number of dice added or removed from a d20 test.
 */


/**
 * Defines the type of behavior that a property on a token utilizies
 * @readonly
 * @enum {PropertyTypeEnum}
 */
export const PropertyType = Object.freeze({
    Number: Object.freeze({ uri: 'prop:number', name: 'Number' }),
    Toggle: Object.freeze({ uri: 'prop:toggle', name: 'Toggle' }),
    Charges: Object.freeze({ uri: 'prop:charges', name: 'Charges' }),
    Roll: Object.freeze({ uri: 'prop:roll', name: 'Dice Roll' }),
    Proficiency: Object.freeze({ uri: 'prop:proficiency', name: 'Proficiency' }),
    Advantage: Object.freeze({ uri: 'prop:advantage', name: 'Advantage' }),
    Resistance: Object.freeze({ uri: 'prop:resistance', name: 'Resistance' }),
    AbilityModifier: Object.freeze({ uri: 'prop:ability:modifier', name: 'Ability Modifier' }),
    DieSize: Object.freeze({ uri: 'prop:die:size', name: 'Die Size' })
});

/**
 * Defines the type of behavior for a given style of dice roll
 * @readonly
 * @enum {RollTypeEnum}
 */
export const RollType = Object.freeze({
    Unspecified: Object.freeze({ uri: 'roll:basic', name: 'Roll', proficiency: true, critical: true, advantage: true }),
    AbilityCheck: Object.freeze({ uri: 'roll:check', name: 'Ability Check', proficiency: true, critical: false, advantage: true }),
    SkillCheck: Object.freeze({ uri: 'roll:skill', name: 'Skill Check', proficiency: true, critical: false, advantage: true }),
    SavingThrow: Object.freeze({ uri: 'roll:save', name: 'Saving Throw', proficiency: true, critical: false, advantage: true }),
    ToHit: Object.freeze({ uri: 'roll:tohit', name: 'To Hit', proficiency: true, critical: false, advantage: true }),
    Damage: Object.freeze({ uri: 'roll:damage', name: 'Damage', proficiency: true, critical: true, advantage: false }),
    Heal: Object.freeze({ uri: 'roll:heal', name: 'Heal', proficiency: true, critical: true, advantage: false })
});

/**
 * Defines the type of dice rolls that are available
 * @readonly
 * @enum {DieSizeEnum}
 */
export const DiceType = Object.freeze({
    d4: Object.freeze({ uri: 'd4', name: 'd4', dieSize: 4 }),
    d6: Object.freeze({ uri: 'd6', name: 'd6', dieSize: 6 }),
    d8: Object.freeze({ uri: 'd8', name: 'd8', dieSize: 8 }),
    d10: Object.freeze({ uri: 'd10', name: 'd10', dieSize: 10 }),
    d12: Object.freeze({ uri: 'd12', name: 'd12', dieSize: 12 }),
    d20: Object.freeze({ uri: 'd20', name: 'd20', dieSize: 20 }),
    d100: Object.freeze({ uri: 'd100', name: 'd100', dieSize: 100 })
});

/**
 * Defines the types of proficiency that can be granted to a property of a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const ProficiencyType = Object.freeze({
    None: Object.freeze({ uri: 'proficiency:none', name: 'None', apply: () => 0 }),

    // Buffs
    Standard: Object.freeze({ uri: 'proficient', name: 'Proficient', apply: (pb) => pb }),
    Expert: Object.freeze({ uri: 'expert', name: 'Expert', apply: (pb) => (pb > 0 ? (pb * 2) : pb) }),
    HalfDown: Object.freeze({ uri: 'half', name: 'Half-Proficient (Rounded Down)', apply: (pb) => (pb > 0 ? Math.floor(pb / 2) : pb) }), // This is RAW
    HalfUp: Object.freeze({ uri: 'half-up', name: 'Half-Proficient (Rounded Up)', apply: (pb) => (pb > 0 ? Math.ceil(pb / 2) : pb) }),

    // Debuffs
    Flaw: Object.freeze({ uri: 'flaw', name: 'Flawed', apply: (pb) => pb > 0 ? -pb : pb }),
    HeavyFlaw: Object.freeze({ uri: 'flaw:heavy', name: 'Heavily Flawed', apply: (pb) => (pb > 0 ? -(pb * 2) : pb) }),
    MinorFlaw: Object.freeze({ uri: 'flaw:minor', name: 'Minorly Flawed', apply: (pb) => (pb > 0 ? -Math.ceil(pb / 2) : pb) })
});

/**
 * Defines the types of resistance that can be granted to a property of a token
 * The way resistance can be applied is dependent on effect; this means we can use resistance to 
 * apply advantage and disadvantage to saving throws against conditions
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const ResistanceType = Object.freeze({
    None: Object.freeze({ uri: 'resist:none', name: 'None', apply: (amt) => amt, d20test: 0 }),
    Resistance: Object.freeze({ uri: 'resist', name: 'Resistance', apply: (amt) => (amt !== 0 ? Math.floor(amt / 2) : amt), d20test: 1 }),
    Immunity: Object.freeze({ uri: 'immune', name: 'Immunity', apply: () => 0, d20test: Number.MAX_VALUE }),
    Vulnerability: Object.freeze({ uri: 'vulnerable', name: 'Vulnerability', apply: (amt) => (amt * 2), d20test: -1 })
});

/**
 * Defines whether a property containing a roll has advantage or disadvantage. To support advantage stacking use the following:
 * 1. Track sources of advantage and disadvantage seperately
 * 2. Limit the total number of each source count based on the value of AbilityConstraints.AdvantageLimit
 * 3. (Advantage Sources - Disadvantage Sources) as basis for keep high / low impact
 * Since the default advantage limit is 1, this would enact RAW by default
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const AdvantageType = Object.freeze({
    None: Object.freeze({ uri: 'advantage:none', name: 'None', d20test: 0 }),
    Advantage: Object.freeze({ uri: 'advantage', name: 'Advantage', d20test: 1 }),
    Disadvantage: Object.freeze({ uri: 'disadvantage', name: 'Disadvantage', d20test: -1 })
});

/**
 * Defines the types of damage that can be dealt to a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const DamageType = Object.freeze({
    Magic: Object.freeze({ uri: 'dmg:magic', name: 'Magic Damage' }),
    Physical: Object.freeze({ uri: 'dmg:physical', name: 'Physical Damage' }),

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
 * Defines how resistance can be applied to damage types
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const DamageResistance = Object.freeze({
    Magic: Object.freeze({ uri: 'resistance:dmg:magic', name: 'Magic Damage Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Magic.uri ]) }),
    Physical: Object.freeze({ uri: 'resistance:dmg:physical', name: 'Physical Damage Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Physical.uri ]) }),

    Slashing: Object.freeze({ uri: 'resistance:slashing', name: 'Slashing Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Slashing.uri ]) }),
    Piercing: Object.freeze({ uri: 'resistance:piercing', name: 'Piercing Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Piercing.uri ]) }),
    Bludgeoning: Object.freeze({ uri: 'resistance:bludgeoning', name: 'Bludgeoning Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Bludgeoning.uri ]) }),
    Acid: Object.freeze({ uri: 'resistance:acid', name: 'Acid Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Acid.uri ]) }),
    Cold: Object.freeze({ uri: 'resistance:cold', name: 'Cold Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Cold.uri ]) }),
    Fire: Object.freeze({ uri: 'resistance:fire', name: 'Fire Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Fire.uri ]) }),
    Force: Object.freeze({ uri: 'resistance:force', name: 'Force Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Force.uri ]) }),
    Lightning: Object.freeze({ uri: 'resistance:lightning', name: 'Lightning Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Lightning.uri ]) }),
    Necrotic: Object.freeze({ uri: 'resistance:necrotic', name: 'Necrotic Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Necrotic.uri ]) }),
    Poison: Object.freeze({ uri: 'resistance:poison', name: 'Poison Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Poison.uri ]) }),
    Psychic: Object.freeze({ uri: 'resistance:psychic', name: 'Psychic Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Psychic.uri ]) }),
    Radiant: Object.freeze({ uri: 'resistance:radiant', name: 'Radiant Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Radiant.uri ]) }),
    Thunder: Object.freeze({ uri: 'resistance:thunder', name: 'Thunder Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ DamageType.Thunder.uri ]) })
});

/**
 * The types of conditions and whether they cause the token to be incapacitated 
 * for the purposes of maintained effect removal
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const ConditionType = Object.freeze({
    Blinded: Object.freeze({ uri: 'blinded', name: 'Blinded', type: PropertyType.Toggle }),
    Charmed: Object.freeze({ uri: 'charmed', name: 'Charmed', type: PropertyType.Toggle }),
    Deafened: Object.freeze({ uri: 'deafened', name: 'Deafened', type: PropertyType.Toggle }),
    Frightened: Object.freeze({ uri: 'frightened', name: 'Frightened', type: PropertyType.Toggle }),
    Grappled: Object.freeze({ uri: 'grappled', name: 'Grappled', type: PropertyType.Toggle }),
    Incapacitated: Object.freeze({ uri: 'incapacitated', name: 'Incapacitated', incapacitates: true, type: PropertyType.Toggle }),
    Invisible: Object.freeze({ uri: 'invisible', name: 'Invisible', type: PropertyType.Toggle }),
    Paralyzed: Object.freeze({ uri: 'paralyzed', name: 'Paralyzed', incapacitates: true, type: PropertyType.Toggle }),
    Petrified: Object.freeze({ uri: 'petrified', name: 'Petrified', incapacitates: true, type: PropertyType.Toggle }),
    Poisoned: Object.freeze({ uri: 'poisoned', name: 'Poisoned', type: PropertyType.Toggle }),
    Prone: Object.freeze({ uri: 'prone', name: 'Prone', type: PropertyType.Toggle }),
    Restrained: Object.freeze({ uri: 'restrained', name: 'Restrained', type: PropertyType.Toggle }),
    Stunned: Object.freeze({ uri: 'stunned', name: 'Stunned', incapacitates: true, type: PropertyType.Toggle }),
    Unconscious: Object.freeze({ uri: 'unconscious', name: 'Unconscious', incapacitates: true, type: PropertyType.Toggle }),
    Sleep: Object.freeze({ uri: 'sleep', name: 'Sleep', incapacitates: true, type: PropertyType.Toggle }),
    Exhaustion: Object.freeze({ uri: 'exhaustion', name: 'Exhaustion', type: PropertyType.Number })
});

/**
 * Defines how saving throws for conditions can acquire resistance (advantage), vulnerability (disadvantage), and immunity
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const ConditionResistance = Object.freeze({
    Blinded: Object.freeze({ uri: 'resistance:blinded', name: 'Blind Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Blinded.uri ]) }),
    Charmed: Object.freeze({ uri: 'resistance:charmed', name: 'Charm Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Charmed.uri ]) }),
    Deafened: Object.freeze({ uri: 'resistance:deafened', name: 'Deafen Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Deafened.uri ]) }),
    Frightened: Object.freeze({ uri: 'resistance:frightened', name: 'Fright Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Frightened.uri ]) }),
    Grappled: Object.freeze({ uri: 'resistance:grappled', name: 'Grapple Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Grappled.uri ]) }),
    Incapacitated: Object.freeze({ uri: 'resistance:incapacitated', name: 'Incapacitated Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Incapacitated.uri ]) }),
    Paralyzed: Object.freeze({ uri: 'resistance:paralyzed', name: 'Paralyze Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Paralyzed.uri ]) }),
    Petrified: Object.freeze({ uri: 'resistance:petrified', name: 'Petrify Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Petrified.uri ]) }),
    Poisoned: Object.freeze({ uri: 'resistance:poisoned', name: 'Poisoned Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Poisoned.uri ]) }),
    Prone: Object.freeze({ uri: 'resistance:prone', name: 'Prone Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Prone.uri ]) }),
    Restrained: Object.freeze({ uri: 'resistance:restrained', name: 'Restrained Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Restrained.uri ]) }),
    Stunned: Object.freeze({ uri: 'resistance:stunned', name: 'Stunned Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Stunned.uri ]) }),
    Unconscious: Object.freeze({ uri: 'resistance:unconscious', name: 'Unconscious Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Unconscious.uri ]) }),
    Sleep: Object.freeze({ uri: 'resistance:sleep', name: 'Sleep Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Sleep.uri ]) }),
    Exhaustion: Object.freeze({ uri: 'resistance:exhaustion', name: 'Exhaustion Resistance', type: PropertyType.Resistance, diceTags: Object.freeze([ ConditionType.Exhaustion.uri ]) })
});

/**
 * Defines the top-level ability scores for a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const AbilityScore = Object.freeze({
    STR: Object.freeze({ uri: 'str', name: 'Strength Score', short: 'Strength', type: PropertyType.Number, dndBeyond: 1 }),
    DEX: Object.freeze({ uri: 'dex', name: 'Dexterity Score', short: 'Dexterity', type: PropertyType.Number, dndBeyond: 2 }),
    CON: Object.freeze({ uri: 'con', name: 'Constitution Score', short: 'Constitution', type: PropertyType.Number, dndBeyond: 3 }),
    INT: Object.freeze({ uri: 'int', name: 'Intelligence Score', short: 'Intelligence', type: PropertyType.Number, dndBeyond: 4 }),
    WIS: Object.freeze({ uri: 'wis', name: 'Wisdom Score', short: 'Wisdom', type: PropertyType.Number, dndBeyond: 5 }),
    CHA: Object.freeze({ uri: 'cha', name: 'Charisma Score', short: 'Charisma', type: PropertyType.Number, dndBeyond: 6 }),
    ArmorClass: Object.freeze({ uri: 'ac', name: 'Armor Class', type: PropertyType.Number }),
    ProficiencyBonus: Object.freeze({ uri: 'pb', name: 'Proficiency Bonus', type: PropertyType.Number })
});

/**
 * Defines the top-level modifiers based on ability scores for a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const AbilityModifier = Object.freeze({
    STR: Object.freeze({ uri: 'modifier:str', name: 'Strength Modifier', type: PropertyType.Number }),
    DEX: Object.freeze({ uri: 'modifier:dex', name: 'Dexterity Modifier', type: PropertyType.Number }),
    CON: Object.freeze({ uri: 'modifier:con', name: 'Constitution Modifier', type: PropertyType.Number }),
    INT: Object.freeze({ uri: 'modifier:int', name: 'Intelligence Modifier', type: PropertyType.Number }),
    WIS: Object.freeze({ uri: 'modifier:wis', name: 'Wisdom Modifier', type: PropertyType.Number }),
    CHA: Object.freeze({ uri: 'modifier:cha', name: 'Charisma Modifier', type: PropertyType.Number }),
    CHA: Object.freeze({ uri: 'modifier:initiative', name: 'Initiative', type: PropertyType.Number })
});

/**
 * Defines the type of hit points that can be managed for a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const HitPoint = Object.freeze({
    HitDieCount: Object.freeze({ uri: 'hit:dice', name: 'Hit Die Count', type: PropertyType.Number }),
    HitDieSize: Object.freeze({ uri: 'hit:dice:size', name: 'Hit Die Size', type: PropertyType.DieSize }),
    Maximum: Object.freeze({ uri: 'hp:max', name: 'Hit Point Maximum', type: PropertyType.Number })
});

/**
 * Defines constraints that can be applied to a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const AbilityConstraints = Object.freeze({
    AdvantageLimit: Object.freeze({ uri: 'advantage:limit', name: 'Advantage Limit', type: PropertyType.Number }), // Max number of dice that can be granted for advantage or disadvantage
    ActionLimit: Object.freeze({ uri: 'action:limit', name: 'Action Limit', type: PropertyType.Charges }),
    BonusActionLimit: Object.freeze({ uri: 'action:bonus:limit', name: 'Bonus Action Limit', type: PropertyType.Charges }),
    ReactionLimit: Object.freeze({ uri: 'reaction:limit', name: 'Reaction Limit', type: PropertyType.Charges }),
    WeaponAttackLimit: Object.freeze({ uri: 'weapon:attack:limit', name: 'Weapon Attack Limit', type: PropertyType.Charges })
});

/**
 * Defines constraints that can be applied to a token
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SpellTracking = Object.freeze({
    ConcentrationAllowed: Object.freeze({ uri: 'concentration', name: 'Can Concentrate', type: PropertyType.Toggle }),
    ConcentrationLimit: Object.freeze({ uri: 'concentration:limit', name: 'Concentration Limit', type: PropertyType.Number }),
    SpellSlotLevel1: Object.freeze({ uri: 'spell:slot:1', name: '1st Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel2: Object.freeze({ uri: 'spell:slot:2', name: '2nd Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel3: Object.freeze({ uri: 'spell:slot:3', name: '3rd Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel4: Object.freeze({ uri: 'spell:slot:4', name: '4th Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel5: Object.freeze({ uri: 'spell:slot:5', name: '5th Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel6: Object.freeze({ uri: 'spell:slot:6', name: '6th Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel7: Object.freeze({ uri: 'spell:slot:7', name: '7th Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel8: Object.freeze({ uri: 'spell:slot:8', name: '8th Level Spell Slots', type: PropertyType.Charges }),
    SpellSlotLevel9: Object.freeze({ uri: 'spell:slot:9', name: '9th Level Spell Slots', type: PropertyType.Charges })
});

/**
 * While proficiency and critical are disabled for a pure dice roll against the ability,
 * these can also serve as modifiers that are broadly applied to more well-defined dice rolls
 * such as status effects that target DEX ability checks also applying to DEX skill checks
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const AbilityCheck = Object.freeze({
    Any: Object.freeze({ uri: 'check', name: 'Any Ability Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck,  diceTags: Object.freeze([ 'check' ]) }),
    STR: Object.freeze({ uri: 'check:str', name: 'Strength Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.STR.uri ]) }),
    DEX: Object.freeze({ uri: 'check:dex', name: 'Dexterity Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.DEX.uri ]) }),
    CON: Object.freeze({ uri: 'check:con', name: 'Constitution Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.CON.uri ]) }),
    INT: Object.freeze({ uri: 'check:int', name: 'Intelligence Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.INT.uri ]) }),
    WIS: Object.freeze({ uri: 'check:wis', name: 'Wisdom Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.WIS.uri ]) }),
    CHA: Object.freeze({ uri: 'check:cha', name: 'Charisma Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.CHA.uri ]) }),
    Proficiency: Object.freeze({ uri: 'check:pb', name: 'Proficiency Check', type: PropertyType.Roll, rollType: RollType.AbilityCheck, diceTags: Object.freeze([ 'check', AbilityScore.ProficiencyBonus.uri ]) })
});

/**
 * Proficiency and critical are omitted from this configuration because saving throws follow the default which is true
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SavingThrow = Object.freeze({
    Any: Object.freeze({ uri: 'save', name: 'Any Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save' ]) }),
    STR: Object.freeze({ uri: 'save:str', name: 'Strength Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.STR.uri ]) }),
    DEX: Object.freeze({ uri: 'save:dex', name: 'Dexterity Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.DEX.uri ]) }),
    CON: Object.freeze({ uri: 'save:con', name: 'Constitution Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.CON.uri ]) }),
    INT: Object.freeze({ uri: 'save:int', name: 'Intelligence Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.INT.uri ]) }),
    WIS: Object.freeze({ uri: 'save:wis', name: 'Wisdom Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.WIS.uri ]) }),
    CHA: Object.freeze({ uri: 'save:cha', name: 'Charisma Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save', AbilityScore.CHA.uri ]) }),
    Death: Object.freeze({ uri: 'save:death', name: 'Death Saving Throw', type: PropertyType.Roll, rollType: RollType.SavingThrow, diceTags: Object.freeze([ 'save:death' ]) })
});

/**
 * Defines how proficiency for saving throws can be applied
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SaveProficiency = Object.freeze({
    Any: Object.freeze({ uri: 'proficiency:save', name: 'Any Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.Any.diceTags }),
    STR: Object.freeze({ uri: 'proficiency:save:str', name: 'Strength Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.STR.diceTags }),
    DEX: Object.freeze({ uri: 'proficiency:save:dex', name: 'Dexterity Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.DEX.diceTags }),
    CON: Object.freeze({ uri: 'proficiency:save:con', name: 'Constitution Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.CON.diceTags }),
    INT: Object.freeze({ uri: 'proficiency:save:int', name: 'Intelligence Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.INT.diceTags }),
    WIS: Object.freeze({ uri: 'proficiency:save:wis', name: 'Wisdom Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.WIS.diceTags }),
    CHA: Object.freeze({ uri: 'proficiency:save:cha', name: 'Charisma Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.CHA.diceTags }),
    Death: Object.freeze({ uri: 'proficiency:save:death', name: 'Death Save Proficiency', type: PropertyType.Proficiency, diceTags: SavingThrow.Death.diceTags })
});

/**
 * Defines how saving throws can acquire resistance (advantage), vulnerability (disadvantage), and immunity
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SaveResistance = Object.freeze({
    Any: Object.freeze({ uri: 'resistance:save', name: 'Any Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.Any.diceTags }),
    STR: Object.freeze({ uri: 'resistance:save:str', name: 'Strength Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.STR.diceTags }),
    DEX: Object.freeze({ uri: 'resistance:save:dex', name: 'Dexterity Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.DEX.diceTags }),
    CON: Object.freeze({ uri: 'resistance:save:con', name: 'Constitution Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.CON.diceTags }),
    INT: Object.freeze({ uri: 'resistance:save:int', name: 'Intelligence Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.INT.diceTags }),
    WIS: Object.freeze({ uri: 'resistance:save:wis', name: 'Wisdom Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.WIS.diceTags }),
    CHA: Object.freeze({ uri: 'resistance:save:cha', name: 'Charisma Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.CHA.diceTags }),
    Death: Object.freeze({ uri: 'resistance:save:death', name: 'Death Save Resistance', type: PropertyType.Resistance, diceTags: SavingThrow.Death.diceTags })
});

/**
 * Proficiency and critical are omitted from this configuration because skill checks follow the default which is true.
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SkillCheck = Object.freeze({
    Any: Object.freeze({ uri: 'skill', name: 'Any Skill Check', diceTags: Object.freeze([ 'skill' ]), type: PropertyType.Roll, type: PropertyType.Roll, rollType: RollType.SkillCheck }),

    STR: Object.freeze({ uri: 'skill:str', name: 'Strength Skill Check', ability: AbilityScore.STR, diceTags: Object.freeze([ 'skill', AbilityScore.STR.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    DEX: Object.freeze({ uri: 'skill:dex', name: 'Dexterity Skill Check', ability: AbilityScore.DEX, diceTags: Object.freeze([ 'skill', AbilityScore.DEX.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    CON: Object.freeze({ uri: 'skill:con', name: 'Constitution Skill Check', ability: AbilityScore.CON, diceTags: Object.freeze([ 'skill', AbilityScore.CON.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    WIS: Object.freeze({ uri: 'skill:wis', name: 'Wisdom Skill Check', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill', AbilityScore.WIS.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    INT: Object.freeze({ uri: 'skill:int', name: 'Intellegence Skill Check', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill', AbilityScore.INT.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    CHA: Object.freeze({ uri: 'skill:cha', name: 'Charisma Skill Check', ability: AbilityScore.CHA, diceTags: Object.freeze([ 'skill', AbilityScore.CHA.uri ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),

    Acrobatics: Object.freeze({ uri: 'skill:acrobatics', name: 'Acrobatics', ability: AbilityScore.DEX, diceTags: Object.freeze([ 'skill:acrobatics' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    AnimalHandling: Object.freeze({ uri: 'skill:animal_handling', name: 'Animal Handling', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill:animal_handling' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Arcana: Object.freeze({ uri: 'skill:arcana', name: 'Arcana', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill:arcana' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Athletics: Object.freeze({ uri: 'skill:athletics', name: 'Athletics', ability: AbilityScore.STR, diceTags: Object.freeze([ 'skill:athletics' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Deception: Object.freeze({ uri: 'skill:deception', name: 'Deception', ability: AbilityScore.CHA, diceTags: Object.freeze([ 'skill:deception' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    History: Object.freeze({ uri: 'skill:history', name: 'History', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill:history' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Insight: Object.freeze({ uri: 'skill:insight', name: 'Insight', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill:insight' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Intimidation: Object.freeze({ uri: 'skill:intimidation', name: 'Intimidation', ability: AbilityScore.CHA, diceTags: Object.freeze([ 'skill:intimidation' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Investigation: Object.freeze({ uri: 'skill:investigation', name: 'Investigation', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill:investigation' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Medicine: Object.freeze({ uri: 'skill:medicine', name: 'Medicine', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill:medicine' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Nature: Object.freeze({ uri: 'skill:nature', name: 'Nature', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill:nature' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Perception: Object.freeze({ uri: 'skill:perception', name: 'Perception', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill:perception' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Performance: Object.freeze({ uri: 'skill:performance', name: 'Performance', ability: AbilityScore.CHA, diceTags: Object.freeze([ 'skill:performance' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Persuasion: Object.freeze({ uri: 'skill:persuasion', name: 'Persuasion', ability: AbilityScore.CHA, diceTags: Object.freeze([ 'skill:persuasion' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Religion: Object.freeze({ uri: 'skill:religion', name: 'Religion', ability: AbilityScore.INT, diceTags: Object.freeze([ 'skill:religion' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    SleightOfHand: Object.freeze({ uri: 'skill:sleight_of_hand', name: 'Sleight of Hand', ability: AbilityScore.DEX, diceTags: Object.freeze([ 'skill:sleight_of_hand' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Stealth: Object.freeze({ uri: 'skill:stealth', name: 'Stealth', ability: AbilityScore.DEX, diceTags: Object.freeze([ 'skill:stealth' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck }),
    Survival: Object.freeze({ uri: 'skill:survival', name: 'Survival', ability: AbilityScore.WIS, diceTags: Object.freeze([ 'skill:survival' ]), type: PropertyType.Roll, rollType: RollType.SkillCheck })
});

/**
 * Defines how proficiency for skill checks can be applied
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SkillProficiency = Object.freeze({
    Any: Object.freeze({ uri: 'proficiency:skill', name: 'Any Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Any.uri }),

    STR: Object.freeze({ uri: 'proficiency:skill:str', name: 'Strength Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.STR.uri }),
    DEX: Object.freeze({ uri: 'proficiency:skill:dex', name: 'Dexterity Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.DEX.uri }),
    CON: Object.freeze({ uri: 'proficiency:skill:con', name: 'Constitution Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.CON.uri }),
    WIS: Object.freeze({ uri: 'proficiency:skill:wis', name: 'Wisdom Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.WIS.uri }),
    INT: Object.freeze({ uri: 'proficiency:skill:int', name: 'Intellegence Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.INT.uri }),
    CHA: Object.freeze({ uri: 'proficiency:skill:cha', name: 'Charisma Skill Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.CHA.uri }),

    Acrobatics: Object.freeze({ uri: 'proficiency:skill:acrobatics', name: 'Acrobatics Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Acrobatics.uri }),
    AnimalHandling: Object.freeze({ uri: 'proficiency:skill:animal_handling', name: 'Animal Handling Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.AnimalHandling.uri }),
    Arcana: Object.freeze({ uri: 'proficiency:skill:arcana', name: 'Arcana Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Arcana.uri }),
    Athletics: Object.freeze({ uri: 'proficiency:skill:athletics', name: 'Athletics Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Athletics.uri }),
    Deception: Object.freeze({ uri: 'proficiency:skill:deception', name: 'Deception Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Deception.uri }),
    History: Object.freeze({ uri: 'proficiency:skill:history', name: 'History Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.History.uri }),
    Insight: Object.freeze({ uri: 'proficiency:skill:insight', name: 'Insight Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Insight.uri }),
    Intimidation: Object.freeze({ uri: 'proficiency:skill:intimidation', name: 'Intimidation Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Intimidation.uri }),
    Investigation: Object.freeze({ uri: 'proficiency:skill:investigation', name: 'Investigation Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Investigation.uri }),
    Medicine: Object.freeze({ uri: 'proficiency:skill:medicine', name: 'Medicine Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Medicine.uri }),
    Nature: Object.freeze({ uri: 'proficiency:skill:nature', name: 'Nature Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Nature.uri }),
    Perception: Object.freeze({ uri: 'proficiency:skill:perception', name: 'Perception Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Perception.uri }),
    Performance: Object.freeze({ uri: 'proficiency:skill:performance', name: 'Performance Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Performance.uri }),
    Persuasion: Object.freeze({ uri: 'proficiency:skill:persuasion', name: 'Persuasion Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Persuasion.uri }),
    Religion: Object.freeze({ uri: 'proficiency:skill:religion', name: 'Religion Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Religion.uri }),
    SleightOfHand: Object.freeze({ uri: 'proficiency:skill:sleight_of_hand', name: 'Sleight of Hand Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.SleightOfHand.uri }),
    Stealth: Object.freeze({ uri: 'proficiency:skill:stealth', name: 'Stealth Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Stealth.uri }),
    Survival: Object.freeze({ uri: 'proficiency:skill:survival', name: 'Survival Proficiency', type: PropertyType.Proficiency, diceTags: SkillCheck.Survival.uri }),
});

/**
 * Defines how advantage for skill checks can be applied
 * @readonly
 * @enum {PropertyConfiguration}
 */
export const SkillAdvantage = Object.freeze({
    Any: Object.freeze({ uri: 'advantage:skill', name: 'Any Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Any.uri }),

    STR: Object.freeze({ uri: 'advantage:skill:str', name: 'Strength Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.STR.uri }),
    DEX: Object.freeze({ uri: 'advantage:skill:dex', name: 'Dexterity Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.DEX.uri }),
    CON: Object.freeze({ uri: 'advantage:skill:con', name: 'Constitution Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.CON.uri }),
    WIS: Object.freeze({ uri: 'advantage:skill:wis', name: 'Wisdom Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.WIS.uri }),
    INT: Object.freeze({ uri: 'advantage:skill:int', name: 'Intellegence Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.INT.uri }),
    CHA: Object.freeze({ uri: 'advantage:skill:cha', name: 'Charisma Skill Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.CHA.uri }),

    Acrobatics: Object.freeze({ uri: 'advantage:skill:acrobatics', name: 'Acrobatics Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Acrobatics.uri }),
    AnimalHandling: Object.freeze({ uri: 'advantage:skill:animal_handling', name: 'Animal Handling Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.AnimalHandling.uri }),
    Arcana: Object.freeze({ uri: 'advantage:skill:arcana', name: 'Arcana Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Arcana.uri }),
    Athletics: Object.freeze({ uri: 'advantage:skill:athletics', name: 'Athletics Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Athletics.uri }),
    Deception: Object.freeze({ uri: 'advantage:skill:deception', name: 'Deception Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Deception.uri }),
    History: Object.freeze({ uri: 'advantage:skill:history', name: 'History Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.History.uri }),
    Insight: Object.freeze({ uri: 'advantage:skill:insight', name: 'Insight Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Insight.uri }),
    Intimidation: Object.freeze({ uri: 'advantage:skill:intimidation', name: 'Intimidation Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Intimidation.uri }),
    Investigation: Object.freeze({ uri: 'advantage:skill:investigation', name: 'Investigation Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Investigation.uri }),
    Medicine: Object.freeze({ uri: 'advantage:skill:medicine', name: 'Medicine Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Medicine.uri }),
    Nature: Object.freeze({ uri: 'advantage:skill:nature', name: 'Nature Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Nature.uri }),
    Perception: Object.freeze({ uri: 'advantage:skill:perception', name: 'Perception Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Perception.uri }),
    Performance: Object.freeze({ uri: 'advantage:skill:performance', name: 'Performance Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Performance.uri }),
    Persuasion: Object.freeze({ uri: 'advantage:skill:persuasion', name: 'Persuasion Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Persuasion.uri }),
    Religion: Object.freeze({ uri: 'advantage:skill:religion', name: 'Religion Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Religion.uri }),
    SleightOfHand: Object.freeze({ uri: 'advantage:skill:sleight_of_hand', name: 'Sleight of Hand Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.SleightOfHand.uri }),
    Stealth: Object.freeze({ uri: 'advantage:skill:stealth', name: 'Stealth Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Stealth.uri }),
    Survival: Object.freeze({ uri: 'advantage:skill:survival', name: 'Survival Advantage', type: PropertyType.Advantage, diceTags: SkillCheck.Survival.uri }),
});
