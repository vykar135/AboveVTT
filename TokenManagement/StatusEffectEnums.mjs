import { DiceType, SavingThrow, AbilityCheck, SkillCheck } from './CoreEnums.mjs'

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
    Damage: Object.freeze({ uri: 'effect:damage', name: 'Damage Target' }),
    Heal: Object.freeze({ uri: 'effect:heal', name: 'Heal Target' }),
    Heal: Object.freeze({ uri: 'effect:temp', name: 'Grant Temporary HP To Target' }),
    Modify: Object.freeze({ uri: 'effect:modify', name: 'Modify Property Of Target' })
});

/**
 * @readonly
 * @enum {string}
 */
export const CombatTrackingTrigger = Object.freeze({
    TurnStart: Object.freeze({ uri: 'on:turn:start', name: 'Start of Your Turn' }),
    TurnEnd: Object.freeze({ uri: 'on:turn:end', name: 'End of Your Turn' }),
    RoundStart: Object.freeze({ uri: 'on:round:start', name: 'Start of New Round' }),
    SourceStart: Object.freeze({ uri: 'on:source:start', name: 'Start of Effect Source\'s Turn' }),
    SourceEnd: Object.freeze({ uri: 'on:source:end', name: 'End of Effect Source\'s Turn' }),
    InitiativeStart: Object.freeze({ uri: 'on:initiative:start', name: 'Start of Initiative Order #' }),
    InitiativeEnd: Object.freeze({ uri: 'on:initiative:end', name: 'End of Initiative Order #' })
});

/**
 * @readonly
 * @enum {string}
 */
export const ActionBasedTrigger = Object.freeze({
    AnyAction: Object.freeze({ uri: 'on:action:any', name: 'On Any Action' }),
    Action: Object.freeze({ uri: 'on:action', name: 'On Standard Action' }),
    BonusAction: Object.freeze({ uri: 'on:action:bonus', name: 'On Bonus Action' }),
    Action: Object.freeze({ uri: 'on:spell', name: 'When Casting A Spell' }),
    Action: Object.freeze({ uri: 'on:attack:weapon', name: 'On Weapon Attack' }),
    Action: Object.freeze({ uri: 'on:attack:melee', name: 'On Melee Attack' }),
    Action: Object.freeze({ uri: 'on:attack:range', name: 'On Ranged Attack' }),
    Reaction: Object.freeze({ uri: 'on:reaction', name: 'On Reaction' }),
    Movement: Object.freeze({ uri: 'on:movement', name: 'On Any Movement' }),
    Movement: Object.freeze({ uri: 'on:movement:walk', name: 'When Walking' }),
    Movement: Object.freeze({ uri: 'on:movement:fly', name: 'When Flying' }),
    Movement: Object.freeze({ uri: 'on:movement:climb', name: 'When Climbing' }),
    Movement: Object.freeze({ uri: 'on:movement:swim', name: 'When Swimming' }),
    Movement: Object.freeze({ uri: 'on:movement:burrow', name: 'When Burrowing' })
});

/**
 * @readonly
 * @enum {string}
 */
export const EffectTrigger = Object.freeze({
    ...CombatTrackingTrigger,
    ...ActionBasedTrigger
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