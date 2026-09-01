/**
 * @typedef {KnownConfigurationSettings & { [property: string]: any }} ConfigurationSettings
 * @typedef {Object} KnownConfigurationSettings
 * @property {string} uri - The value that is intended to be persisted within token options
 * @property {string} name - The value that is intended to be displayed to users
 * 
 * @typedef { ConfigurationSettings & { multiplier: number } } ProficiencySettings
 * @typedef { ConfigurationSettings & { size: number } } DiceConfigurationSettings
 * @typedef { ConfigurationSettings & { type: KnownConfigurationSettings } } TypedConfigurationSettings
 * @typedef { TypedConfigurationSettings & { srd: string, min?: number, max?: number } } ConditionSettings
 * @typedef { TypedConfigurationSettings & { diceTags: string[] } } DiceModifierSettings
 * @typedef { DiceModifierSettings & { rollType: KnownConfigurationSettings } } DiceRollSettings
 * @typedef { DiceModifierSettings & { ability: KnownConfigurationSettings } } SkillCheckSettings
 */

/** Manages a sealed index of configuration settings for a given type. */
export class Configuration {
    /** @type {{ [uri: string]: ConfigurationSettings}} */
    #lookup;

    /**
     * @param {{ [friendly: string]: ConfigurationSettings}} map - The mapping of properties within the configuration
     * @param {{ [property: string]: any}} common - The mapping of common properties to apply to all settings
    */
    constructor(map, common) {
        this.#lookup = {};

        for (let [friendly, value] of Object.entries(map)) {
            if (common != null) {
                value = {
                    ...value,
                    ...common
                }
            }

            const frozen = Configuration.deepFreeze(value);
            this[friendly] = frozen;
            this.#lookup[frozen.uri] = frozen;
        }

        Object.freeze(this);
        Object.freeze(this.#lookup);
    }

    /**
     * @param {string} uri - The URI of the configuration to retrieve.
     * @return {ConfigurationSettings}
     */
    getByUri(uri) {
        return this.#lookup[uri];
    }

    /** @return {ConfigurationSettings[]} The complete list of available configuration settings */
    list() {
        return Object.values(this.#lookup);
    }

    /** Recursively freezes an object to make it completely immutable. */
    static deepFreeze(obj) {
        if (obj != null && typeof obj === 'object' && !Object.isFrozen(obj)) {
            Object.freeze(obj);

            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    Configuration.deepFreeze(obj[i]);
                }
            } else {
                for (const key of Object.getOwnPropertyNames(obj)) {
                    Configuration.deepFreeze(obj[key]);
                }
            }
        }

        return obj;
    }
}

/**
 * Defines the type of behavior that a property on a token utilizies
 * @type {Configuration & {
 *   Number: ConfigurationSettings,
 *   Toggle: ConfigurationSettings,
 *   Charges: ConfigurationSettings,
 *   Roll: ConfigurationSettings,
 *   Condition: ConfigurationSettings,
 *   Proficiency: ConfigurationSettings,
 *   Advantage: ConfigurationSettings,
 *   Resistance: ConfigurationSettings,
 *   AbilityModifier: ConfigurationSettings,
 *   DieSize: ConfigurationSettings
 * }}
 */
export const PropertyType = new Configuration({
    Number: { uri: 'prop:number', name: 'Number' },
    Toggle: { uri: 'prop:toggle', name: 'Toggle' },
    Charges: { uri: 'prop:charges', name: 'Charges' },
    Roll: { uri: 'prop:roll', name: 'Dice Roll' },
    Condition: { uri: 'prop:condition', name: 'Condition' },
    Proficiency: { uri: 'prop:proficiency', name: 'Proficiency' },
    Advantage: { uri: 'prop:advantage', name: 'Advantage' },
    Resistance: { uri: 'prop:resistance', name: 'Resistance' },
    AbilityModifier: { uri: 'prop:ability:modifier', name: 'Ability Modifier' },
    DieSize: { uri: 'prop:die:size', name: 'Die Size' }
});

/**
 * Defines the type of behavior for a given style of dice roll
 * @type {Configuration & {
 *   Unspecified: ConfigurationSettings,
 *   AbilityCheck: ConfigurationSettings,
 *   SkillCheck: ConfigurationSettings,
 *   SavingThrow: ConfigurationSettings,
 *   ToHit: ConfigurationSettings,
 *   Damage: ConfigurationSettings,
 *   Heal: ConfigurationSettings
 * }}
 */
export const RollType = new Configuration({
    Unspecified: { uri: 'roll:basic', name: 'Roll', proficiency: true, critical: true, advantage: true },
    AbilityCheck: { uri: 'roll:check', name: 'Ability Check', proficiency: true, critical: false, advantage: true },
    SkillCheck: { uri: 'roll:skill', name: 'Skill Check', proficiency: true, critical: false, advantage: true },
    SavingThrow: { uri: 'roll:save', name: 'Saving Throw', proficiency: true, critical: false, advantage: true },
    ToHit: { uri: 'roll:tohit', name: 'To Hit', proficiency: true, critical: false, advantage: true },
    Damage: { uri: 'roll:damage', name: 'Damage', proficiency: true, critical: true, advantage: false },
    Heal: { uri: 'roll:heal', name: 'Heal', proficiency: true, critical: true, advantage: false }
});

/**
 * Defines the type of dice rolls that are available
 * @type {Configuration & {
 *   d4: DiceConfigurationSettings,
 *   d6: DiceConfigurationSettings,
 *   d8: DiceConfigurationSettings,
 *   d10: DiceConfigurationSettings,
 *   d12: DiceConfigurationSettings,
 *   d20: DiceConfigurationSettings,
 *   d100: DiceConfigurationSettings
 * }}
 */
export const DiceType = new Configuration({
    d4: { uri: 'd2', name: 'd2', size: 2 }, // Coin Flip
    d4: { uri: 'd4', name: 'd4', size: 4 },
    d6: { uri: 'd6', name: 'd6', size: 6 },
    d8: { uri: 'd8', name: 'd8', size: 8 },
    d10: { uri: 'd10', name: 'd10', size: 10 },
    d12: { uri: 'd12', name: 'd12', size: 12 },
    d20: { uri: 'd20', name: 'd20', size: 20 },
    d100: { uri: 'd100', name: 'd100', size: 100 }
});

/**
 * Defines the types of proficiency that can be granted to a property of a token
 * @type {Configuration & {
 *   None: ProficiencySettings,
 *   Beginner: ProficiencySettings,
 *   Proficient: ProficiencySettings,
 *   Expert: ProficiencySettings,
 *   MinorFlaw: ProficiencySettings,
 *   Flaw: ProficiencySettings,
 *   MajorFlaw: ProficiencySettings
 * }}
 */
export const ProficiencyType = new Configuration({
    None: { uri: 'proficiency:none', name: 'None', multiplier: 0 },

    // Buffs
    Beginner: { uri: 'half', name: 'Beginner', multiplier: 0.5 },
    Proficient: { uri: 'proficient', name: 'Proficient', multiplier: 1 },
    Expert: { uri: 'expert', name: 'Expert', multiplier: 2 },

    // Debuffs
    MinorFlaw: { uri: 'flaw:minor', name: 'Minorly Flawed', multiplier: -0.5 },
    Flaw: { uri: 'flaw', name: 'Flawed', multiplier: -1 },
    MajorFlaw: { uri: 'flaw:heavy', name: 'Heavily Flawed', multiplier: -2 }
});

