/** @import * as CoreEnums from '../CoreEnums.types.js'  */

/**
 * @typedef { CoreEnums.DiceSizeType | CoreEnums.AbilityScoreType | CoreEnums.SavingThrowType | CoreEnums.SkillCheckType } EffectResolutionType
 * @typedef {'turn:start' | 'turn:end' | 'round:start' | 'round:end' | 'source:start' | 'source:end' | 'lair'} EffectResolutionTriggerType
 * @typedef {EffectResolutionTriggerType | 'movement' | 'action' | 'action:any' | 'action:bonus' | 'reaction'} EffectImpactTriggerType
 */

/**
 * @typedef TokenStatusEffectContainer
 * @property {Concentration} concentration - Manages concentration effects that are being maintained by the token
 * @property {ActiveStatusEffect[]} active - Collection of status effects that the token is under the effects of
 */

/**
 * @typedef Concentration
 * @property {boolean} allowed - Whether the token is permitted to concentrate
 * @property {max} limit - The maximum number of items that the token is allowed to concentrate on
 * @property {ConcentrationEffect[]} maintaining - Collection of status effects that the token is actively maintaining
 */

/**
 * @typedef {StatusEffect & ConcentrationEffectExtensions} ConcentrationEffect
 * @typedef ConcentrationEffectExtensions
 * @property {string[]} targets - Collection of token identifiers that the effect is being applied to.
 */

/**
 * @typedef {StatusEffect & ActiveStatusEffectExtensions} ActiveStatusEffect
 * @typedef ActiveStatusEffectExtensions
 * @property {string} source - The identifier of the token that applied the effect when the effect is being concentrated on or has token-based trigger action
 * @property {boolean} concentration - Whether the effect is being maintained through concentration
 */

/**
 * @typedef StatusEffect
 * @property {string} behavior - URI to well-known or campaign-specific behavior that this effect implements
 * @property {number?} remaining - The number of resolution attempts remaining before the effect ends on its own
 * @property {EffectResolutionTriggerType?} resolveAt - Overrides the points in the initiative order that the token can attempt to resolve the effect
 * @property {EffectResolutionType[]?} resolveWith - Overrides the type of dice roll that the token owner can use to fully resolve the effect
 * @property {EffectImpactTriggerType[]?} triggers - Overrides when the effect triggers the "amount" dice roll to determine the impact on the token
 * @property {StatusEffectImpact[]?} impacts - Override of the rolls used to determine the impact when the effect is triggered
 */

/**
 * @typedef StatusEffectImpact
 * @property {CoreEnums.EffectImpactType} type - The type of impact that is applied by the roll
 * @property {number?} fixed - The fixed amount that is applied by the effect when it is triggered
 * @property {string} roll - Dice notation for the amount of damage or healing applied by the effect when it is triggered
 * @property {CoreEnums.EffectDamageType?} damage - The type of damage that is applied by the roll
 */

export {};