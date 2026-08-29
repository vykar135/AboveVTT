/** @import { Token } from './Token.types.js' */

import { AbilityScore, AbilityModifier, ConditionType, HitPoint, PropertyType, SaveProficiency, SaveBonus, ProficiencyType } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
import ConditionTracker from './ConditionTracker.mjs';
import NumericStatTracker from './NumericStatTracker.mjs';
import TokenStatusEffects from './TokenStatusEffects.mjs';
import ProficiencyTracker from './ProficiencyTracker.mjs';

/**
 * Performs a case-insensitive string comparison of a pair of property URIs.
 * @param {string} value - The URI being tested without case modification
 * @param {string} expected - The expected value of the URI; should already be in lower case
 * @returns {boolean}
 */
export function uriEquals(value, expected) {
    return (value != null && expected != null && value.toLowerCase() === expected)
}

/** Forces any tokens from all global token stores for the specified identifier to rebuild */
export function refreshStatBlock(id) {
    if (id == null) {
        return;
    }

    console.log(`Refreshing calculated stat blocks for ${id}.`);
    refreshGlobalStatBlock(window.TOKEN_OBJECTS, id);
    refreshGlobalStatBlock(window.all_token_objects, id);
}

/** Forces any tokens for the specified identifier to rebuild */
function refreshGlobalStatBlock(tokens, id) {
    for (const token of Object.values(tokens)) {
        if (token.options.id === id) {
            console.log(`Found calculated stat blocks for ${token.options.id} to refresh.`);
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

/** Forces any tokens from all global token stores that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshMonsterStatBlocks(monster) {
    console.log(`Refreshing calculated stat blocks for monster ${monster}.`);
    refreshGlobalMonsterStats(window.TOKEN_OBJECTS, monster);
    refreshGlobalMonsterStats(window.all_token_objects, monster);
}

/** Forces any tokens that implement the specified Beyond monster stat block to rebuild */
function refreshGlobalMonsterStats(tokens, monster) {
    for (const token of Object.values(tokens)) {
        if (token.options.monster === monster) {
            console.log(`Found calculated stat blocks for monster ${token.options.id} to refresh.`);
            token.stats.rebuild();
        }
    }
}

/** Forces any tokens from all global token stores that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshOpen5eStatBlocks(monster) {
    monster = monster.toLowerCase();
    console.log(`Refreshing calculated stat blocks for Open 5E ${monster}.`);
    refreshOpen5eMonsterStats(window.TOKEN_OBJECTS, monster);
    refreshOpen5eMonsterStats(window.all_token_objects, monster);
}

/** Forces any tokens that implement the specified Beyond monster stat block to rebuild */
function refreshOpen5eMonsterStats(tokens, monster) {
    for (const token of Object.values(tokens)) {
        if (uriEquals(token.options.itemType, 'open5e') && uriEquals(token.options.itemId, monster)) {
            console.log(`Found calculated stat blocks for Open 5E ${token.options.id} to refresh.`);
            token.stats.rebuild();
        }
    }
}

const open5eCreatures = {};

/** Loads the cache of Open 5E creature stat blocks for the provided key */
export function fetchOpen5eSheet(key) {
    key = key.toLowerCase();
    if (key in open5eCreatures) {
        return open5eCreatures[key].sheet;
    }

    console.log(`Loading Open5e creature stat block ${key}`);

    const loader = { loading: true, failed: false, sheet: undefined };
    open5eCreatures[key] = loader;

    let url = `https://api.open5e.com/v2/creatures/?key__in=${key}&limit=1`
    fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to load Open5e creature stat block ${key} with status code ${response.status}`);
        }

        return response.json();
    }).then((payload) => {
        loader.sheet = payload?.results?.find(entry => uriEquals(entry.key, key));
        refreshOpen5eStatBlocks(key);
    }).catch((error) => {
        loader.failed = true;
        console.error(`Failed to load Open5e creature stat block ${key}`, error);
    }).finally(() => loader.loading = false);
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
    /** @type {{ [uri: string]: NumericStatTracker}} */
    #numeric;
    /** @type {{ [uri: string]: ConditionTracker}} */
    #conditions;
    /** @type {{ [uri: string]: ProficiencyTracker}} */
    #proficiencies;
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
        this.#conditions = {}
        this.#proficiencies = {};
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
     * @returns {NumericStatTracker}
     */
    getNumeric(uri) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        return this.#numeric[uri];
    }

    /**
     * Retrieves a property from the stat block that implements a numeric value or adds it if it doesn't exist.
     * @param {string} uri - The identifier of the property on the stat block that implements a numeric value.
     * @param {(stats: StatBlock, uri: string) => NumericStatTracker} init - Callback used to initialize the condition if it doesn't already exist.
     * @returns {NumericStatTracker}
     */
    getOrAddNumeric(uri, init) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        let property = this.#numeric[uri];
        if (property == null && typeof init === 'function') {
            property = init(this, uri);
            this.#numeric[uri] = condition;
        }

        return property;
    }

    /**
     * Retrieves the details for how a condition has been applied to the stat block.
     * @param {string} uri - The identifier of the condition being tracked on the the stat block.
     * @returns {ConditionTracker}
     */
    getCondition(uri) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        return this.#conditions[uri];
    }

    /**
     * Retrieves the details for how a condition has been applied to the stat block or adds it if it doesn't exist.
     * @param {string} uri - The identifier of the condition being tracked on the the stat block.
     * @param {(stats: StatBlock, uri: string) => ConditionTracker} init - Callback used to initialize the condition if it doesn't already exist.
     * @returns {ConditionTracker}
     */
    getOrAddCondition(uri, init) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        let condition = this.#conditions[uri];
        if (condition == null && typeof init === 'function') {
            condition = init(this, uri);
            this.#conditions[uri] = condition;
        }

        return condition;
    }

    /**
     * Retrieves the details for how a proficiency level has been applied to the stat block.
     * @param {string} uri - The identifier of the proficiency level being tracked on the the stat block.
     * @returns {ProficiencyTracker}
     */
    getProficiency(uri) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        return this.#proficiencies[uri];
    }

    /**
     * Retrieves the details for how a proficiency level has been applied to the stat block or adds it if it doesn't exist.
     * @param {string} uri - The identifier of the proficiency level being tracked on the the stat block.
     * @param {(stats: StatBlock, uri: string) => ProficiencyTracker} init - Callback used to initialize the proficiency level if it doesn't already exist.
     * @returns {ProficiencyTracker}
     */
    getOrAddProficiency(uri, init) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        let proficiency = this.#proficiencies[uri];
        if (proficiency == null && typeof init === 'function') {
            proficiency = init(this, uri);
            this.#proficiencies[uri] = proficiency;
        }

        return proficiency;
    }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() {
        return this.#hitPoints;
    }

    get ac() {
        return this.getNumeric(AbilityScore.ArmorClass.uri);
    }

    get proficiencyBonus() {
        return this.getNumeric(AbilityScore.ProficiencyBonus.uri);
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

        this.#player = (player != null || (options.id ?? '').includes('/'));

        const sheets = { options, player };
        if (!this.#player) {
            sheets.open5e = this.getOpen5e();
            sheets.monster = this.getBeyondMonster();
        }

        this.#refreshAbility(AbilityScore.STR, AbilityModifier.STR, SaveProficiency.STR, SaveBonus.STR, sheets);
        this.#refreshAbility(AbilityScore.DEX, AbilityModifier.DEX, SaveProficiency.DEX, SaveBonus.DEX, sheets);
        this.#refreshAbility(AbilityScore.CON, AbilityModifier.CON, SaveProficiency.CON, SaveBonus.CON, sheets);
        this.#refreshAbility(AbilityScore.WIS, AbilityModifier.WIS, SaveProficiency.WIS, SaveBonus.WIS, sheets);
        this.#refreshAbility(AbilityScore.INT, AbilityModifier.INT, SaveProficiency.INT, SaveBonus.INT, sheets);
        this.#refreshAbility(AbilityScore.CHA, AbilityModifier.CHA, SaveProficiency.CHA, SaveBonus.CHA, sheets);

        const ac = options.armorClass ?? player?.armorClass ?? monster?.armorClass ?? 
            open5e?.armor_class ?? open5e?.armorClass ?? 10;
        this.#updateNumeric(AbilityScore.ArmorClass.uri, ac);

        const totalHp = options.hitPointInfo?.maximum ?? player?.hitPointInfo?.maximum ?? 0;
        this.#updateNumeric(HitPoint.Maximum.uri, totalHp);

        for(const condition of Object.values(ConditionType)) {
            if (condition.type === PropertyType.Condition) {
                this.#refreshAppliedCondition(condition, sheets);
            } else if (condition.type === PropertyType.Number) {
                this.#refreshLeveledCondition(condition, sheets);
            }
        }

        this.recalculate();
    }

    /** Recalculates the values for the properties within the stat block after changes have been applied. */
    recalculate() {
        for (const condition of Object.values(this.#conditions)) {
            condition.recalculate();
        }

        for (const numeric of Object.values(this.#numeric)) {
            numeric.recalculate();
        }

        this.#hitPoints.checkMaximum();
    }

    /** @returns {{ round: number, token?: Token, initiative?: number }} A snapshot of the current initiative order in the combat tracker */
    getCurrentInitiative() {
        return StatBlock.getTokenInitiative(this.#token);
    }

    /** @returns {{ round: number, token?: Token, initiative?: number }} A snapshot of the current initiative order in the combat tracker */
    static getActiveInitiative() {
        for (const token of Object.values(window.all_token_objects)) {
            if (token.options.current === true && (token.options.ct_show === true || (window.DM && token.options.ct_show !== undefined))) {
                return StatBlock.getTokenInitiative(token);
            }
        }

        let round = window.ROUND_NUMBER ?? 1;
        if (typeof round === 'string') {
            round = parseFloat(round);
        }

        return { token: undefined, round: round, initiative: undefined };
    }

    /**
     * @param {Token} token - The details of the token to retrieve the current initiative for.
     * @returns {{ round: number, token?: Token, initiative?: number }} A snapshot of the current initiative order for the token in the combat tracker
     */
    static getTokenInitiative(token) {
        let round = window.ROUND_NUMBER ?? 1;
        if (typeof round === 'string') {
            round = parseInt(round);
        }

        if (token.options.ct_show !== true) {
            return { token: token, round: round, initiative: undefined };
        }

        let initiative = token.options.init ?? 0;
        if (typeof initiative === 'string') {
            initiative = parseFloat(initiative);
        }

        return { token: token, round: round, initiative: initiative };
    }

    /** Retrieves the character sheet information from D&D Beyond */
    getPlayerSheet() {
        if (this.#token.options.sheet == null) {
            return null;
        }

        const expected = this.#token.options.sheet.toLowerCase();
        return window.pcs.find((entry) => uriEquals(entry.sheet, expected));
    }

    /** Retrieves the common D&D Beyond monster stat block if the token is an instance of one */
    getBeyondMonster() {
        if (this.#token.options?.monster == null){
            return null;
        }

        return cached_monster_items[this.#token.options.monster]?.monsterData;
    }

    /** Retrieves the common Open 5E stat block if the token is an instance of one */
    getOpen5e() {
        if (!uriEquals(this.#token.options?.itemType, 'open5e') || this.#token.options?.itemId == null){
            return null;
        }

        const expected = this.#token.options.itemId;
        return fetchOpen5eSheet(expected);
    }

    /**
     * Updates the specified numeric property for the stat block.
     * @param {string} uri 
     * @param {number} value 
     * @return {NumericStatTracker}
     */
    #updateNumeric(uri, value) {
        if (typeof value === 'string') {
            value = parseFloat(value);
        }

        let property = this.#numeric[uri];
        if (property == null) {
            property = new NumericStatTracker(this, uri, value);
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

        return property;
    }

    /**
     * Updates the specified proficiency property for the stat block.
     * @param {string} uri 
     * @param {number} value 
     * @return {NumericStatTracker}
     */
    #updateProficiency(uri, config) {
        let property = this.#proficiencies[uri];
        if (property == null) {
            property = new ProficiencyTracker(this, uri);
            this.#proficiencies[uri] = property;
        }

        property.setBaseValue(config);

        return property;
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {AbilityScore} score - The ability score to update.
     * @param {AbilityModifier} ability - The ability modifier to update.
     * @param {SaveProficiency} save - The ability modifier to update.
     * @param {SaveBonus} saveBonus - The ability modifier to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAbility(score, modifier, save, saveBonus, sheets) {
        const primary = this.#refreshAbilityScore(score, sheets);
        const secondary = this.#refreshAbilityModifier(score, modifier, primary.base, sheets);
        this.#refreshSaveModifiers(score, save, saveBonus, secondary.base, sheets);
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {AbilityScore} score - The ability score to update.
     * @param {Object} sheets - The sheet information for the token.
     * @returns {NumericStatTracker}
     */
    #refreshAbilityScore(score, sheets) {
        const expected = score.uri.toLowerCase();
        let value = sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            sheets.monster?.stats?.find((entry) => (entry.statId === score.dndBeyond))?.value ??
            sheets.open5e?.ability_scores?.[score.open5e] ??
            10;

        return this.#updateNumeric(score.uri, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {AbilityScore} score - The ability score with the configuration settings to find the modifier.
     * @param {AbilityModifier} modifier - The ability modifier to update.
     * @param {number} totalScore - The ability score that can be used to calculate the modifier.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAbilityModifier(score, modifier, totalScore, sheets) {
        const expected = score.uri.toLowerCase();
        let value = sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier ??
            sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier ??
            sheets.open5e?.modifiers?.[score.open5e];

        if (value == null) {
            value = Math.floor((totalScore - 10) / 2);
        }

        return this.#updateNumeric(modifier.uri, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {AbilityScore} score - The ability score with the configuration settings to find the modifier.
     * @param {SaveProficiency} save - The ability modifier to update.
     * @param {SaveBonus} saveBonus - The ability modifier to update.
     * @param {NumericStatTracker} abilityMod - The ability score that can be used to calculate the modifier.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshSaveModifiers(score, save, saveBonus, abilityMod, sheets) {
        const expected = score.uri.toLowerCase();
        let value = sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save;

        if (sheets.monster) {
            const beyondProf = sheets.monster.savingThrows?.find((entry) => (entry.statId === score.dndBeyond));
            this.#updateProficiency(save.uri, beyondProf != null ? ProficiencyType.Standard : ProficiencyType.None);
            this.#updateNumeric(saveBonus.uri, beyondProf?.bonusModifier ?? 0);
            return;
        }

        if (sheets.open5e) {
            const openProf = sheets.open5e.saving_throws?.[score.open5e];
            this.#updateProficiency(save.uri, openProf != null ? ProficiencyType.Standard : ProficiencyType.None);
            this.#updateNumeric(saveBonus.uri, 0);
            return;
        }

        value ??= abilityMod;

        return this.#updateNumeric(saveBonus.uri, value);
    }

    /**
     * Determines whether a condition is applied to the stat block.
     * @param {ConditionType} condition - The condition to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAppliedCondition(condition, sheets) {
        const srd = (typeof condition.srd === 'string');
        const fromToken = (srd && sheets.options.conditions.includes(condition.srd));
        const fromPlayer = (srd && (sheets.player?.conditions?.findIndex((entry) => entry?.name === condition.srd) ?? -1) >= 0);

        let property = this.#conditions[condition.uri];
        if (property == null) {
            property = new ConditionTracker(this, condition.uri, fromToken, fromPlayer);
            this.#conditions[condition.uri] = property;
        }

        property.setBaseValue(fromToken, fromPlayer);
    }

    /**
     * Determines whether a condition is applied to the stat block at a specified level.
     * @param {ConditionType} condition - The condition to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshLeveledCondition(condition, sheets) {
        const srd = (typeof condition.srd === 'string');
        const fromPlayer = srd ? sheets.player?.conditions?.find((entry) => entry?.name === condition.srd)?.level : null;

        this.#updateNumeric(condition.uri, (fromPlayer ?? 0) * 2);
    }
}

// Addressing compatibility issues
window.initStatBlock = (token) => new StatBlock(token);
window.refreshTokenStats = refreshStatBlock;
window.refreshPlayerTokenStats = refreshPlayerSheets;
window.refreshMonsterTokenStats = refreshMonsterStatBlocks;
window.refreshOpen5eTokenStats = refreshOpen5eStatBlocks;