/**
 * Defines the types of resistance that can be granted to a property of a token
 * @type {Configuration & {
 *   None: ConfigurationSettings,
 *   Resistance: ConfigurationSettings,
 *   Immunity: ConfigurationSettings,
 *   Vulnerability: ConfigurationSettings
 * }}
 */
export const ResistanceType = new Configuration({
    None: { uri: 'resist:none', name: 'None', apply: (amt) => amt, d20test: 0 },
    Resistance: { uri: 'resist', name: 'Resistance', apply: (amt) => (amt !== 0 ? Math.floor(amt / 2) : amt), d20test: 1 },
    Immunity: { uri: 'immune', name: 'Immunity', apply: () => 0, d20test: Infinity },
    Vulnerability: { uri: 'vulnerable', name: 'Vulnerability', apply: (amt) => (amt * 2), d20test: -1 }
});

/**
 * Defines whether a property containing a roll has advantage or disadvantage. To support advantage stacking use the following:
 * 1. Track sources of advantage and disadvantage seperately
 * 2. Limit the total number of each source count based on the value of AbilityConstraints.AdvantageLimit
 * 3. (Advantage Sources - Disadvantage Sources) as basis for keep high / low impact
 * Since the default advantage limit is 1, this would enact RAW by default
 * @type {Configuration & {
 *   None: ConfigurationSettings,
 *   Advantage: ConfigurationSettings,
 *   Disadvantage: ConfigurationSettings
 * }}
 */
export const AdvantageType = new Configuration({
    None: { uri: 'advantage:none', name: 'None', d20test: 0 },
    Advantage: { uri: 'advantage', name: 'Advantage', d20test: 1 },
    Disadvantage: { uri: 'disadvantage', name: 'Disadvantage', d20test: -1 }
});

/**
 * Defines the types of damage that can be dealt to a token
 * @type {Configuration & {
 *   Magic: ConfigurationSettings,
 *   Physical: ConfigurationSettings,
 *   Slashing: ConfigurationSettings,
 *   Piercing: ConfigurationSettings,
 *   Bludgeoning: ConfigurationSettings,
 *   Acid: ConfigurationSettings,
 *   Cold: ConfigurationSettings,
 *   Fire: ConfigurationSettings,
 *   Force: ConfigurationSettings,
 *   Lightning: ConfigurationSettings,
 *   Necrotic: ConfigurationSettings,
 *   Poison: ConfigurationSettings,
 *   Psychic: ConfigurationSettings,
 *   Radiant: ConfigurationSettings,
 *   Thunder: ConfigurationSettings
 * }}
 */
export const DamageType = new Configuration({
    Magic: { uri: 'dmg:magic', name: 'Magic Damage' },
    Physical: { uri: 'dmg:physical', name: 'Physical Damage' },

    Slashing: { uri: 'slashing', name: 'Slashing' },
    Piercing: { uri: 'piercing', name: 'Piercing' },
    Bludgeoning: { uri: 'bludgeoning', name: 'Bludgeoning' },
    Acid: { uri: 'acid', name: 'Acid' },
    Cold: { uri: 'cold', name: 'Cold' },
    Fire: { uri: 'fire', name: 'Fire' },
    Force: { uri: 'force', name: 'Force' },
    Lightning: { uri: 'lightning', name: 'Lightning' },
    Necrotic: { uri: 'necrotic', name: 'Necrotic' },
    Poison: { uri: 'poison', name: 'Poison' },
    Psychic: { uri: 'psychic', name: 'Psychic' },
    Radiant: { uri: 'radiant', name: 'Radiant' },
    Thunder: { uri: 'thunder', name: 'Thunder' }
});

/**
 * Defines how resistance can be applied to damage types
 * @type {Configuration & {
 *   Magic: DiceModifierSettings,
 *   Physical: DiceModifierSettings,
 *   Slashing: DiceModifierSettings,
 *   Piercing: DiceModifierSettings,
 *   Bludgeoning: DiceModifierSettings,
 *   Acid: DiceModifierSettings,
 *   Cold: DiceModifierSettings,
 *   Fire: DiceModifierSettings,
 *   Force: DiceModifierSettings,
 *   Lightning: DiceModifierSettings,
 *   Necrotic: DiceModifierSettings,
 *   Poison: DiceModifierSettings,
 *   Psychic: DiceModifierSettings,
 *   Radiant: DiceModifierSettings,
 *   Thunder: DiceModifierSettings
 * }}
 */
export const DamageResistance = new Configuration({
    Magic: { uri: 'resistance:dmg:magic', name: 'Magic Damage Resistance', diceTags: [ DamageType.Magic.uri ] },
    Physical: { uri: 'resistance:dmg:physical', name: 'Physical Damage Resistance', diceTags: [ DamageType.Physical.uri ] },

    Slashing: { uri: 'resistance:slashing', name: 'Slashing Resistance', diceTags: [ DamageType.Slashing.uri ] },
    Piercing: { uri: 'resistance:piercing', name: 'Piercing Resistance', diceTags: [ DamageType.Piercing.uri ] },
    Bludgeoning: { uri: 'resistance:bludgeoning', name: 'Bludgeoning Resistance', diceTags: [ DamageType.Bludgeoning.uri ] },
    Acid: { uri: 'resistance:acid', name: 'Acid Resistance', diceTags: [ DamageType.Acid.uri ] },
    Cold: { uri: 'resistance:cold', name: 'Cold Resistance', diceTags: [ DamageType.Cold.uri ] },
    Fire: { uri: 'resistance:fire', name: 'Fire Resistance', diceTags: [ DamageType.Fire.uri ] },
    Force: { uri: 'resistance:force', name: 'Force Resistance', diceTags: [ DamageType.Force.uri ] },
    Lightning: { uri: 'resistance:lightning', name: 'Lightning Resistance', diceTags: [ DamageType.Lightning.uri ] },
    Necrotic: { uri: 'resistance:necrotic', name: 'Necrotic Resistance', diceTags: [ DamageType.Necrotic.uri ] },
    Poison: { uri: 'resistance:poison', name: 'Poison Resistance', diceTags: [ DamageType.Poison.uri ] },
    Psychic: { uri: 'resistance:psychic', name: 'Psychic Resistance', diceTags: [ DamageType.Psychic.uri ] },
    Radiant: { uri: 'resistance:radiant', name: 'Radiant Resistance', diceTags: [ DamageType.Radiant.uri ] },
    Thunder: { uri: 'resistance:thunder', name: 'Thunder Resistance', diceTags: [ DamageType.Thunder.uri ] }
}, { type: PropertyType.Resistance });

