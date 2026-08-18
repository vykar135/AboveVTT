import { DiceType, SavingThrow, AbilityScore, SkillCheck } from '../CoreEnums.mjs'

/**
 * @readonly
 * @enum {string}
 */
export const ResolutionTrigger = Object.freeze({
    TurnStart: 'turn:start',
    TurnEnd: 'turn:end',
    RoundStart: 'round:start',
    RoundEnd: 'round:end',
    SourceStart: 'source:start',
    SourceEnd: 'source:end',
    LairAction: 'lair'
});

/**
 * @readonly
 * @enum {string}
 */
export const ImpactTrigger = Object.freeze({
    ...ResolutionTrigger,
    Movement: 'movement',
    Action: 'action',
    AnyAction: 'action:any',
    BonusAction: 'action:bonus',
    Reaction: 'reaction'
});

/**
 * @readonly
 * @enum {string}
 */
export const EffectResolution = Object.freeze({
    Dice: DiceType,
    Save: SavingThrow,
    Score: AbilityScore,
    Skill: SkillCheck
});