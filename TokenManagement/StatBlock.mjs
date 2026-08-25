/** @import { Token, TokenHitPointInfo } from './Token.types.js' */

import { AbilityScore, ConditionType, HitPoint, PropertyType } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
import ConditionTracker from './ConditionTracker.mjs';
import NumericStatProperty from './NumericStatProperty.mjs';
import TokenStatusEffects from './TokenStatusEffects.mjs';

/**
 * Performs a case-insensitive string comparison of a pair of property URIs.
 * @param {string} a - The URI being tested
 * @param {string} b - The expected value of the URI
 * @returns {boolean}
 */
export function uriEquals(value, expected) {
    return (value != null && expected != null && value.toLowerCase() === expected.toLowerCase())
}

/** Forces any tokens from all global token stores that implement the specified monster stat block to rebuild */
export function refreshMonsterStatBlocks(monster) {
    console.log(`Refreshing calculated stat blocks for monster ${monster}.`);
    refreshGlobalMonsterStats(window.TOKEN_OBJECTS, monster);
    refreshGlobalMonsterStats(window.all_token_objects, monster);
}

/** Forces any tokens that implement the specified monster stat block to rebuild */
function refreshGlobalMonsterStats(tokens, monster) {
    for (const token of Object.values(tokens)) {
        if (token.options.monster === monster) {
            console.log(`Found calculated stat blocks for monster ${token.options.id} to refresh.`);
            token.stats.rebuild();
        }
    }
}

/** Forces any tokens from all global token stores that implement the specified player character sheet to rebuild */
export function refreshPlayerSheets(player) {
    console.log(`Refreshing calculated stat blocks for player ${player}.`);
    refreshGlobalPlayerSheets(window.TOKEN_OBJECTS, player);
    refreshGlobalPlayerSheets(window.all_token_objects, player);
}

/** Forces any tokens that implement the specified player character sheet to rebuild */
function refreshGlobalPlayerSheets(tokens, player) {
    for (const token of Object.values(tokens)) {
        if (token.options.sheet === player) {
            console.log(`Found calculated stat blocks for player ${token.options.id} to refresh.`);
            token.stats.rebuild();
        }
    }
}

/**
 * Manages a normalized stat block for the provided token
 */
export default class StatBlock {
    /** @type {boolean} */
    #pendingChanges;
    /** @type {Token} */
    #token;
    /** @type {boolean} */
    #player;
    /** @type {{ [uri: string]: NumericStatProperty}} */
    #numeric;
    /** @type {{ [uri: string]: ConditionTracker}} */
    #conditions;
    /** @type {HitPointBlock} */
    #hitPoints;
    /** @type {TokenStatusEffects} */
    #effects;

    /**
     * @param {Token} token - The token to normalize the stat block for.
     */
    constructor(token){
        this.#token = token;
        this.#pendingChanges = false;
        this.#numeric = {};
        this.#hitPoints = new HitPointBlock(this);
        this.#effects = new TokenStatusEffects(this);

        /* this.#dndBeyond = window.ddbConfigJson; */

        this.rebuild();
    }

    /**
     * Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance
     * @returns {boolean} Whether the stat block requested to be synced.
    */
    sync() {
        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;
            this.#token.sync();
            return true;
        }