/**
 * The types of conditions and whether they cause the token to be incapacitated 
 * for the purposes of maintained effect removal
 * @type {Configuration & {
 *   Blinded: ConditionSettings,
 *   Charmed: ConditionSettings,
 *   Deafened: ConditionSettings,
 *   Frightened: ConditionSettings,
 *   Grappled: ConditionSettings,
 *   Incapacitated: ConditionSettings,
 *   Invisible: ConditionSettings,
 *   Paralyzed: ConditionSettings,
 *   Petrified: ConditionSettings,
 *   Poisoned: ConditionSettings,
 *   Prone: ConditionSettings,
 *   Restrained: ConditionSettings,
 *   Stunned: ConditionSettings,
 *   Unconscious: ConditionSettings,
 *   Exhaustion: ConditionSettings
 * }}
 */
export const ConditionType = new Configuration({
    Blinded: { uri: 'blinded', name: 'Blinded', type: PropertyType.Condition, srd: "Blinded" },
    Charmed: { uri: 'charmed', name: 'Charmed', type: PropertyType.Condition, srd: "Charmed" },
    Deafened: { uri: 'deafened', name: 'Deafened', type: PropertyType.Condition, srd: "Deafened" },
    Frightened: { uri: 'frightened', name: 'Frightened', type: PropertyType.Condition, srd: "Frightened" },
    Grappled: { uri: 'grappled', name: 'Grappled', type: PropertyType.Condition, srd: "Grappled" },
    Incapacitated: { uri: 'incapacitated', name: 'Incapacitated', incapacitates: true, type: PropertyType.Condition, srd: "Incapacitated" },
    Invisible: { uri: 'invisible', name: 'Invisible', type: PropertyType.Condition, srd: "Invisible" },
    Paralyzed: { uri: 'paralyzed', name: 'Paralyzed', incapacitates: true, type: PropertyType.Condition, srd: "Paralyzed" },
    Petrified: { uri: 'petrified', name: 'Petrified', incapacitates: true, type: PropertyType.Condition, srd: "Petrified" },
    Poisoned: { uri: 'poisoned', name: 'Poisoned', type: PropertyType.Condition, srd: "Poisoned" },
    Prone: { uri: 'prone', name: 'Prone', type: PropertyType.Condition, srd: "Prone" },
    Restrained: { uri: 'restrained', name: 'Restrained', type: PropertyType.Condition, srd: "Restrained" },
    Stunned: { uri: 'stunned', name: 'Stunned', incapacitates: true, type: PropertyType.Condition, srd: "Stunned" },
    Unconscious: { uri: 'unconscious', name: 'Unconscious', incapacitates: true, type: PropertyType.Condition, srd: "Unconscious" },
    Exhaustion: { uri: 'exhaustion:srd', name: 'Exhaustion', type: PropertyType.Number, min: 0, max: 11, srd: "Exhaustion" }
});

/**
 * Defines how saving throws for conditions can acquire resistance (advantage), vulnerability (disadvantage), and immunity
 * @type {Configuration & {
 *   Blinded: DiceModifierSettings,
 *   Charmed: DiceModifierSettings,
 *   Deafened: DiceModifierSettings,
 *   Frightened: DiceModifierSettings,
 *   Grappled: DiceModifierSettings,
 *   Incapacitated: DiceModifierSettings,
 *   Paralyzed: DiceModifierSettings,
 *   Petrified: DiceModifierSettings,
 *   Poisoned: DiceModifierSettings,
 *   Prone: DiceModifierSettings,
 *   Restrained: DiceModifierSettings,
 *   Stunned: DiceModifierSettings,
 *   Unconscious: DiceModifierSettings,
 *   Exhaustion: DiceModifierSettings
 * }}
 */
export const ConditionResistance = new Configuration({
    Blinded: { uri: 'resistance:blinded', name: 'Blind Resistance', diceTags: [ ConditionType.Blinded.uri ] },
    Charmed: { uri: 'resistance:charmed', name: 'Charm Resistance', diceTags: [ ConditionType.Charmed.uri ] },
    Deafened: { uri: 'resistance:deafened', name: 'Deafen Resistance', diceTags: [ ConditionType.Deafened.uri ] },
    Frightened: { uri: 'resistance:frightened', name: 'Fright Resistance', diceTags: [ ConditionType.Frightened.uri ] },
    Grappled: { uri: 'resistance:grappled', name: 'Grapple Resistance', diceTags: [ ConditionType.Grappled.uri ] },
    Incapacitated: { uri: 'resistance:incapacitated', name: 'Incapacitated Resistance', diceTags: [ ConditionType.Incapacitated.uri ] },
    Paralyzed: { uri: 'resistance:paralyzed', name: 'Paralyze Resistance', diceTags: [ ConditionType.Paralyzed.uri ] },
    Petrified: { uri: 'resistance:petrified', name: 'Petrify Resistance', diceTags: [ ConditionType.Petrified.uri ] },
    Poisoned: { uri: 'resistance:poisoned', name: 'Poisoned Resistance', diceTags: [ ConditionType.Poisoned.uri ] },
    Prone: { uri: 'resistance:prone', name: 'Prone Resistance', diceTags: [ ConditionType.Prone.uri ] },
    Restrained: { uri: 'resistance:restrained', name: 'Restrained Resistance', diceTags: [ ConditionType.Restrained.uri ] },
    Stunned: { uri: 'resistance:stunned', name: 'Stunned Resistance', diceTags: [ ConditionType.Stunned.uri ] },
    Unconscious: { uri: 'resistance:unconscious', name: 'Unconscious Resistance', diceTags: [ ConditionType.Unconscious.uri ] },
    Exhaustion: { uri: 'resistance:exhaustion', name: 'Exhaustion Resistance', diceTags: [ ConditionType.Exhaustion.uri ] }
}, { type: PropertyType.Resistance });

/**
 * Defines the top-level ability scores for a token
 * @type {Configuration & {
 *   STR: ConfigurationSettings,
 *   DEX: ConfigurationSettings,
 *   CON: ConfigurationSettings,
 *   INT: ConfigurationSettings,
 *   WIS: ConfigurationSettings,
 *   CHA: ConfigurationSettings,
 *   ArmorClass: ConfigurationSettings,
 *   ProficiencyBonus: ConfigurationSettings,
 *   Level: ConfigurationSettings
 * }}
 */
export const AbilityScore = new Configuration({
    STR: { uri: 'str', name: 'Strength Score', short: 'Strength', dndBeyond: 1, open5e: 'strength' },
    DEX: { uri: 'dex', name: 'Dexterity Score', short: 'Dexterity', dndBeyond: 2, open5e: 'dexterity' },
    CON: { uri: 'con', name: 'Constitution Score', short: 'Constitution', dndBeyond: 3, open5e: 'constitution' },
    INT: { uri: 'int', name: 'Intelligence Score', short: 'Intelligence', dndBeyond: 4, open5e: 'intelligence' },
    WIS: { uri: 'wis', name: 'Wisdom Score', short: 'Wisdom', dndBeyond: 5, open5e: 'wisdom' },
    CHA: { uri: 'cha', name: 'Charisma Score', short: 'Charisma', dndBeyond: 6, open5e: 'charisma' },
    ArmorClass: { uri: 'ac', name: 'Armor Class', open5e: 'armor_class' },
    ProficiencyBonus: { uri: 'pb', name: 'Proficiency Bonus', open5e: 'proficiency_bonus' },
    Level: { uri: 'level', name: 'Level', open5e: 'challenge_rating' }
}, { type: PropertyType.Number });

