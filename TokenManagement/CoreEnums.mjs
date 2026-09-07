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
                    ...common,
                    ...value
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
 * Performs a case-insensitive string comparison of a pair of property URIs.
 * @param {string} value - The URI being tested without case modification
 * @param {string} expected - The expected value of the URI; should already be in lower case
 * @returns {boolean}
 */
export function uriEquals(value, expected) {
    return (value != null && expected != null && value.toLowerCase() === expected)
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
 * Defines the types of damage that can be dealt to a token
 * @type {Configuration & {
 *   Magic: ConfigurationSettings,
 *   Physical: ConfigurationSettings,
 *   All: ConfigurationSettings,
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
    All: { uri: 'dmg:all', name: 'All Damage', srd: 'dmg:all', ddbResist: 53, ddbImmune: 89, ddbVuln: undefined },

    Bludgeoning: { uri: 'bludgeoning', name: 'Bludgeoning', ddbResist: 1, ddbImmune: 17, ddbVuln: 33 },
    Piercing: { uri: 'piercing', name: 'Piercing', ddbResist: 2, ddbImmune: 18, ddbVuln: 34 },
    Slashing: { uri: 'slashing', name: 'Slashing', ddbResist: 3, ddbImmune: 19, ddbVuln: 35 },
    Acid: { uri: 'acid', name: 'Acid', ddbResist: 11, ddbImmune: 27, ddbVuln: 43 },
    Cold: { uri: 'cold', name: 'Cold', ddbResist: 7, ddbImmune: 23, ddbVuln: 39 },
    Fire: { uri: 'fire', name: 'Fire', ddbResist: 9, ddbImmune: 25, ddbVuln: 41 },
    Force: { uri: 'force', name: 'Force', ddbResist: 47, ddbImmune: 48, ddbVuln: 49 },
    Lightning: { uri: 'lightning', name: 'Lightning', ddbResist: 4, ddbImmune: 20, ddbVuln: 36 },
    Necrotic: { uri: 'necrotic', name: 'Necrotic', ddbResist: 10, ddbImmune: 26, ddbVuln: 42 },
    Poison: { uri: 'poison', name: 'Poison', ddbResist: 6, ddbImmune: 22, ddbVuln: 38 },
    Psychic: { uri: 'psychic', name: 'Psychic', ddbResist: 12, ddbImmune: 28, ddbVuln: 44 },
    Radiant: { uri: 'radiant', name: 'Radiant', ddbResist: 8, ddbImmune: 24, ddbVuln: 40 },
    Thunder: { uri: 'thunder', name: 'Thunder', ddbResist: 5, ddbImmune: 21, ddbVuln: 37 }
});

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
    Blinded: { uri: 'blinded', name: 'Blinded', srd: "Blinded", dndBeyond: 1 },
    Charmed: { uri: 'charmed', name: 'Charmed', srd: "Charmed", dndBeyond: 2 },
    Deafened: { uri: 'deafened', name: 'Deafened', srd: "Deafened", dndBeyond: 3 },
    Exhaustion: { uri: 'exhaustion', name: 'Exhaustion', type: PropertyType.Number, min: 0, max: 11, srd: "Exhaustion", dndBeyond: 4 },
    Frightened: { uri: 'frightened', name: 'Frightened', srd: "Frightened", dndBeyond: 5 },
    Grappled: { uri: 'grappled', name: 'Grappled', srd: "Grappled", dndBeyond: 6 },
    Incapacitated: { uri: 'incapacitated', name: 'Incapacitated', incapacitates: true, srd: "Incapacitated", dndBeyond: 7 },
    Invisible: { uri: 'invisible', name: 'Invisible', srd: "Invisible", dndBeyond: 8 },
    Paralyzed: { uri: 'paralyzed', name: 'Paralyzed', incapacitates: true, srd: "Paralyzed", dndBeyond: 9 },
    Petrified: { uri: 'petrified', name: 'Petrified', incapacitates: true, srd: "Petrified", dndBeyond: 10 },
    Poisoned: { uri: 'poisoned', name: 'Poisoned', srd: "Poisoned", dndBeyond: 11 },
    Prone: { uri: 'prone', name: 'Prone', srd: "Prone", dndBeyond: 12 },
    Restrained: { uri: 'restrained', name: 'Restrained', srd: "Restrained", dndBeyond: 13 },
    Stunned: { uri: 'stunned', name: 'Stunned', incapacitates: true, srd: "Stunned", dndBeyond: 14 },
    Unconscious: { uri: 'unconscious', name: 'Unconscious', incapacitates: true, srd: "Unconscious", dndBeyond: 15 }
}, { type: PropertyType.Condition });

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
    STR: { uri: 'str', name: 'Strength Score', short: 'Strength', dndBeyond: 1, open5e: 'strength', playerSaveExt: 'strength-saving-throws' },
    DEX: { uri: 'dex', name: 'Dexterity Score', short: 'Dexterity', dndBeyond: 2, open5e: 'dexterity', playerSaveExt: 'dexterity-saving-throws' },
    CON: { uri: 'con', name: 'Constitution Score', short: 'Constitution', dndBeyond: 3, open5e: 'constitution', playerSaveExt: 'constitution-saving-throws' },
    INT: { uri: 'int', name: 'Intelligence Score', short: 'Intelligence', dndBeyond: 4, open5e: 'intelligence', playerSaveExt: 'intelligence-saving-throws' },
    WIS: { uri: 'wis', name: 'Wisdom Score', short: 'Wisdom', dndBeyond: 5, open5e: 'wisdom', playerSaveExt: 'wisdom-saving-throws' },
    CHA: { uri: 'cha', name: 'Charisma Score', short: 'Charisma', dndBeyond: 6, open5e: 'charisma', playerSaveExt: 'charisma-saving-throws' },
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
    STR: { uri: 'str:modifier', name: 'Strength Modifier' },
    DEX: { uri: 'dex:modifier', name: 'Dexterity Modifier' },
    CON: { uri: 'con:modifier', name: 'Constitution Modifier' },
    INT: { uri: 'int:modifier', name: 'Intelligence Modifier' },
    WIS: { uri: 'wis:modifier', name: 'Wisdom Modifier' },
    CHA: { uri: 'cha:modifier', name: 'Charisma Modifier' },
    Initiative: { uri: 'initiative', name: 'Initiative' }
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
    ActionLimit: { uri: 'action:limit', name: 'Actions' },
    BonusActionLimit: { uri: 'action:bonus:limit', name: 'Bonus Actions' },
    ReactionLimit: { uri: 'reaction:limit', name: 'Reactions' },
    WeaponAttackLimit: { uri: 'weapon:attack:limit', name: 'Weapon Attacks' }
}, { type: PropertyType.Charges });

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
    SpellSlotLevel1: { uri: 'spell:slot:1', name: '1st Level Spell Slots' },
    SpellSlotLevel2: { uri: 'spell:slot:2', name: '2nd Level Spell Slots' },
    SpellSlotLevel3: { uri: 'spell:slot:3', name: '3rd Level Spell Slots' },
    SpellSlotLevel4: { uri: 'spell:slot:4', name: '4th Level Spell Slots' },
    SpellSlotLevel5: { uri: 'spell:slot:5', name: '5th Level Spell Slots' },
    SpellSlotLevel6: { uri: 'spell:slot:6', name: '6th Level Spell Slots' },
    SpellSlotLevel7: { uri: 'spell:slot:7', name: '7th Level Spell Slots' },
    SpellSlotLevel8: { uri: 'spell:slot:8', name: '8th Level Spell Slots' },
    SpellSlotLevel9: { uri: 'spell:slot:9', name: '9th Level Spell Slots' }
}, { type: PropertyType.Charges });

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
    Any: { uri: 'any:check', name: 'Any Ability Check', diceTags: [ 'check' ] },
    STR: { uri: 'str:check', name: 'Strength Check', diceTags: [ 'check', AbilityScore.STR.uri ] },
    DEX: { uri: 'dex:check', name: 'Dexterity Check', diceTags: [ 'check', AbilityScore.DEX.uri ] },
    CON: { uri: 'con:check', name: 'Constitution Check', diceTags: [ 'check', AbilityScore.CON.uri ] },
    INT: { uri: 'int:check', name: 'Intelligence Check', diceTags: [ 'check', AbilityScore.INT.uri ] },
    WIS: { uri: 'wis:check', name: 'Wisdom Check', diceTags: [ 'check', AbilityScore.WIS.uri ] },
    CHA: { uri: 'cha:check', name: 'Charisma Check', diceTags: [ 'check', AbilityScore.CHA.uri ] }
}, { type: PropertyType.Roll });

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
    Any: { uri: 'any:save', name: 'Any Saving Throw', diceTags: [ 'save' ] },
    STR: { uri: 'str:save', name: 'Strength Saving Throw', diceTags: [ 'save', AbilityScore.STR.uri ] },
    DEX: { uri: 'dex:save', name: 'Dexterity Saving Throw', diceTags: [ 'save', AbilityScore.DEX.uri ] },
    CON: { uri: 'con:save', name: 'Constitution Saving Throw', diceTags: [ 'save', AbilityScore.CON.uri ] },
    INT: { uri: 'int:save', name: 'Intelligence Saving Throw', diceTags: [ 'save', AbilityScore.INT.uri ] },
    WIS: { uri: 'wis:save', name: 'Wisdom Saving Throw', diceTags: [ 'save', AbilityScore.WIS.uri ] },
    CHA: { uri: 'cha:save', name: 'Charisma Saving Throw', diceTags: [ 'save', AbilityScore.CHA.uri ] },
    Death: { uri: 'death:save', name: 'Death Saving Throw', diceTags: [ 'save', 'death' ] }
}, { type: PropertyType.Roll });

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
    Any: { uri: 'any:skill', name: 'Any Skill Check', diceTags: [ 'skill' ] },

    STR: { uri: 'str:skill', name: 'Strength Skill Check', diceTags: [ 'skill', AbilityScore.STR.uri ] },
    DEX: { uri: 'dex:skill', name: 'Dexterity Skill Check', diceTags: [ 'skill', AbilityScore.DEX.uri ] },
    CON: { uri: 'con:skill', name: 'Constitution Skill Check', diceTags: [ 'skill', AbilityScore.CON.uri ] },
    WIS: { uri: 'wis:skill', name: 'Wisdom Skill Check', diceTags: [ 'skill', AbilityScore.WIS.uri ] },
    INT: { uri: 'int:skill', name: 'Intellegence Skill Check', diceTags: [ 'skill', AbilityScore.INT.uri ] },
    CHA: { uri: 'cha:skill', name: 'Charisma Skill Check', diceTags: [ 'skill', AbilityScore.CHA.uri ] },

    Acrobatics: { uri: 'acrobatics', name: 'Acrobatics', diceTags: [ 'skill', 'acrobatics' ], open5e: 'acrobatics', dndBeyond: 3, player: 'acrobatics' },
    AnimalHandling: { uri: 'animal_handling', name: 'Animal Handling', diceTags: [ 'skill', 'animal_handling' ], open5e: 'animal_handling', dndBeyond: 11, player: 'animal handling' },
    Arcana: { uri: 'arcana', name: 'Arcana', diceTags: [ 'skill', 'arcana' ], open5e: 'arcana', dndBeyond: 6, player: 'arcana' },
    Athletics: { uri: 'athletics', name: 'Athletics', diceTags: [ 'skill', 'athletics' ], open5e: 'athletics', dndBeyond: 2, player: 'athletics' },
    Deception: { uri: 'deception', name: 'Deception', diceTags: [ 'skill', 'deception' ], open5e: 'deception', dndBeyond: 16, player: 'deception' },
    History: { uri: 'history', name: 'History', diceTags: [ 'skill', 'history' ], open5e: 'history', dndBeyond: 7, player: 'history' },
    Insight: { uri: 'insight', name: 'Insight', diceTags: [ 'skill', 'insight' ], open5e: 'insight', dndBeyond: 12, player: 'insight' },
    Intimidation: { uri: 'intimidation', name: 'Intimidation', diceTags: [ 'skill', 'intimidation' ], open5e: 'intimidation', dndBeyond: 17, player: 'intimidation' },
    Investigation: { uri: 'investigation', name: 'Investigation', diceTags: [ 'skill', 'investigation' ], open5e: 'investigation', dndBeyond: 8, player: 'investigation' },
    Medicine: { uri: 'medicine', name: 'Medicine', diceTags: [ 'skill', 'medicine' ], open5e: 'medicine', dndBeyond: 13, player: 'medicine' },
    Nature: { uri: 'nature', name: 'Nature', diceTags: [ 'skill', 'nature' ], open5e: 'nature', dndBeyond: 9, player: 'nature' },
    Perception: { uri: 'perception', name: 'Perception', diceTags: [ 'skill', 'perception' ], open5e: 'perception', dndBeyond: 14, player: 'perception' },
    Performance: { uri: 'performance', name: 'Performance', diceTags: [ 'skill', 'performance' ], open5e: 'performance', dndBeyond: 18, player: 'performance' },
    Persuasion: { uri: 'persuasion', name: 'Persuasion', diceTags: [ 'skill', 'persuasion' ], open5e: 'persuasion', dndBeyond: 19, player: 'persuasion' },
    Religion: { uri: 'religion', name: 'Religion', diceTags: [ 'skill', 'religion' ], open5e: 'religion', dndBeyond: 10, player: 'religion' },
    SleightOfHand: { uri: 'sleight_of_hand', name: 'Sleight of Hand', diceTags: [ 'skill', 'sleight_of_hand' ], open5e: 'sleight_of_hand', dndBeyond: 4, player: 'sleight of hand' },
    Stealth: { uri: 'stealth', name: 'Stealth', diceTags: [ 'skill', 'stealth' ], open5e: 'stealth', dndBeyond: 5, player: 'stealth' },
    Survival: { uri: 'survival', name: 'Survival', diceTags: [ 'skill', 'survival' ], open5e: 'survival', dndBeyond: 15, player: 'survival' }
}, { type: PropertyType.Roll });

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
    Walk: { uri: 'speed:walk', name: 'Walk', open5e: 'walk' },
    Fly: { uri: 'speed:fly', name: 'Fly', open5e: 'fly' },
    Climb: { uri: 'speed:climb', name: 'Climb', open5e: 'climb' },
    Swim: { uri: 'speed:swim', name: 'Swim', open5e: 'swim' },
    Burrow: { uri: 'speed:burrow', name: 'Burrow', open5e: 'burrow' },
    Hover: { uri: 'speed:hover', name: 'Hover', type: PropertyType.Toggle, open5e: 'hover' }
}, { type: PropertyType.Number });

/** @returns {{ [uri: string] : TypedConfigurationSettings }} */
function buildPropertyIndex() {
    /** @type {Configuration[]} */
    const review = [
        PropertyType, RollType, DiceType, ProficiencyType,
        DamageType, ConditionType,
        AbilityScore, AbilityModifier, AbilityCheck,
        HitPoint, SpellTracking, AbilityConstraints, 
        SavingThrow, SkillCheck, Speed
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