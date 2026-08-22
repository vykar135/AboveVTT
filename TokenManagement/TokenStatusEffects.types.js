/** @import { EffectInitiativeSnapshot, EffectResolutionRules } from './Effects/EffectDefinition.types.js' */

/**
 * @typedef GlobalStatusEffectConfig
 * @property {TokenStatusEffectContainer} settings - The configuration for status effects.
 * @property {(modified: boolean) => void} hasChanges - Callback used to notify the status effect manager of a change
 * 
 * @typedef TokenStatusEffectContainer
 * @property {boolean} incapacitated - Whether the token is currently affected by the Incapacitated state
 * @property {boolean} concentrating - Whether the token is currently concentrating on one or more effects
 * @property {Concentration} concentration - Manages concentration effects that are being maintained by the token
 * @property {PassiveStatusEffect[]} passive - Collection of status effects that the token is under the effects of at all times
 * @property {ActiveStatusEffect[]} active - Collection of status effects that the token is temporarily under the effects of
 * @property {MaintainedEffect[]} maintaining - Collection of status effects that the token is maintaining on itself and others
 * 
 * @typedef Concentration
 * @property {boolean} allowed - Whether the token is permitted to concentrate
 * @property {number} limit - The maximum number of items that the token is allowed to concentrate on
 * 
 * @typedef StatusEffect
 * @property {string} tracking - The tracking identifier for the status effect across tokens
 * @property {string} behavior - URI to well-known or campaign-specific behavior that this effect implements
 * @property {EffectInitiativeSnapshot?} initiative - Details of the initiative order when the status effect was applied; otherwise undefined if applied outside combat.
 * @property {boolean?} resilient - Override for whether the effect persists even when the token is incapacitated
 * @property {boolean?} concentration - Override for whether the effect is being maintained through concentration
 * @property {number?} remaining - The number of resolution attempts remaining before the effect ends on its own
 * @property {string?} resolveTrigger - Overrides the points when the token can attempt to resolve the effect
 * @property {EffectResolutionRules[]} resolution - The points when the target of the status effect can attempt to fully resolve the effect
 * @property {StatusEffectImpact[]?} impacts - Override of the rolls used to determine the impact when the effect is triggered
 *
 * @typedef StatusEffectImpact
 * @property {EffectImpactType} type - The type of change that is applied
 * @property {string?} modifies - The property on the character sheet or monster stat block that is being modified
 * @property {EffectTrigger?} trigger - When the effect triggers a dice roll to determine the impact on the token
 * @property {number?} triggerOffset - The value at which the trigger fires when it involves a position such as initiative order
 * @property {number?} fixed - The fixed amount that is applied by the effect when it is triggered
 * @property {string} roll - Dice notation for the amount of damage or healing applied by the effect when it is triggered
 * @property {string} damage - The type of damage that is applied by the roll
 * 
 * @typedef {StatusEffect} PassiveStatusEffect
 * 
 * @typedef {StatusEffect & ActiveStatusEffectExtensions} ActiveStatusEffect
 * @typedef ActiveStatusEffectExtensions
 * @property {string} source - The identifier of the token that applied the effect when the effect is being concentrated on or has token-based trigger action
 * @property {boolean} fromMaintained - The details for the active effect are to be retrieved from maintained effect list for the token
 * 
 * @typedef {StatusEffect & MaintainedEffectExtensions} MaintainedEffect
 * @typedef MaintainedEffectExtensions
 * @property {string[]} targets - Collection of token identifiers that the effect is being applied to.
 */

export {};