/**
 * Defines the top-level modifiers based on ability scores for a token
 * @type {Configuration & {
 *   STR: ConfigurationSettings,
 *   DEX: ConfigurationSettings,
 *   CON: ConfigurationSettings,
 *   INT: ConfigurationSettings,
 *   WIS: ConfigurationSettings,
 *   CHA: ConfigurationSettings
 * }}
 */
export const AbilityModifier = new Configuration({
    STR: { uri: 'modifier:str', name: 'Strength Modifier', score: AbilityScore.STR },
    DEX: { uri: 'modifier:dex', name: 'Dexterity Modifier', score: AbilityScore.DEX },
    CON: { uri: 'modifier:con', name: 'Constitution Modifier', score: AbilityScore.CON },
    INT: { uri: 'modifier:int', name: 'Intelligence Modifier', score: AbilityScore.INT },
    WIS: { uri: 'modifier:wis', name: 'Wisdom Modifier', score: AbilityScore.WIS },
    CHA: { uri: 'modifier:cha', name: 'Charisma Modifier', score: AbilityScore.CHA },
    Initiative: { uri: 'modifier:initiative', name: 'Initiative', score: AbilityScore.DEX }
}, { type: PropertyType.Number });

/**
 * Defines the type of hit points that can be managed for a token
 * @type {Configuration & {
 *   HitDieCount: ConfigurationSettings,
 *   HitDieSize: ConfigurationSettings,
 *   Maximum: ConfigurationSettings
 * }}
 */
export const HitPoint = new Configuration({
    HitDieCount: { uri: 'hit:dice', name: 'Hit Die Count', type: PropertyType.Number },
    HitDieSize: { uri: 'hit:dice:size', name: 'Hit Die Size', type: PropertyType.DieSize },
    Maximum: { uri: 'hp:max', name: 'Hit Point Maximum', type: PropertyType.Number }
});

/**
 * Defines constraints that can be applied to a token
 * @type {Configuration & {
 *   AdvantageLimit: ConfigurationSettings,
 *   ActionLimit: ConfigurationSettings,
 *   BonusActionLimit: ConfigurationSettings,
 *   ReactionLimit: ConfigurationSettings,
 *   WeaponAttackLimit: ConfigurationSettings
 * }}
 */
export const AbilityConstraints = new Configuration({
    AdvantageLimit: { uri: 'advantage:limit', name: 'Advantage Limit', type: PropertyType.Number }, // Max number of dice that can be granted for advantage or disadvantage
    ActionLimit: { uri: 'action:limit', name: 'Actions', type: PropertyType.Charges },
    BonusActionLimit: { uri: 'action:bonus:limit', name: 'Bonus Actions', type: PropertyType.Charges },
    ReactionLimit: { uri: 'reaction:limit', name: 'Reactions', type: PropertyType.Charges },
    WeaponAttackLimit: { uri: 'weapon:attack:limit', name: 'Weapon Attacks', type: PropertyType.Charges }
});

/**
 * Defines constraints that can be applied to a token
 * @type {Configuration & {
 *   ConcentrationAllowed: ConfigurationSettings,
 *   ConcentrationLimit: ConfigurationSettings,
 *   SpellSlotLevel1: ConfigurationSettings,
 *   SpellSlotLevel2: ConfigurationSettings,
 *   SpellSlotLevel3: ConfigurationSettings,
 *   SpellSlotLevel4: ConfigurationSettings,
 *   SpellSlotLevel5: ConfigurationSettings,
 *   SpellSlotLevel6: ConfigurationSettings,
 *   SpellSlotLevel7: ConfigurationSettings,
 *   SpellSlotLevel8: ConfigurationSettings,
 *   SpellSlotLevel9: ConfigurationSettings
 * }}
 */
