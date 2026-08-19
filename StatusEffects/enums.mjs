import { DiceType, SavingThrow, AbilityCheck, SkillCheck } from '../CoreEnums.mjs'

/**
 * @typedef {Object} EnumWithName
 * @property {string} uri - The system identifier for the enumeration value
 * @property {string} name - The friendly name of the enumeration value
 */

/**
 * @readonly
 * @enum {string}
 */
export const EffectImpact = Object.freeze({
    AttackAny: Object.freeze({ uri: 'hit', name: 'Any Attack' }),
    MeleeAttack: Object.freeze({ uri: 'hit:attack', name: 'Melee Attack' }),
    SpellAttack: Object.freeze({ uri: 'hit:spell', name: 'Spell Attack' }),
    AbilityCheck: Object.freeze({ uri: 'ability', name: 'Ability Check' }),
    SkillCheck: Object.freeze({ uri: 'skill', name: 'Skill Check' }),
    Damage: Object.freeze({ uri: 'damage', name: 'Damage Dealt' }),
    Heal: Object.freeze({ uri: 'heal', name: 'Healing Applied' }),
    Modifier: Object.freeze({ uri: 'modifier', name: 'Sheet Modifier' })
});

/**
 * @readonly
 * @enum {string}
 */
export const ResolutionTrigger = Object.freeze({
    TurnStart: Object.freeze({ uri: 'turn:start', name: 'Start of Your Turn' }),
    TurnEnd: Object.freeze({ uri: 'turn:end', name: 'End of Your Turn' }),
    RoundStart: Object.freeze({ uri: 'round:start', name: 'Start of New Round' }),
    SourceStart: Object.freeze({ uri: 'source:start', name: 'Start of Effect Source\'s Turn' }),
    SourceEnd: Object.freeze({ uri: 'source:end', name: 'End of Effect Source\'s Turn' }),
    InitiativeStart: Object.freeze({ uri: 'initiative:start', name: 'Start of Initiative Order #' }),
    InitiativeEnd: Object.freeze({ uri: 'initiative:end', name: 'End of Initiative Order #' })
});

/**
 * @readonly
 * @enum {string}
 */
export const ImpactTrigger = Object.freeze({
    ...ResolutionTrigger,
    Movement: Object.freeze({ uri: 'movement', name: 'While Moving' }),
    AnyAction: Object.freeze({ uri: 'action:any', name: 'On Any Action' }),
    Action: Object.freeze({ uri: 'action', name: 'On Standard Action' }),
    BonusAction: Object.freeze({ uri: 'action:bonus', name: 'On Bonus Action' }),
    Reaction: Object.freeze({ uri: 'reaction', name: 'On Reaction' })
});

/**
 * @readonly
 * @enum {string}
 */
export const EffectResolution = Object.freeze({
    Dice: DiceType,
    Save: SavingThrow,
    Check: AbilityCheck,
    Skill: SkillCheck
});