/** @import * as CoreEnums from './CoreEnums.types.js'  */

/**
 * @typedef {'effect:damage' | 'effect:heal' | 'effect:modify'} EffectImpactType
 * @typedef { CoreEnums.DiceTypeEnum | CoreEnums.AbilityCheckEnum | CoreEnums.SavingThrowEnum | CoreEnums.SkillCheckEnum } EffectResolutionType
 * 
 * @typedef {'turn:start' | 'turn:end' | 'round:start' | 'source:start' | 'source:end' | 'initiative:start' | 'initiative:end'} CombatTrackerTriggerType
 * @typedef {'movement' | 'action' | 'action:any' | 'action:bonus' | 'reaction'} ActionBasedTriggerType
 * @typedef {CombatTrackerTriggerType | ActionBasedTriggerType} EffectImpactTriggerType
 */

export {};