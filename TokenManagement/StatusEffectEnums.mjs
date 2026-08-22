import { DiceType, SavingThrow, AbilityCheck, SkillCheck } from './CoreEnums.mjs'

/**
 * @typedef {Object} EnumWithName
 * @property {string} uri - The system identifier for the enumeration value
 * @property {string} name - The friendly name of the enumeration value
 */

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const EffectImpact = Object.freeze({
    Damage: Object.freeze({ uri: 'effect:damage', name: 'Damage Target' }),
    Heal: Object.freeze({ uri: 'effect:heal', name: 'Heal Target' }),
    TempHP: Object.freeze({ uri: 'effect:temp', name: 'Grant Temporary HP To Target' }),
    Modify: Object.freeze({ uri: 'effect:modify', name: 'Modify Property Of Target' })
});


/**
 * @readonly
 * @enum {EnumWithName}
 */
export const EffectDuration = Object.freeze({
    Indefinite: Object.freeze({ uri: 'indefinite', name: 'Until Cancelled' }),
    TurnsStarted: Object.freeze({ uri: 'turn:start', name: 'Turns Started' }),
    TurnsEnded: Object.freeze({ uri: 'turn:end', name: 'Turns Ended' }),
    Rounds: Object.freeze({ uri: 'round:start', name: 'Rounds Started' }),
    ShortRest: Object.freeze({ uri: 'rest:short', name: 'On Short Rest' }),
    LongRest: Object.freeze({ uri: 'rest:long', name: 'On Long Rest' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const InitiativeTrigger = Object.freeze({
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
 * @enum {EnumWithName}
 */
export const ActionTrigger = Object.freeze({
    Any: Object.freeze({ uri: 'on:action', name: 'On Any Action' }),
    Standard: Object.freeze({ uri: 'on:action:standard', name: 'On Action' }),
    Bonus: Object.freeze({ uri: 'on:action:bonus', name: 'On Bonus Action' }),
    Reaction: Object.freeze({ uri: 'on:reaction', name: 'On Reaction' }),
    SpellCast: Object.freeze({ uri: 'on:spell', name: 'When Casting A Spell' }),
    WeaponAttack: Object.freeze({ uri: 'on:attack:weapon', name: 'On Weapon Attack' }),
    MeleeAttack: Object.freeze({ uri: 'on:attack:melee', name: 'On Melee Attack' }),
    RangedAttack: Object.freeze({ uri: 'on:attack:range', name: 'On Ranged Attack' }),
    ChargesUsed: Object.freeze({ uri: 'on:charges:used', name: 'On Charges Use' }),
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const MovementTrigger = Object.freeze({
    Any: Object.freeze({ uri: 'on:movement', name: 'On Any Movement' }),
    Walk: Object.freeze({ uri: 'on:movement:walk', name: 'When Walking' }),
    Fly: Object.freeze({ uri: 'on:movement:fly', name: 'When Flying' }),
    Climb: Object.freeze({ uri: 'on:movement:climb', name: 'When Climbing' }),
    Swim: Object.freeze({ uri: 'on:movement:swim', name: 'When Swimming' }),
    Burrow: Object.freeze({ uri: 'on:movement:burrow', name: 'When Burrowing' })
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const ResolutionTrigger = Object.freeze({
    Initiative: InitiativeTrigger,
    Action: ActionTrigger,
    Movement: MovementTrigger
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const ResolutionAction = Object.freeze({
    Dice: DiceType,
    Save: SavingThrow,
    Check: AbilityCheck,
    Skill: SkillCheck
});

/**
 * @readonly
 * @enum {EnumWithName}
 */
export const ImpactTrigger = Object.freeze({
    Initiative: InitiativeTrigger,
    Action: ActionTrigger,
    Movement: MovementTrigger
});