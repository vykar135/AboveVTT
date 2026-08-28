/** @import { ConditionType, PropertyConfiguration } from './CoreEnums.mjs*/

import StatBlock from './StatBlock.mjs'
import { AdvantageType, DamageType, DiceType, ProficiencyType, ResistanceType, RollType } from './CoreEnums.mjs';
import { ResolutionTrigger, ResolutionAction, EffectImpact, EffectDuration, ImpactTrigger } from "./StatusEffectEnums.mjs";

/**
 * @typedef {Object} EffectBehaviorInfo
 * @property {string} uri - The system identifier for these status effect behavior rules
 * @property {string} name - The name of the status effect
 * @property {boolean?} resilient - Whether the effect persists even when the token is incapacitated; defaults to true
 * @property {boolean?} concentration - Whether the effect requires concentration; defaults to false and overrides resilient when true
 * @property {EffectDurationInfo} duration - The duration of the effect
 * @property {EffectResolutionRule[]} resolution - The points when the target of the status effect can attempt to fully resolve the effect
 * @property {EffectImpactRule[]} impacts - The rules that define how the effect is applied to the stat block
 *
 * @typedef {Object} EffectResolutionRule
 * @property {ResolutionTrigger} when - The point when the target of the status effect can attempt to fully resolve it
 * @property {ResolutionAction} how - The type of dice roll or action the target of the status effect can use to fully resolve the effect
 *
 * @typedef {EffectImpactRuleProcessor & EffectImpactRuleSettings} EffectImpactRule
 * 
 * @typedef EffectImpactRuleProcessor
 * @property {ApplyEffectImpact} apply - Callback used to apply the impact of the affect to the stat block
 * @property {boolean} sealed - Whether the impact rule allows for overrides to the default settings.
 * 
 * @typedef {Object} EffectImpactRuleSettings
 * @property {boolean} immediate - Whether the impact is immediately applied to the stat block; defaults to true if no triggers are defined
 * @property {ImpactTrigger[]?} triggers - The points when the impact will be applied to the stat block
 * @property {string} type - The type of change that is applied
 * @property {EffectDurationInfo} duration - The duration of the effect
 * @property {PropertyConfiguration?} modifies - The property on the stat block that is being modified
 * @property {EffectResolutionRule[]} resolution - The points when the target of the status effect can attempt to fully resolve the impact
 * @property {string[]?} tags - Any tags that can be used to modify the outcome of the effect
 * @property {number?} amount - The fixed amount that is applied by the effect when it is triggered
 * @property {EffectImpactRoll[]?} rolls - Defines any rolls that are associated with the impact being applied
 * @property {ProficiencyType?} proficiency - The type of proficiency being used or applied by the effect
 * @property {ResistanceType?} resistance - The type of resistance being used or applied by the effect
 * @property {AdvantageType?} advantage - The style of advantage being used or applied by the effect
 * @property {DamageType?} damageType - The type of damage being used or applied by the effect
 * @property {AbilityScore?} ability - The type of ability score used or applied by the effect
 * @property {string?} condition - The type of condition applied by the effect
 * 
 * @typedef {Object} EffectDurationInfo
 * @property {string} type - The type of duration that an effect is using; defaults to indefinite
 * @property {number} length - The number used to determine the full length of an effect based on the duration
 * 
 * @typedef EffectInitiativeSnapshot
 * @property {number} round - The round when the status effect was applied
 * @property {number} order - The initiative order within the round when the status effect was applied
 * 
 * @typedef {Object} EffectImpactRoll
 * @property {RollType} type - The type of roll being made
 * @property {number} amount - The number of dice to include in the roll when applicable
 * @property {DiceType} size - The size of dice to include in the roll when applicable
 * @property {string[]?} tags - Additional tags beyond the ones defined for the overall impact that can be used to modify the outcome of the dice roll
 * 
 * @typedef {Object} EffectImpactContext 
 * @property {StatBlock} stats - The stat block that is being modified
 * @property {EffectBehaviorInfo} behavior - The behavior that the effect impact originated from
 * @property {string} tracking - The tracking identifier within the instance of the behavior for the effect impact
 * @property {EffectImpactRuleSettings} impact - Configuration settings that define how the impact of the effect should be applied to the stat block
 * @property {EffectInitiativeSnapshot} initiative - Details of the initiative order that the effect was first applied at
 * @property {EffectImpactRuleSettings} overrides - User specified overrides for the impact settings
 * 
 * @callback ApplyEffectImpact
 * @param {EffectImpactContext} context - Details of the impact being applied
 * @returns {void}
 */

export {}