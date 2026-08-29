import StatBlock from './StatBlock.mjs'

/**
 * @typedef {Object} EffectBehavior
 * @property {string} uri - The system identifier for these status effect behavior rules
 * @property {string} name - The name of the status effect
 * @property {boolean?} resilient - Whether the effect persists even when the token is incapacitated; defaults to true
 * @property {boolean?} concentration - Whether the effect requires concentration; defaults to false and overrides resilient when true
 * @property {EffectDuration} duration - The duration of the effect
 * @property {EffectPreventionRule[]} prevention - The points when the target of the status effect can attempt to fully resolve the effect
 * @property {EffectResolutionRule[]} resolution - The points when the target of the status effect can attempt to fully resolve the effect
 * @property {EffectImpactRule[]} impacts - The rules that define how the effect is applied to the stat block
 *
 * @typedef {Object} EffectPreventionRule
 * @property {string} how - The type of dice roll or action the target of the status effect can use to prevent the effect
 * @property {number} dc - The difficulty class of the prevention action taken
 * @property {string[]} tags - The tags used to determine the difficultly class if a static value is not present.
 * 
 * @typedef {Object} EffectResolutionRule
 * @property {string} when - The point when the target of the status effect can attempt to fully resolve it
 * @property {string} how - The type of dice roll or action the target of the status effect can use to fully resolve the effect
 * @property {number} dc - The difficulty class of the resolution action taken
 * @property {string[]} tags - The tags used to determine the difficultly class if a static value is not present.
 *
 * @typedef {EffectImpactRuleProcessor & EffectImpact} EffectImpactRule
 * 
 * @typedef EffectImpactRuleProcessor
 * @property {string} type - The type of change that is being applied to the stat block
 * @property {boolean} sealed - Whether the impact rule allows for overrides to the default settings.
 * 
 * @typedef {Object} EffectImpact
 * @property {boolean} immediate - Whether the impact is immediately applied to the stat block; defaults to true if no triggers are defined
 * @property {ImpactTrigger[]?} triggers - The points when the impact will be applied to the stat block
 * @property {EffectDuration} duration - The duration of the effect
 * @property {string?} modifies - The property on the stat block that is being modified
 * @property {EffectResolutionRule[]} resolution - The points when the target of the status effect can attempt to fully resolve the impact
 * @property {string[]?} tags - Any tags that can be used to modify the outcome of the effect
 * @property {number?} amount - The fixed amount that is applied by the effect when it is triggered
 * @property {string?} imports - The URI of the numeric property to import the current value for and apply to the requesting property.
 * @property {boolean?} importPenalty - Whether the imported value is treated as a penalty against the requesting property.
 * @property {EffectImpactRoll[]?} rolls - Defines any rolls that are associated with the impact being applied
 * @property {string} proficiency - The type of proficiency being used or applied by the effect
 * @property {string} resistance - The type of resistance being used or applied by the effect
 * @property {string} advantage - The style of advantage being used or applied by the effect
 * @property {string} damageType - The type of damage being used or applied by the effect
 * @property {string} ability - The type of ability score used or applied by the effect
 * 
 * @typedef {Object} EffectDuration
 * @property {string} type - The type of duration that an effect is using; defaults to indefinite
 * @property {number} length - The number used to determine the full length of an effect based on the duration
 * 
 * @typedef EffectInitiative
 * @property {number} round - The round when the status effect was applied
 * @property {number} order - The initiative order within the round when the status effect was applied
 * 
 * @typedef {Object} EffectImpactRoll
 * @property {string} type - The type of roll being made
 * @property {number} amount - The number of dice to include in the roll when applicable
 * @property {number} size - The size of dice to include in the roll when applicable
 * @property {string[]} tags - Additional tags beyond the ones defined for the overall impact that can be used to modify the outcome of the dice roll
 * 
 * @typedef {Object} EffectImpactContext 
 * @property {StatBlock} stats - The stat block that is being modified
 * @property {EffectBehavior} behavior - The behavior that the effect impact originated from
 * @property {string} tracking - The tracking identifier within the instance of the behavior for the effect impact
 * @property {EffectImpact} impact - Configuration settings that define how the impact of the effect should be applied to the stat block
 * @property {EffectInitiative} initiative - Details of the initiative order that the effect was first applied at
 * @property {EffectImpact} overrides - User specified overrides for the impact settings
 * 
 */

export {}