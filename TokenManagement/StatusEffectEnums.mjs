/** @import { ConfigurationSettings } from './CoreEnums.mjs*/
import { Configuration, DiceType, SavingThrow, AbilityCheck, SkillCheck, PropertyType } from './CoreEnums.mjs'

/**
 * @type {Configuration & {
 *     Damage: ConfigurationSettings,
 *     Heal: ConfigurationSettings,
 *     TempHP: ConfigurationSettings,
 *     Modify: ConfigurationSettings
 * }}
 */
export const EffectImpact = new Configuration({
    Damage: { uri: 'effect:damage', name: 'Damage Target' },
    Heal: { uri: 'effect:heal', name: 'Heal Target' },
    TempHP: { uri: 'effect:temp', name: 'Grant Temporary HP To Target' },
    Modify: { uri: 'effect:modify', name: 'Modify Property Of Target' }
});

/**
 * @type {Configuration & {
 *     Indefinite: ConfigurationSettings,
 *     TurnsStarted: ConfigurationSettings,
 *     TurnsEnded: ConfigurationSettings,
 *     Rounds: ConfigurationSettings,
 *     ShortRest: ConfigurationSettings,
 *     LongRest: ConfigurationSettings
 * }}
 */
export const EffectDuration = new Configuration({
    Indefinite: { uri: 'indefinite', name: 'Until Cancelled' },
    TurnsStarted: { uri: 'turn:start', name: 'Turns Started' },
    TurnsEnded: { uri: 'turn:end', name: 'Turns Ended' },
    Rounds: { uri: 'round:start', name: 'Rounds Started' },
    ShortRest: { uri: 'rest:short', name: 'On Short Rest' },
    LongRest: { uri: 'rest:long', name: 'On Long Rest' }
});

/**
 * @type {Configuration & {
 *     TurnStart: ConfigurationSettings,
 *     TurnEnd: ConfigurationSettings,
 *     RoundStart: ConfigurationSettings,
 *     SourceStart: ConfigurationSettings,
 *     SourceEnd: ConfigurationSettings,
 *     InitiativeStart: ConfigurationSettings,
 *     InitiativeEnd: ConfigurationSettings
 * }}
 */
export const InitiativeTrigger = new Configuration({
    TurnStart: { uri: 'on:turn:start', name: 'Start of Your Turn' },
    TurnEnd: { uri: 'on:turn:end', name: 'End of Your Turn' },
    RoundStart: { uri: 'on:round:start', name: 'Start of New Round' },
    SourceStart: { uri: 'on:source:start', name: 'Start of Effect Source\'s Turn' },
    SourceEnd: { uri: 'on:source:end', name: 'End of Effect Source\'s Turn' },
    InitiativeStart: { uri: 'on:initiative:start', name: 'Start of Initiative Order #' },
    InitiativeEnd: { uri: 'on:initiative:end', name: 'End of Initiative Order #' }
});

/**
 * @type {Configuration & {
 *     Any: ConfigurationSettings,
 *     Standard: ConfigurationSettings,
 *     Bonus: ConfigurationSettings,
 *     Reaction: ConfigurationSettings,
 *     Help: ConfigurationSettings,
 *     Helped: ConfigurationSettings,
 *     SpellCast: ConfigurationSettings,
 *     WeaponAttack: ConfigurationSettings,
 *     MeleeAttack: ConfigurationSettings,
 *     RangedAttack: ConfigurationSettings,
 *     ChargesUsed: ConfigurationSettings
 * }}
 */
export const ActionTrigger = new Configuration({
    Any: { uri: 'on:action', name: 'On Any Action' },
    Standard: { uri: 'on:action:standard', name: 'On Action' },
    Bonus: { uri: 'on:action:bonus', name: 'On Bonus Action' },
    Reaction: { uri: 'on:reaction', name: 'On Reaction' },
    Help: { uri: 'on:action:help', name: 'On Help Action' },
    Helped: { uri: 'on:action:helped', name: 'When Helped' },
    SpellCast: { uri: 'on:spell', name: 'When Casting A Spell' },
    WeaponAttack: { uri: 'on:attack:weapon', name: 'On Weapon Attack' },
    MeleeAttack: { uri: 'on:attack:melee', name: 'On Melee Attack' },
    RangedAttack: { uri: 'on:attack:range', name: 'On Ranged Attack' },
    ChargesUsed: { uri: 'on:charges:used', name: 'On Charges Use' },
});

/**
 * @type {Configuration & {
 *     Any: ConfigurationSettings,
 *     Walk: ConfigurationSettings,
 *     Fly: ConfigurationSettings,
 *     Climb: ConfigurationSettings,
 *     Swim: ConfigurationSettings,
 *     Burrow: ConfigurationSettings
 * }}
 */
export const MovementTrigger = new Configuration({
    Any: { uri: 'on:movement', name: 'On Any Movement' },
    Walk: { uri: 'on:movement:walk', name: 'When Walking' },
    Fly: { uri: 'on:movement:fly', name: 'When Flying' },
    Climb: { uri: 'on:movement:climb', name: 'When Climbing' },
    Swim: { uri: 'on:movement:swim', name: 'When Swimming' },
    Burrow: { uri: 'on:movement:burrow', name: 'When Burrowing' }
});

/**
 * @type {Configuration & {
 *     Damaged: ConfigurationSettings,
 *     Healed: ConfigurationSettings,
 *     Shielded: ConfigurationSettings
 * }}
 */
export const HitPointTrigger = new Configuration({
    Damaged: { uri: 'on:hp:damage', name: "On Taking Damage"},
    Healed: { uri: 'on:hp:heal', name: "On Receiving Heal"},
    Shielded: { uri: 'on:hp:temp', name: "On Receiving Temp HP"}
});

/**
 * @readonly
 * @enum {Configuration}
 */
export const ResolutionTrigger = Object.freeze({
    Initiative: InitiativeTrigger,
    Action: ActionTrigger,
    Movement: MovementTrigger,
    HitPoint: HitPointTrigger
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
    Movement: MovementTrigger,
    HitPoint: HitPointTrigger
});