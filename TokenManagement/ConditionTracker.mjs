import DefenseTracker from "./DefenseTracker.mjs";
import { DiceActionModifier } from "./DiceAction.mjs";
import StatBlock from "./StatBlock.mjs";

/**
 * @callback ConditionEffectCallback
 * @param {ConditionTracker} condition - The condition being tracked on the stat block.
 * @param {StatBlock} stats - The stat block being modified.
 * 
 * @typedef {Object} ConditionEffects
 * @property {ConditionEffectCallback} changes - The method used to apply changes from the condition into the stat block.
 * @property {DiceActionModifier} actionDice - The dice action modifier that is applied when taking an action.
 * @property {DiceActionModifier} targetedDice - The dice action modifier that is applied when targetted for an action.
 */

/** Tracks whether a condition should be applied to a stat block. */
export default class ConditionTracker {
    #stats
    #uri;
    #name;
    #tokenActive;
    #playerActive;
    #effectActive;
    #baseIntensity;
    #intensity;
    #baseImmunity;
    #immunity;

    #changes;
    #actionDice;
    #targetedDice;

    /** @type {{ instance: string, version: number, fromCondition: boolean, intensity: number, immunity: boolean | undefined }[]} */
    #sources;

    /**
     * @param {StatBlock} stats - The stat block that this property is for.
     * @param {string} uri - The identifier of the condition.
     * @param {string} name - The name to display for the condition.
     * @param {ConditionEffects} effects - The effects to apply based on how whether the condition is active.
     */
    constructor(stats, uri, name, effects) {
        this.#stats = stats;
        this.#uri = uri;
        this.#name = name;
        this.#tokenActive = false;
        this.#playerActive = false;
        this.#effectActive = false;
        this.#baseIntensity = 0;
        this.#intensity = 0;
        this.#baseIntensity = false;
        this.#immunity = false;
        this.#sources = [];

        this.#changes = effects?.changes;
        this.#actionDice = effects?.actionDice;
        this.#targetedDice = effects?.targetedDice;

        Object.freeze(this);
    }