        return false;
    }

    /**
     * Requests a token update message to be dispatched and updates any related interface components 
     * only if there are pending changes that have been observed by this instance
     * @returns {boolean} Whether the stat block requested to be synced.
     */
    update_and_sync() {
        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;
            this.#token.update_and_sync();
            return true;
        }

        return false;
    }

    /**
     * Updates the current state of the pending changes flag; preserving if it was already set.
     * @param {boolean} modified - Whether a modification occurred.
     */
    hasPendingChanges(modified) {
        if (modified === true) {
            this.#pendingChanges = true;
        }
    }

    /** @returns {Token} The token that is being managed */
    get token() {
        return this.#token;
    }

    /** @returns {TokenStatusEffects} The manager for active, passive, and maintained token status effects. */
    get statusEffects() {
        return this.#effects;
    }

    /** @returns {boolean} Whether the stat block is for a player */
    get isPlayer() {
        return this.#player;
    }

    /**
     * Retrieves a property from the stat block that implements a numeric value.
     * @param {string} uri - The identifier of the property on the stat block that implements a numeric value.
     * @returns {NumericStatProperty}
     */
    getNumeric(uri) {
        return this.#numeric[uri];
    }

    /**
     * Retrieves the details for how a condition has been applied to the stat block.
     * @param {string} uri - The identifier of the condition being tracked on the the stat block.
     * @returns {ConditionTracker}
     */
    getCondition(uri) {
        return this.#conditions[uri];
    }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() {
        return this.#hitPoints;
    }

    get str() {
        return this.getNumeric(AbilityScore.STR.uri);
    }

    get dex() {
        return this.getNumeric(AbilityScore.DEX.uri);
    }

    get con() {
        return this.getNumeric(AbilityScore.CON.uri);
    }

    get wis() {
        return this.getNumeric(AbilityScore.WIS.uri);
    }

    get int() {
        return this.getNumeric(AbilityScore.INT.uri);
    }

    get cha() {
        return this.getNumeric(AbilityScore.CHA.uri);
    }

    /** Rebuilds the stat block for the token */
    rebuild() {
        const options = this.#token.options;
        const player = this.getPlayerSheet();
        const monster = this.getMonsterOptions();

        this.#player = (player != null);

        this.#refreshAbilityScore(AbilityScore.STR, options, player, monster);
        this.#refreshAbilityScore(AbilityScore.DEX, options, player, monster);
        this.#refreshAbilityScore(AbilityScore.CON, options, player, monster);
        this.#refreshAbilityScore(AbilityScore.WIS, options, player, monster);
        this.#refreshAbilityScore(AbilityScore.INT, options, player, monster);
        this.#refreshAbilityScore(AbilityScore.CHA, options, player, monster);

        const ac = options.armorClass ?? player?.armorClass ?? monster?.armorClass ?? 10;
        this.#updateNumeric(AbilityScore.ArmorClass.uri, ac);

        const totalHp = options.hitPointInfo?.maximum ?? player.hitPointInfo?.maximum ?? 0;
        this.#updateNumeric(HitPoint.Maximum.uri, totalHp);

        for(const condition of Object.values(ConditionType)) {
            if (condition.type === PropertyType.Condition) {
                this.#refreshAppliedCondition(condition, options, player);
            } else if (condition.type === PropertyType.Number) {
                this.#refreshLeveledCondition(condition, player);
            }
            
        }
    }

    /** Retrieves the common monster stat block if the token is an instance of one */
    getMonsterOptions() {
        if (this.#token.options?.monster == null){
            return null;
        }

        return cached_monster_items[this.#token.options.monster]?.monsterData;
    }

    /** Retrieves the character sheet information from D&D Beyond */
    getPlayerSheet() {
        if (this.#token.options.sheet == null) {
            return null;
        }

        return window.pcs.find((entry) => uriEquals(entry.sheet, this.#token.options.sheet));
    }

    /**
     * Updates the specified numeric property for the stat block.
     * @param {string} uri 
     * @param {number} value 
     */
    #updateNumeric(uri, value) {
        if (typeof value === 'string') {
            value = parseInt(value);
        }

        let property = this.#numeric[uri];
        if (property == null) {
            property = new NumericStatProperty(this, uri, value);
            this.#numeric[uri] = property;
        }

        property.setBaseValue(value);

        const snapshots = this.#token.options.snapshots?.numeric;
        if (snapshots != null) {
            if (this.#player) {
                property.setSnapshot(snapshots[uri], false);
            } else if (uri in snapshots) {
                property.setSnapshot(undefined, true);
            }
        }
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {AbilityScore} score - The ability score to update.
     * @param {TokenOptions} options - The options values from the token.
     * @param {Object} player - The player sheet information from D&D Beyond.
     * @param {Object} monster - The common monster stat block when available.
     */
    #refreshAbilityScore(score, options, player, monster) {
        let value = options.abilities?.find((entry) => uriEquals(entry?.name, score.uri))?.score ??
            player?.abilities?.find((entry) => uriEquals(entry?.name, score.uri))?.score ??
            monster?.stats?.find((entry) => (entry.statId === score.dndBeyond))?.value ??
            10;

        this.#updateNumeric(score.uri, value);
    }

    /**
     * Determines whether a condition is applied to the stat block.
     * @param {ConditionType} condition - The condition to update.
     * @param {TokenOptions} options - The options values from the token.
     * @param {Object} player - The player sheet information from D&D Beyond.
     */
    #refreshAppliedCondition(condition, options, player) {
        const srd = (typeof condition.srd === 'string');
        const fromToken = (srd && options.conditions.includes(condition.srd));
        const fromPlayer = (srd && (player?.conditions?.findIndex((entry) => entry?.name === condition.srd) ?? -1) >= 0);

        let property = this.#conditions[condition.uri];
        if (property == null) {
            property = new ConditionTracker(this, uri, fromToken, fromPlayer);
            this.#conditions[condition.uri] = property;
        }

        property.setBaseValue(fromToken, fromPlayer);
    }

    /**
     * Determines whether a condition is applied to the stat block at a specified level.
     * @param {ConditionType} condition - The condition to update.
     * @param {Object} player - The player sheet information from D&D Beyond.
     */
    #refreshLeveledCondition(condition, player) {
        const srd = (typeof condition.srd === 'string');
        const fromPlayer = srd ? (player?.conditions?.find((entry) => entry?.name === condition.srd) ?? -1)?.level : null;

        this.#updateNumeric(condition.uri, fromPlayer ?? 0);
    }
}

// Addressing compatibility issues
window.initStatBlock = (token) => new StatBlock(token);
window.refreshMonsterTokenStats = refreshMonsterStatBlocks;
window.refreshPlayerTokenStats = refreshPlayerSheets;