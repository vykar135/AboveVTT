/**
 * Example Action Baselines:
 * Saving Throw: { d20test: true, tags: [ 'save' ], ability: 'wis', abilityLocked: true }
 * Ability Check: { d20test: true, tags: [ 'ability' ], ability: 'str', abilityLocked: true }
 * Skill Check: { d20test: true, tags: [ 'skill', 'stealth' ], ability: 'dex', abilityLocked: false }
 * Pike To Hit: { d20test: true, tags: [ 'tohit', 'weapon', 'pike', 'heavy', 'reach' ], ability: 'str', abilityLocked: false }
 * Pike Damage: { d20test: false, tags: [ 'damage', 'weapon', 'pike', 'heavy', 'reach' ], ability: 'str', abilityLocked: false, die: [{ tags: [ 'piercing' ] count: 2, size: 6, critical: true }] }
 * 
 * Example Action Modification:
 * Bless: { tags: [ 'save', 'ability', 'skill', 'tohit' ] ], die: { count: 1, size: 4 } } - Has no tags on newly injected dice so they cannot be modified
 * Bane: { tags: [ 'save', 'ability', 'skill', 'tohit' ], die: { count: 1, size: 4, penalty: true } }
 * Radiant Strikes: { tags: [ [ 'damage', 'weapon' ] ], die: { count: 1, size: 8, critical: true, tags: [ 'radiant' ] } } - Has tags on newly injected dice so they can be modified
 * 
 * @typedef {Object} DiceActionBaseline
 * @property {string[]} tags - The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome.
 * @property {boolean} d20test - Automatically injects a d20 roll into the die collection but tracks it as the only roll eligible for advantage and imports the same tags as the baseline.
 * @property {DiceRoll[]} die - The baseline set of dice rolls to include; such as weapon damage die.
 * @property {NumericStatTracker} ability - The ability modifier to apply to the dice roll.
 * @property {boolean} abilityLocked - Whether the ability modifier can be changed for the roll; defaults to true.
 * 
 * @typedef {Object} DiceActionModification
 * @property {(string | string[])[]} tags - The set of tags that are used to determine if this modifier qualifies for a dice action; top level entries are OR, collections within the main array are AND
 * @property {number} priority - The order that the modification will be applied to the baseline relative to other queued modifications.
 * @property {NumericStatTracker} ability - Changes the ability modifier to apply to the dice roll.
 * @property {-1 | 0 | 1} advantage - Defines whether keep-high or keep-low is active for d20 tests; will negate advantage if both a positive and negative value are present in the eligible modifiers list. The magnitude of this value is ignored.
 * @property {number} advantageSize - Defines the total number of additional dice to use if advantage is present and matches the sign defined by advantage; process is LIFO but signs are tracked independently.
 * @property {number} proficiency - The multiplier for the proficiency bonus to apply to the roll and rounded down; process will track the maximum limit seen but permit debuffs to hit in full.
 * @property {number | FixedValueModifier} fixed - The fixed amount to include in the roll.
 * @property {DiceRoll[]} die - The additional dice to include.
 * @property {DiceRollModifier[]} dieRules - Collection of additional rules that must be applied to any queued dice rolls.
 * 
 * @typedef {Object} DiceRoll
 * @property {string[]} tags - The set of tags used to discover additional modifiers to the dice roll and effects on the target in the final outcome.
 * @property {number} count - The number of dice to include in the roll.
 * @property {number} sides - The number of sides on the die to roll.
 * @property {boolean} critical - Whether the roll is subject to critical hit rules when applicable.
 * @property {boolean} penalty - Whether the result of the roll is considered a penalty against the final result.
 * 
 * @typedef {Object} DiceRollModifier
 * @property {(string | string[])[]} tags - The set of tags used to discover what queued dice rolls this rule applies to; top level entries are OR, collections within the main array are AND
 * @property {number} priority - The order that the modification will be applied to the rolls relative to other queued modifications; the final result for these properties is LIFO.
 * @property {boolean} canCritical - Whether the dice roll is permitted to be critically rolled.
 * @property {number} criticalThreshold - For a d20 test, if the roll is at or over this amount, it is considered a critical success.
 * @property {number} fumbleThreshold - For a d20 test, if the roll is at or under this amount, it is considered a critical failure.
 * @property {'standard' | 'double' | 'perfect'} criticalStyle - The method used to calculate the effect of a critical dice roll.
 * @property {'once' | 'continuous'} explosive - Whether the roll will be replayed and added to the final result if the preceding roll was for maximum value.
 * @property {boolean} forceMaximum - Whether the roll is automatically its maximum value; see "Beacon of Hope"
 * @property {number} keep - The number of dice roll results for non-d20 tests that are effective based on the highest or lowest; positive value for highest, negative for lowest.
 * @property {number} additionalCount - Modifies the number of dice included in the roll for non-d20 tests; can be used with "keep" to make advantage-like rolls
 * @property {number} rerollUnder - If the value of the roll is under this, it is rerolled once and the new value is taken.
 * @property {boolean} rerollUnderUntil - Whether reroll under continues to happen until the condition is met.
 * @property {number} rerollOver - If the value of the roll is over this, it is rerolled once and the new value is taken.
 * @property {boolean} rerollOverUntil - Whether reroll over continues to happen until the condition is met.
 * @property {number} minimum - If the roll is under this value, it is automatically increased to the minimum.
 * @property {number} maximum - If the roll is over this value, it is automatically reduced to the maximum.
 * 
 * @typedef {Object} FixedValueModifier
 * @property {number} amount - The fixed amount used within the effect.
 * @property {string} imports - The URI of the numeric property to import the current value for and apply to the roll.
 * @property {boolean} penalty - Whether the imported value is treated as a penalty against the roll.
*/

import NumericStatTracker from "./NumericStatTracker.mjs";

export default class DiceAction {


    constructor() {

    }
}