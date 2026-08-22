/** @import { Token, TokenHitPointInfo } from './Token.types.js' */

import { AbilityScore, HitPoint } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
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
    /** @type {Token} */
    #token;
    /** @type {boolean} */
    #player;
    /** @type {{ [uri: string]: NumericStatProperty}} */
    #numeric;
    /** @type {HitPointBlock} */
    #hitPoints;
    /** @type {TokenHitPointInfo} */
    #reportedHitPoints
    /** @type {TokenStatusEffects} */
    #effects;

    /**
     * @param {Token} token - The token to normalize the stat block for.
     */
    constructor(token){
        this.#token = token;
        this.#numeric = {};
        this.#hitPoints = new HitPointBlock(this);
        this.#effects = new TokenStatusEffects(this);

        /* this.#dndBeyond = window.ddbConfigJson; */

        this.rebuild();
    }

    /** @returns {Token} The token that is being managed */
    get token() {
        return this.#token;
    }

    /** @returns {TokenStatusEffects} The manager for active, passive, and maintained token status effects. */
    get statusEffects() {
        return this.#effects;
    }

    /**
     * Retrieves a property from the stat block that implements a numeric value.
     * @param {string} uri - The identifier of the property on the stat block that implements a numeric value.
     * @returns {NumericStatProperty}
     */
    getNumeric(uri) {
        return this.#numeric[uri];
    }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() {
        return this.#hitPoints;
    }

    /** Details about the hit point netadata that was reported for a player. */
    get reportedHp() {
        return this.#reportedHitPoints;
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

        // Snapshoting the current hit points from the player sheet so that 
        // we can track when the player isn't updating their sheet properly as the DM
        this.#reportedHitPoints = player != null ? Object.freeze(HitPointBlock.fix(structuredClone(player?.hitPointInfo ?? {}))) : null;

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
        if (typeof uri !== "string") {
            uri = uri.uri;
        }

        if (typeof value === "string") {
            value = parseInt(value);
        }

        let property = this.#numeric[uri];
        if (property == null) {
            property = new NumericStatProperty(value, this.#player);
            this.#numeric[uri] = property;

            const snapshots = this.#token.options.snapshots;
            if (snapshots != null) {
                property.setSnapshot(snapshots[uri]);
            }
        }

        property.setBaseValue(value, this.#player);
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {AbilityScore} score - The ability score to update.
     * @param {Object} options - The options values from the token.
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
}

// Addressing compatibility issues
window.initStatBlock = (token) => new StatBlock(token);
window.refreshMonsterTokenStats = refreshMonsterStatBlocks;
window.refreshPlayerTokenStats = refreshPlayerSheets;