    /** The URI of the condition being tracked */
    get uri() { return this.#uri; }

    /** The name to display for the condition. */
    get name() { return this.#name; }

    /** Whether the condition is currently active and the creature is not immune. */
    get isActive() { return this.#effectActive && !this.#immunity; }

    /** The current intensity level for the condition. */
    get intensity() { return this.#intensity; }

    /** Whether the creature is immune to the effects of the condition. */
    get immune() { return this.#immunity; }

    /** The dice action modifier that is applied when taking an action. */
    get actionDice() { return this.#actionDice; }

    /** The dice action modifier that is applied when targetted for an action. */
    get targetedDice() { return this.#targetedDice; }

    /** @returns {boolean} Whether the player's character sheet is not synced with the campaign. */
    isNotSynced() {
        if (!this.#stats.isPlayer) {
            return false;
        }

        return this.#effectActive !== this.#playerActive;
    }

    /**
     * Updates the base values for the condition.
     * @param {boolean} fromToken - Whether the condition is active within the legacy condition management on a token
     * @param {boolean} fromPlayer - Whether the condition is active on a player's character sheet
     * @param {number} intensity - The numeric value representing the intensity of the effects from the condition
     * @param {boolean} immunity - Whether the creature is immune to the effects of the condition.
     */
    setBaseValue(fromToken, fromPlayer, intensity, immunity) {
        this.#tokenActive = (fromToken === true);
        this.#playerActive = (fromPlayer === true);
        this.#baseIntensity = intensity ?? ((this.#tokenActive || this.#playerActive) ? 1 : 0);
        this.#baseImmunity = (immunity === true);
    }

    /**
     * Recalculates whether the condition is currently active based on a status effect.
     * @returns {boolean} Whether the condition is currently active
    */
    recalculate() {
        const version = this.#stats.statusEffects.version;
        let active = (this.#playerActive === true || this.#tokenActive === true);
        let intensity = this.#baseIntensity ?? 0;
        let immunity = this.#baseImmunity;

        this.#sources = this.#sources.filter(entry => entry.version === version || entry.fromCondition === true);

        for (const applied of this.#sources) {
            active = true;
            intensity += (applied.intensity ?? 1);
            immunity = applied.immunity ?? immunity;
        }

        this.#effectActive = active;
        this.#intensity = intensity;
        this.#immunity = immunity;

        if (typeof this.#changes === 'function') {
            this.#changes(this, this.#stats);
        }

        return this.isActive;
    }

    /**
     * Appends an instance of the condition being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     * @param {boolean} fromCondition - Whether the instance is from a condition.
     * @param {number} intensity - The numeric value representing the intensity of the effects from the condition
     * @param {boolean} immunity - Whether the creature is immune to the effects of the condition.
     */
    addInstance(instance, fromCondition, intensity, immunity) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to append an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        if (typeof immunity !== 'boolean' && immunity != null) {
            console.warn(`Attempting to append immunity to ${this.#uri} without a valid boolean value`);
            immunity = undefined;
        }

        if (typeof intensity !== 'number') {
            console.warn(`Attempting to append intensity to ${this.#uri} without a valid numeric value`);
            intensity = undefined;
        }

        instance = instance.toLowerCase();
        const index = this.#sources.findIndex(entry => entry.instance === instance);

        const impact = {
            instance, intensity, immunity,
            fromCondition: (fromCondition === true),
            version: this.#stats.statusEffects.version
        };
        Object.freeze(impact);

        if (index < 0) {
            this.#sources.push(impact);
        } else {
            this.#sources[index] = impact;
        }
    }

    /**
     * Removes an instance of the condition being applied to the stat block.
     * @param {string} instance - The tracking identifier within the instance of the behavior for the effect impact
     */
    removeInstance(instance) {
        if (typeof instance !== 'string') {
            console.warn(`Attempting to remove an instance of condition ${this.#uri} without a valid instance identifier`);
            return;
        }

        instance = instance.toLowerCase();
        this.#sources = this.#sources.filter(entry => entry.instance !== instance);
    }

    /** Removes all instances of the condition */
    clearInstances() {
        if (this.#sources.length === 0) {
            return;
        }
        
        this.#sources = [];
    }
}

/** @type {ConditionEffects} Dice action modifier for the blinded condition. */
export const BlindedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Charmed condition. */
export const CharmedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Deafened condition. */
export const DeafenedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Exhaustion condition. */
export const ExhaustionDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Frightened condition. */
export const FrightenedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Grappled condition. */
export const GrappledDice = Object.freeze({
    changes: CannotMove,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the incapacitated condition. */
export const IncapacitatedDice = Object.freeze({
    changes: SetIncapacitated,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Invisible condition. */
export const InvisibleDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Paralyzed condition. */
export const ParalyzedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Petrified condition. */
export const PetrifiedDice = Object.freeze({
    changes: SetPetrified,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the poisoned condition. */
export const PoisonedDice = Object.freeze({
    changes: undefined,
    action: ApplyPoisoned(),
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Prone condition. */
export const ProneDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the restrained condition. */
export const RestrainedDice = Object.freeze({
    changes: CannotMove,
    action: ApplyRestrained(),
    targeted: AsRestrainedTarget()
});

/** @type {ConditionEffects} Dice action modifier for the Stunned condition. */
export const StunnedDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/** @type {ConditionEffects} Dice action modifier for the Unconscious condition. */
export const UnconsciousDice = Object.freeze({
    changes: undefined,
    action: undefined,
    targeted: undefined
});

/**
 * Updates the stat block for a character that has been incapacitated.
 * @param {ConditionTracker} condition - The condition being tracked on the stat block.
 * @param {StatBlock} stats - The stat block being modified */
function SetIncapacitated(condition, stats) {
    const instance = condition.uri;
    stats.statusEffects.isIncapacitated(condition.isActive);

    if (!condition.isActive) {
        return;
    }

    const impact = { setTo: 0, priority: 999999999 };
    // TODO: Set action, bonus action, and reaction limit to 0
}

/**
 * Updates the stat block for a character that has been petrified.
 * @param {ConditionTracker} condition - The condition being tracked on the stat block.
 * @param {StatBlock} stats - The stat block being modified */
function SetPetrified(condition, stats) {
    const instance = condition.uri;

    SetIncapacitated(condition, stats);
    CannotMove(condition, stats);

    if (condition.isActive) {
        stats.conditions.poisoned.addInstance(instance, true, 0, true);

        for (const defense of Object.values(stats.defenses)) {
            if (defense instanceof DefenseTracker) {
                defense.addInstance(instance, true, undefined, true, undefined);
            }
        }

    } else {
        stats.conditions.poisoned.removeInstance(instance);

        for (const defense of Object.values(stats.defenses)) {
            if (defense instanceof DefenseTracker) {
                defense.removeInstance(instance);
            }
        }
    }
}

/**
 * Updates the stat block for a character that has been incapacitated.
 * @param {ConditionTracker} condition - The condition being tracked on the stat block.
 * @param {StatBlock} stats - The stat block being modified */
export function CannotMove(condition, stats) {
    const instance = condition.uri;

    if (!condition.isActive) {
        stats.movement.walk.removeInstance(instance);
        stats.movement.crawl.removeInstance(instance);
        stats.movement.climb.removeInstance(instance);
        stats.movement.burrow.removeInstance(instance);
        stats.movement.swim.removeInstance(instance);
        stats.movement.fly.removeInstance(instance);
        return;
    }

    const impact = { setTo: 0, priority: 999999999, fromCondition: true };

    stats.movement.walk.addInstance(instance, impact);
    stats.movement.crawl.addInstance(instance, impact);
    stats.movement.climb.addInstance(instance, impact);
    stats.movement.burrow.addInstance(instance, impact);
    stats.movement.swim.addInstance(instance, impact);
    stats.movement.fly.addInstance(instance, impact);
}

/** Generates the dice action modifier for the poisoned condition. */
function ApplyPoisoned() {
    const modifier = new DiceActionModifier();
    modifier.tags.require.addRange(['ability', 'skill', 'tohit']);
    modifier.advantage = false;

    return modifier;
}

/** Generates the dice action modifier for the restrained condition when performing the action. */
function ApplyRestrained() {
    const modifier = new DiceActionModifier();
    modifier.tags.require.addRange(['tohit', [ 'save', 'dex' ]]);
    modifier.advantage = false;

    return modifier;
}

/** Generates the dice action modifier for the restrained condition when the target of a dice action. */
function AsRestrainedTarget() {
    const modifier = new DiceActionModifier();
    modifier.tags.require.addRange(['tohit']);
    modifier.advantage = true;

    return modifier;
}