export const SpellTracking = new Configuration({
    ConcentrationAllowed: { uri: 'concentration', name: 'Can Concentrate', type: PropertyType.Toggle },
    ConcentrationLimit: { uri: 'concentration:limit', name: 'Concentration Limit', type: PropertyType.Number },
    SpellSlotLevel1: { uri: 'spell:slot:1', name: '1st Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel2: { uri: 'spell:slot:2', name: '2nd Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel3: { uri: 'spell:slot:3', name: '3rd Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel4: { uri: 'spell:slot:4', name: '4th Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel5: { uri: 'spell:slot:5', name: '5th Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel6: { uri: 'spell:slot:6', name: '6th Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel7: { uri: 'spell:slot:7', name: '7th Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel8: { uri: 'spell:slot:8', name: '8th Level Spell Slots', type: PropertyType.Charges },
    SpellSlotLevel9: { uri: 'spell:slot:9', name: '9th Level Spell Slots', type: PropertyType.Charges }
});

/**
 * @type {Configuration & {
 *   Any: DiceRollSettings,
 *   STR: DiceRollSettings,
 *   DEX: DiceRollSettings,
 *   CON: DiceRollSettings,
 *   INT: DiceRollSettings,
 *   WIS: DiceRollSettings,
 *   CHA: DiceRollSettings,
 *   Proficiency: DiceRollSettings
 * }}
 */
export const AbilityCheck = new Configuration({
    Any: { uri: 'check', name: 'Any Ability Check', diceTags: [ 'check' ] },
    STR: { uri: 'check:str', name: 'Strength Check', diceTags: [ 'check', AbilityScore.STR.uri ] },
    DEX: { uri: 'check:dex', name: 'Dexterity Check', diceTags: [ 'check', AbilityScore.DEX.uri ] },
    CON: { uri: 'check:con', name: 'Constitution Check', diceTags: [ 'check', AbilityScore.CON.uri ] },
    INT: { uri: 'check:int', name: 'Intelligence Check', diceTags: [ 'check', AbilityScore.INT.uri ] },
    WIS: { uri: 'check:wis', name: 'Wisdom Check', diceTags: [ 'check', AbilityScore.WIS.uri ] },
    CHA: { uri: 'check:cha', name: 'Charisma Check', diceTags: [ 'check', AbilityScore.CHA.uri ] },
    Proficiency: { uri: 'check:pb', name: 'Proficiency Check', diceTags: [ 'check', AbilityScore.ProficiencyBonus.uri ] }
}, { type: PropertyType.Roll, rollType: RollType.AbilityCheck });

/**
 * @type {Configuration & {
 *   Any: DiceRollSettings,
 *   STR: DiceRollSettings,
 *   DEX: DiceRollSettings,
 *   CON: DiceRollSettings,
 *   INT: DiceRollSettings,
 *   WIS: DiceRollSettings,
 *   CHA: DiceRollSettings,
 *   Death: DiceRollSettings
 * }}
 */
export const SavingThrow = new Configuration({
    Any: { uri: 'save', name: 'Any Saving Throw', diceTags: [ 'save' ] },
    STR: { uri: 'save:str', name: 'Strength Saving Throw', diceTags: [ 'save', AbilityScore.STR.uri ] },
    DEX: { uri: 'save:dex', name: 'Dexterity Saving Throw', diceTags: [ 'save', AbilityScore.DEX.uri ] },
    CON: { uri: 'save:con', name: 'Constitution Saving Throw', diceTags: [ 'save', AbilityScore.CON.uri ] },
    INT: { uri: 'save:int', name: 'Intelligence Saving Throw', diceTags: [ 'save', AbilityScore.INT.uri ] },
    WIS: { uri: 'save:wis', name: 'Wisdom Saving Throw', diceTags: [ 'save', AbilityScore.WIS.uri ] },
    CHA: { uri: 'save:cha', name: 'Charisma Saving Throw', diceTags: [ 'save', AbilityScore.CHA.uri ] },
    Death: { uri: 'save:death', name: 'Death Saving Throw', diceTags: [ 'save:death' ] }
}, { type: PropertyType.Roll, rollType: RollType.SavingThrow });

/**
 * Defines how proficiency for saving throws can be applied
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Death: DiceModifierSettings
 * }}
 */
export const SaveProficiency = new Configuration({
    Any: { uri: 'proficiency:save', name: 'Any Save Proficiency', diceTags: SavingThrow.Any.diceTags },
    STR: { uri: 'proficiency:save:str', name: 'Strength Save Proficiency', diceTags: SavingThrow.STR.diceTags, playerExt: 'strength-saving-throws' },
    DEX: { uri: 'proficiency:save:dex', name: 'Dexterity Save Proficiency', diceTags: SavingThrow.DEX.diceTags, playerExt: 'dexterity-saving-throws' },
    CON: { uri: 'proficiency:save:con', name: 'Constitution Save Proficiency', diceTags: SavingThrow.CON.diceTags, playerExt: 'constitution-saving-throws' },
    INT: { uri: 'proficiency:save:int', name: 'Intelligence Save Proficiency', diceTags: SavingThrow.INT.diceTags, playerExt: 'intelligence-saving-throws' },
    WIS: { uri: 'proficiency:save:wis', name: 'Wisdom Save Proficiency', diceTags: SavingThrow.WIS.diceTags, playerExt: 'wisdom-saving-throws' },
    CHA: { uri: 'proficiency:save:cha', name: 'Charisma Save Proficiency', diceTags: SavingThrow.CHA.diceTags, playerExt: 'charisma-saving-throws' },
    Death: { uri: 'proficiency:save:death', name: 'Death Save Proficiency', diceTags: SavingThrow.Death.diceTags }
}, { type: PropertyType.Proficiency });

/**
 * Defines how saving throws can acquire advantage
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Death: DiceModifierSettings
 * }}
 */
export const SaveAdvantage = new Configuration({
    Any: { uri: 'advantage:save', name: 'Any Save Resistance', diceTags: SavingThrow.Any.diceTags },
    STR: { uri: 'advantage:save:str', name: 'Strength Save Resistance', diceTags: SavingThrow.STR.diceTags, playerExt: 'strength-saving-throws' },
    DEX: { uri: 'advantage:save:dex', name: 'Dexterity Save Resistance', diceTags: SavingThrow.DEX.diceTags, playerExt: 'dexterity-saving-throws' },
    CON: { uri: 'advantage:save:con', name: 'Constitution Save Resistance', diceTags: SavingThrow.CON.diceTags, playerExt: 'constitution-saving-throws' },
    INT: { uri: 'advantage:save:int', name: 'Intelligence Save Resistance', diceTags: SavingThrow.INT.diceTags, playerExt: 'intelligence-saving-throws' },
    WIS: { uri: 'advantage:save:wis', name: 'Wisdom Save Resistance', diceTags: SavingThrow.WIS.diceTags, playerExt: 'wisdom-saving-throws' },
    CHA: { uri: 'advantage:save:cha', name: 'Charisma Save Resistance', diceTags: SavingThrow.CHA.diceTags, playerExt: 'charisma-saving-throws' },
    Death: { uri: 'advantage:save:death', name: 'Death Save Resistance', diceTags: SavingThrow.Death.diceTags }
}, { type: PropertyType.Advantage });

/**
 * Defines how flat bonuses for saving throws can be applied
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Death: DiceModifierSettings
 * }}
 */
export const SaveBonus = new Configuration({
    Any: { uri: 'bonus:save', name: 'Any Save Bonus', diceTags: SavingThrow.Any.diceTags },
    STR: { uri: 'bonus:save:str', name: 'Strength Save Bonus', diceTags: SavingThrow.STR.diceTags, playerExt: 'strength-saving-throws' },
    DEX: { uri: 'bonus:save:dex', name: 'Dexterity Save Bonus', diceTags: SavingThrow.DEX.diceTags, playerExt: 'dexterity-saving-throws' },
    CON: { uri: 'bonus:save:con', name: 'Constitution Save Bonus', diceTags: SavingThrow.CON.diceTags, playerExt: 'constitution-saving-throws' },
    INT: { uri: 'bonus:save:int', name: 'Intelligence Save Bonus', diceTags: SavingThrow.INT.diceTags, playerExt: 'intellegence-saving-throws' },
    WIS: { uri: 'bonus:save:wis', name: 'Wisdom Save Bonus', diceTags: SavingThrow.WIS.diceTags, playerExt: 'wisdom-saving-throws' },
    CHA: { uri: 'bonus:save:cha', name: 'Charisma Save Bonus', diceTags: SavingThrow.CHA.diceTags, playerExt: 'charisma-saving-throws' },
    Death: { uri: 'bonus:save:death', name: 'Death Save Bonus', diceTags: SavingThrow.Death.diceTags }
}, { type: PropertyType.Number });

/**
 * Proficiency and critical are omitted from this configuration because skill checks follow the default which is true.
 * @type {Configuration & {
 *   Any: SkillCheckSettings,
 *   STR: SkillCheckSettings,
 *   DEX: SkillCheckSettings,
 *   CON: SkillCheckSettings,
 *   WIS: SkillCheckSettings,
 *   INT: SkillCheckSettings,
 *   CHA: SkillCheckSettings,
 *   Acrobatics: SkillCheckSettings,
 *   AnimalHandling: SkillCheckSettings,
 *   Arcana: SkillCheckSettings,
 *   Athletics: SkillCheckSettings,
 *   Deception: SkillCheckSettings,
 *   History: SkillCheckSettings,
 *   Insight: SkillCheckSettings,
 *   Intimidation: SkillCheckSettings,
 *   Investigation: SkillCheckSettings,
 *   Medicine: SkillCheckSettings,
 *   Nature: SkillCheckSettings,
 *   Perception: SkillCheckSettings,
 *   Performance: SkillCheckSettings,
 *   Persuasion: SkillCheckSettings,
 *   Religion: SkillCheckSettings,
 *   SleightOfHand: SkillCheckSettings,
 *   Stealth: SkillCheckSettings,
 *   Survival: SkillCheckSettings
 * }}
 */
export const SkillCheck = new Configuration({
    Any: { uri: 'skill', name: 'Any Skill Check', diceTags: [ 'skill' ] },

    STR: { uri: 'skill:str', name: 'Strength Skill Check', ability: AbilityScore.STR, diceTags: [ 'skill', AbilityScore.STR.uri ] },
    DEX: { uri: 'skill:dex', name: 'Dexterity Skill Check', ability: AbilityScore.DEX, diceTags: [ 'skill', AbilityScore.DEX.uri ] },
    CON: { uri: 'skill:con', name: 'Constitution Skill Check', ability: AbilityScore.CON, diceTags: [ 'skill', AbilityScore.CON.uri ] },
    WIS: { uri: 'skill:wis', name: 'Wisdom Skill Check', ability: AbilityScore.WIS, diceTags: [ 'skill', AbilityScore.WIS.uri ] },
    INT: { uri: 'skill:int', name: 'Intellegence Skill Check', ability: AbilityScore.INT, diceTags: [ 'skill', AbilityScore.INT.uri ] },
    CHA: { uri: 'skill:cha', name: 'Charisma Skill Check', ability: AbilityScore.CHA, diceTags: [ 'skill', AbilityScore.CHA.uri ] },

    Acrobatics: { uri: 'skill:acrobatics', name: 'Acrobatics', ability: AbilityScore.DEX, diceTags: [ 'skill:acrobatics' ] },
    AnimalHandling: { uri: 'skill:animal_handling', name: 'Animal Handling', ability: AbilityScore.WIS, diceTags: [ 'skill:animal_handling' ] },
    Arcana: { uri: 'skill:arcana', name: 'Arcana', ability: AbilityScore.INT, diceTags: [ 'skill:arcana' ] },
    Athletics: { uri: 'skill:athletics', name: 'Athletics', ability: AbilityScore.STR, diceTags: [ 'skill:athletics' ] },
    Deception: { uri: 'skill:deception', name: 'Deception', ability: AbilityScore.CHA, diceTags: [ 'skill:deception' ] },
    History: { uri: 'skill:history', name: 'History', ability: AbilityScore.INT, diceTags: [ 'skill:history' ] },
    Insight: { uri: 'skill:insight', name: 'Insight', ability: AbilityScore.WIS, diceTags: [ 'skill:insight' ] },
    Intimidation: { uri: 'skill:intimidation', name: 'Intimidation', ability: AbilityScore.CHA, diceTags: [ 'skill:intimidation' ] },
    Investigation: { uri: 'skill:investigation', name: 'Investigation', ability: AbilityScore.INT, diceTags: [ 'skill:investigation' ] },
    Medicine: { uri: 'skill:medicine', name: 'Medicine', ability: AbilityScore.WIS, diceTags: [ 'skill:medicine' ] },
    Nature: { uri: 'skill:nature', name: 'Nature', ability: AbilityScore.INT, diceTags: [ 'skill:nature' ] },
    Perception: { uri: 'skill:perception', name: 'Perception', ability: AbilityScore.WIS, diceTags: [ 'skill:perception' ] },
    Performance: { uri: 'skill:performance', name: 'Performance', ability: AbilityScore.CHA, diceTags: [ 'skill:performance' ] },
    Persuasion: { uri: 'skill:persuasion', name: 'Persuasion', ability: AbilityScore.CHA, diceTags: [ 'skill:persuasion' ] },
    Religion: { uri: 'skill:religion', name: 'Religion', ability: AbilityScore.INT, diceTags: [ 'skill:religion' ] },
    SleightOfHand: { uri: 'skill:sleight_of_hand', name: 'Sleight of Hand', ability: AbilityScore.DEX, diceTags: [ 'skill:sleight_of_hand' ] },
    Stealth: { uri: 'skill:stealth', name: 'Stealth', ability: AbilityScore.DEX, diceTags: [ 'skill:stealth' ] },
    Survival: { uri: 'skill:survival', name: 'Survival', ability: AbilityScore.WIS, diceTags: [ 'skill:survival' ] }
}, { type: PropertyType.Roll, rollType: RollType.SkillCheck });

/**
 * Defines how proficiency for skill checks can be applied
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Acrobatics: DiceModifierSettings,
 *   AnimalHandling: DiceModifierSettings,
 *   Arcana: DiceModifierSettings,
 *   Athletics: DiceModifierSettings,
 *   Deception: DiceModifierSettings,
 *   History: DiceModifierSettings,
 *   Insight: DiceModifierSettings,
 *   Intimidation: DiceModifierSettings,
 *   Investigation: DiceModifierSettings,
 *   Medicine: DiceModifierSettings,
 *   Nature: DiceModifierSettings,
 *   Perception: DiceModifierSettings,
 *   Performance: DiceModifierSettings,
 *   Persuasion: DiceModifierSettings,
 *   Religion: DiceModifierSettings,
 *   SleightOfHand: DiceModifierSettings,
 *   Stealth: DiceModifierSettings,
 *   Survival: DiceModifierSettings
 * }}
 */
export const SkillProficiency = new Configuration({
    Any: { uri: 'proficiency:skill', name: 'Any Skill Proficiency', diceTags: SkillCheck.Any.diceTags },

    STR: { uri: 'proficiency:skill:str', name: 'Strength Skill Proficiency', diceTags: SkillCheck.STR.diceTags },
    DEX: { uri: 'proficiency:skill:dex', name: 'Dexterity Skill Proficiency', diceTags: SkillCheck.DEX.diceTags },
    CON: { uri: 'proficiency:skill:con', name: 'Constitution Skill Proficiency', diceTags: SkillCheck.CON.diceTags },
    WIS: { uri: 'proficiency:skill:wis', name: 'Wisdom Skill Proficiency', diceTags: SkillCheck.WIS.diceTags },
    INT: { uri: 'proficiency:skill:int', name: 'Intellegence Skill Proficiency', diceTags: SkillCheck.INT.diceTags },
    CHA: { uri: 'proficiency:skill:cha', name: 'Charisma Skill Proficiency', diceTags: SkillCheck.CHA.diceTags },

    Acrobatics: { uri: 'proficiency:skill:acrobatics', name: 'Acrobatics Proficiency', diceTags: SkillCheck.Acrobatics.diceTags, open5e: 'acrobatics', dndBeyond: 3, player: 'acrobatics' },
    AnimalHandling: { uri: 'proficiency:skill:animal_handling', name: 'Animal Handling Proficiency', diceTags: SkillCheck.AnimalHandling.diceTags, open5e: 'animal_handling', dndBeyond: 11, player: 'animal handling' },
    Arcana: { uri: 'proficiency:skill:arcana', name: 'Arcana Proficiency', diceTags: SkillCheck.Arcana.diceTags, open5e: 'arcana', dndBeyond: 6, player: 'arcana' },
    Athletics: { uri: 'proficiency:skill:athletics', name: 'Athletics Proficiency', diceTags: SkillCheck.Athletics.diceTags, open5e: 'athletics', dndBeyond: 2, player: 'athletics' },
    Deception: { uri: 'proficiency:skill:deception', name: 'Deception Proficiency', diceTags: SkillCheck.Deception.diceTags, open5e: 'deception', dndBeyond: 16, player: 'deception' },
    History: { uri: 'proficiency:skill:history', name: 'History Proficiency', diceTags: SkillCheck.History.diceTags, open5e: 'history', dndBeyond: 7, player: 'history' },
    Insight: { uri: 'proficiency:skill:insight', name: 'Insight Proficiency', diceTags: SkillCheck.Insight.diceTags, open5e: 'insight', dndBeyond: 12, player: 'insight' },
    Intimidation: { uri: 'proficiency:skill:intimidation', name: 'Intimidation Proficiency', diceTags: SkillCheck.Intimidation.diceTags, open5e: 'intimidation', dndBeyond: 17, player: 'intimidation' },
    Investigation: { uri: 'proficiency:skill:investigation', name: 'Investigation Proficiency', diceTags: SkillCheck.Investigation.diceTags, open5e: 'investigation', dndBeyond: 8, player: 'investigation' },
    Medicine: { uri: 'proficiency:skill:medicine', name: 'Medicine Proficiency', diceTags: SkillCheck.Medicine.diceTags, open5e: 'medicine', dndBeyond: 13, player: 'medicine' },
    Nature: { uri: 'proficiency:skill:nature', name: 'Nature Proficiency', diceTags: SkillCheck.Nature.diceTags, open5e: 'nature', dndBeyond: 9, player: 'nature' },
    Perception: { uri: 'proficiency:skill:perception', name: 'Perception Proficiency', diceTags: SkillCheck.Perception.diceTags, open5e: 'perception', dndBeyond: 14, player: 'perception' },
    Performance: { uri: 'proficiency:skill:performance', name: 'Performance Proficiency', diceTags: SkillCheck.Performance.diceTags, open5e: 'performance', dndBeyond: 18, player: 'performance' },
    Persuasion: { uri: 'proficiency:skill:persuasion', name: 'Persuasion Proficiency', diceTags: SkillCheck.Persuasion.diceTags, open5e: 'persuasion', dndBeyond: 19, player: 'persuasion' },
    Religion: { uri: 'proficiency:skill:religion', name: 'Religion Proficiency', diceTags: SkillCheck.Religion.diceTags, open5e: 'religion', dndBeyond: 10, player: 'religion' },
    SleightOfHand: { uri: 'proficiency:skill:sleight_of_hand', name: 'Sleight of Hand Proficiency', diceTags: SkillCheck.SleightOfHand.diceTags, open5e: 'sleight_of_hand', dndBeyond: 4, player: 'sleight of hand' },
    Stealth: { uri: 'proficiency:skill:stealth', name: 'Stealth Proficiency', diceTags: SkillCheck.Stealth.diceTags, open5e: 'stealth', dndBeyond: 5, player: 'stealth' },
    Survival: { uri: 'proficiency:skill:survival', name: 'Survival Proficiency', diceTags: SkillCheck.Survival.diceTags, open5e: 'survival', dndBeyond: 15, player: 'survival' }
}, { type: PropertyType.Proficiency });

/**
 * Defines how advantage for skill checks can be applied
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Acrobatics: DiceModifierSettings,
 *   AnimalHandling: DiceModifierSettings,
 *   Arcana: DiceModifierSettings,
 *   Athletics: DiceModifierSettings,
 *   Deception: DiceModifierSettings,
 *   History: DiceModifierSettings,
 *   Insight: DiceModifierSettings,
 *   Intimidation: DiceModifierSettings,
 *   Investigation: DiceModifierSettings,
 *   Medicine: DiceModifierSettings,
 *   Nature: DiceModifierSettings,
 *   Perception: DiceModifierSettings,
 *   Performance: DiceModifierSettings,
 *   Persuasion: DiceModifierSettings,
 *   Religion: DiceModifierSettings,
 *   SleightOfHand: DiceModifierSettings,
 *   Stealth: DiceModifierSettings,
 *   Survival: DiceModifierSettings
 * }}
 */
export const SkillAdvantage = new Configuration({
    Any: { uri: 'advantage:skill', name: 'Any Skill Advantage', diceTags: SkillCheck.Any.diceTags },

    STR: { uri: 'advantage:skill:str', name: 'Strength Skill Advantage', diceTags: SkillCheck.STR.diceTags },
    DEX: { uri: 'advantage:skill:dex', name: 'Dexterity Skill Advantage', diceTags: SkillCheck.DEX.diceTags },
    CON: { uri: 'advantage:skill:con', name: 'Constitution Skill Advantage', diceTags: SkillCheck.CON.diceTags },
    WIS: { uri: 'advantage:skill:wis', name: 'Wisdom Skill Advantage', diceTags: SkillCheck.WIS.diceTags },
    INT: { uri: 'advantage:skill:int', name: 'Intellegence Skill Advantage', diceTags: SkillCheck.INT.diceTags },
    CHA: { uri: 'advantage:skill:cha', name: 'Charisma Skill Advantage', diceTags: SkillCheck.CHA.diceTags },

    Acrobatics: { uri: 'advantage:skill:acrobatics', name: 'Acrobatics Advantage', diceTags: SkillCheck.Acrobatics.diceTags },
    AnimalHandling: { uri: 'advantage:skill:animal_handling', name: 'Animal Handling Advantage', diceTags: SkillCheck.AnimalHandling.diceTags },
    Arcana: { uri: 'advantage:skill:arcana', name: 'Arcana Advantage', diceTags: SkillCheck.Arcana.diceTags },
    Athletics: { uri: 'advantage:skill:athletics', name: 'Athletics Advantage', diceTags: SkillCheck.Athletics.diceTags },
    Deception: { uri: 'advantage:skill:deception', name: 'Deception Advantage', diceTags: SkillCheck.Deception.diceTags },
    History: { uri: 'advantage:skill:history', name: 'History Advantage', diceTags: SkillCheck.History.diceTags },
    Insight: { uri: 'advantage:skill:insight', name: 'Insight Advantage', diceTags: SkillCheck.Insight.diceTags },
    Intimidation: { uri: 'advantage:skill:intimidation', name: 'Intimidation Advantage', diceTags: SkillCheck.Intimidation.diceTags },
    Investigation: { uri: 'advantage:skill:investigation', name: 'Investigation Advantage', diceTags: SkillCheck.Investigation.diceTags },
    Medicine: { uri: 'advantage:skill:medicine', name: 'Medicine Advantage', diceTags: SkillCheck.Medicine.diceTags },
    Nature: { uri: 'advantage:skill:nature', name: 'Nature Advantage', diceTags: SkillCheck.Nature.diceTags },
    Perception: { uri: 'advantage:skill:perception', name: 'Perception Advantage', diceTags: SkillCheck.Perception.diceTags },
    Performance: { uri: 'advantage:skill:performance', name: 'Performance Advantage', diceTags: SkillCheck.Performance.diceTags },
    Persuasion: { uri: 'advantage:skill:persuasion', name: 'Persuasion Advantage', diceTags: SkillCheck.Persuasion.diceTags },
    Religion: { uri: 'advantage:skill:religion', name: 'Religion Advantage', diceTags: SkillCheck.Religion.diceTags },
    SleightOfHand: { uri: 'advantage:skill:sleight_of_hand', name: 'Sleight of Hand Advantage', diceTags: SkillCheck.SleightOfHand.diceTags },
    Stealth: { uri: 'advantage:skill:stealth', name: 'Stealth Advantage', diceTags: SkillCheck.Stealth.diceTags },
    Survival: { uri: 'advantage:skill:survival', name: 'Survival Advantage', diceTags: SkillCheck.Survival.diceTags }
}, { type: PropertyType.Advantage });


/**
 * Defines how bonuses for skill checks can be applied
 * @type {Configuration & {
 *   Any: DiceModifierSettings,
 *   STR: DiceModifierSettings,
 *   DEX: DiceModifierSettings,
 *   CON: DiceModifierSettings,
 *   WIS: DiceModifierSettings,
 *   INT: DiceModifierSettings,
 *   CHA: DiceModifierSettings,
 *   Acrobatics: DiceModifierSettings,
 *   AnimalHandling: DiceModifierSettings,
 *   Arcana: DiceModifierSettings,
 *   Athletics: DiceModifierSettings,
 *   Deception: DiceModifierSettings,
 *   History: DiceModifierSettings,
 *   Insight: DiceModifierSettings,
 *   Intimidation: DiceModifierSettings,
 *   Investigation: DiceModifierSettings,
 *   Medicine: DiceModifierSettings,
 *   Nature: DiceModifierSettings,
 *   Perception: DiceModifierSettings,
 *   Performance: DiceModifierSettings,
 *   Persuasion: DiceModifierSettings,
 *   Religion: DiceModifierSettings,
 *   SleightOfHand: DiceModifierSettings,
 *   Stealth: DiceModifierSettings,
 *   Survival: DiceModifierSettings
 * }}
 */
export const SkillBonus = new Configuration({
    Any: { uri: 'bonus:skill', name: 'Any Skill Bonus', diceTags: SkillCheck.Any.diceTags },

    STR: { uri: 'bonus:skill:str', name: 'Strength Skill Bonus', diceTags: SkillCheck.STR.diceTags },
    DEX: { uri: 'bonus:skill:dex', name: 'Dexterity Skill Bonus', diceTags: SkillCheck.DEX.diceTags },
    CON: { uri: 'bonus:skill:con', name: 'Constitution Skill Bonus', diceTags: SkillCheck.CON.diceTags },
    WIS: { uri: 'bonus:skill:wis', name: 'Wisdom Skill Bonus', diceTags: SkillCheck.WIS.diceTags },
    INT: { uri: 'bonus:skill:int', name: 'Intellegence Skill Bonus', diceTags: SkillCheck.INT.diceTags },
    CHA: { uri: 'bonus:skill:cha', name: 'Charisma Skill Bonus', diceTags: SkillCheck.CHA.diceTags },

    Acrobatics: { uri: 'bonus:skill:acrobatics', name: 'Acrobatics Bonus', diceTags: SkillCheck.Acrobatics.diceTags },
    AnimalHandling: { uri: 'bonus:skill:animal_handling', name: 'Animal Handling Bonus', diceTags: SkillCheck.AnimalHandling.diceTags },
    Arcana: { uri: 'bonus:skill:arcana', name: 'Arcana Bonus', diceTags: SkillCheck.Arcana.diceTags },
    Athletics: { uri: 'bonus:skill:athletics', name: 'Athletics Bonus', diceTags: SkillCheck.Athletics.diceTags },
    Deception: { uri: 'bonus:skill:deception', name: 'Deception Bonus', diceTags: SkillCheck.Deception.diceTags },
    History: { uri: 'bonus:skill:history', name: 'History Bonus', diceTags: SkillCheck.History.diceTags },
    Insight: { uri: 'bonus:skill:insight', name: 'Insight Bonus', diceTags: SkillCheck.Insight.diceTags },
    Intimidation: { uri: 'bonus:skill:intimidation', name: 'Intimidation Bonus', diceTags: SkillCheck.Intimidation.diceTags },
    Investigation: { uri: 'bonus:skill:investigation', name: 'Investigation Bonus', diceTags: SkillCheck.Investigation.diceTags },
    Medicine: { uri: 'bonus:skill:medicine', name: 'Medicine Bonus', diceTags: SkillCheck.Medicine.diceTags },
    Nature: { uri: 'bonus:skill:nature', name: 'Nature Bonus', diceTags: SkillCheck.Nature.diceTags },
    Perception: { uri: 'bonus:skill:perception', name: 'Perception Bonus', diceTags: SkillCheck.Perception.diceTags },
    Performance: { uri: 'bonus:skill:performance', name: 'Performance Bonus', diceTags: SkillCheck.Performance.diceTags },
    Persuasion: { uri: 'bonus:skill:persuasion', name: 'Persuasion Bonus', diceTags: SkillCheck.Persuasion.diceTags },
    Religion: { uri: 'bonus:skill:religion', name: 'Religion Bonus', diceTags: SkillCheck.Religion.diceTags },
    SleightOfHand: { uri: 'bonus:skill:sleight_of_hand', name: 'Sleight of Hand Bonus', diceTags: SkillCheck.SleightOfHand.diceTags },
    Stealth: { uri: 'bonus:skill:stealth', name: 'Stealth Bonus', diceTags: SkillCheck.Stealth.diceTags },
    Survival: { uri: 'bonus:skill:survival', name: 'Survival Bonus', diceTags: SkillCheck.Survival.diceTags }
}, { type: PropertyType.Number });

/**
 * @type {Configuration & {
 *     Walk: ConfigurationSettings,
 *     Fly: ConfigurationSettings,
 *     Climb: ConfigurationSettings,
 *     Swim: ConfigurationSettings,
 *     Burrow: ConfigurationSettings,
 *     Hover: ConfigurationSettings
 * }}
 */
export const Speed = new Configuration({
    Walk: { uri: 'speed:walk', name: 'Walk', type: PropertyType.Number, open5e: 'walk' },
    Fly: { uri: 'speed:fly', name: 'Fly', type: PropertyType.Number, open5e: 'fly' },
    Climb: { uri: 'speed:climb', name: 'Climb', type: PropertyType.Number, open5e: 'climb' },
    Swim: { uri: 'speed:swim', name: 'Swim', type: PropertyType.Number, open5e: 'swim' },
    Burrow: { uri: 'speed:burrow', name: 'Burrow', type: PropertyType.Number, open5e: 'burrow' },
    Hover: { uri: 'speed:hover', name: 'Hover', type: PropertyType.Toggle, open5e: 'hover' }
});

/** @returns {{ [uri: string] : TypedConfigurationSettings }} */
function buildPropertyIndex() {
    /** @type {Configuration[]} */
    const review = [
        PropertyType, RollType, DiceType, ProficiencyType,
        ResistanceType, DamageType, AdvantageType,
        DamageResistance, ConditionType, ConditionResistance,
        AbilityScore, AbilityModifier, AbilityCheck,
        HitPoint, SpellTracking, AbilityConstraints, 
        SavingThrow, SaveProficiency, SaveAdvantage, SaveBonus,
        SkillCheck, SkillProficiency, SkillAdvantage, SkillBonus,
        Speed
    ];

    const index = {};
    for (const config of review) {
        for (const entry of config.list()) {
            if (entry.uri in index) {
                console.error(`Duplicate property definition encountered for ${entry.uri}`);
            }

            index[entry.uri] = entry;
        }
    }

    Object.freeze(index);
    return index;
}

/** Full index of all available configuration settings. */
export const ConfigurationIndex = buildPropertyIndex();