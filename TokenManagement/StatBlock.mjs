/** @import { Token } from './Token.types.js' */

import { AbilityScore, AbilityModifier, ConditionType, HitPoint, PropertyType, SaveProficiency, SaveBonus, ProficiencyType } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
import ConditionTracker from './ConditionTracker.mjs';
import NumericStatTracker from './NumericStatTracker.mjs';
import TokenStatusEffects from './TokenStatusEffects.mjs';
import ProficiencyTracker from './ProficiencyTracker.mjs';

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
    /** @type {boolean} */
    #contributor;
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
    /** @type {Object} Components within the stat block that failed to complete successuflly */
    #warnings;

    /**
     * @param {Token} token - The token to normalize the stat block for.
     */
    constructor(token){
        this.#token = token;
        this.#pendingChanges = false;
        this.#warnings = {};
        this.#numeric = {};
        this.#conditions = {}
        this.#proficiencies = {};
        this.#hitPoints = new HitPointBlock(this);
        this.#effects = new TokenStatusEffects(this);

        this.rebuild();
    }

    /**
     * Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance
     * @returns {boolean} Whether the stat block requested to be synced.
    */
    sync() {
        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;

            try {
                this.#token.sync();
                delete this.#warnings['sync'];
            } catch (error) {
                this.reportFailure('sync', `Failed to sync options data`, error);
            }

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

            try {
                this.#token.update_and_sync();
                delete this.#warnings['update_and_sync'];
            } catch (error) {
                this.reportFailure('update_and_sync', `Failed to sync options data`, error);
            }

            return true;
        }

        return false;
    }

    /**
     * Sends the appropriate notification event to the user and mark the stat block with a failure state.
     * @param {str} eventType - The type of event that failed to complete successfully.
     * @param {string} message - The message to report to the user
     * @param {Error} error - The error that was encountered
     */
    reportFailure(eventType, message, error) {
        message = `${message ?? 'Unknown exception encountered'} for ${this.#token?.options?.name ?? 'Unnamed Token'} => ${this.#token?.options?.id ?? ''}`;

        this.#warnings[eventType] = {
            message: message,
            error: error
        };

        if (error != null) {
            console.error(message, error);
        } else {
            console.warn(message);
        }
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

    /** Whether the stat block has active rebuild warnings */
    get hasWarnings() {
        return (Object.keys(this.#warnings ?? {}).length > 0);
    }

    /** @returns {TokenStatusEffects} The manager for active, passive, and maintained token status effects. */
    get statusEffects() {
        return this.#effects;
    }

    /** @returns {boolean} Whether the stat block is for a player */
    get isPlayer() {
        return this.#player;
    }

    /** @returns {boolean} Whether the user can contribute to the token. */
    get isContributor() {
        return (window.DM === true || this.#contributor === true);
    }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() {
        return this.#hitPoints;
    }

    /** Details about the current armor class for the creature. Providing a quick accessor for this since it is shown all over the place. */
    get ac() {
        return this.getNumeric(AbilityScore.ArmorClass.uri)?.current ?? 10;
    }

    /** Generates a snapshot of the creature stat block using the current calculated values. */
    getNormalizedSheet() {
        const pb = this.getNumeric(AbilityScore.ProficiencyBonus)?.current ?? 2;

        const getSave = (modifier, proficiency, bonus) => {
            let bonusAmount = (this.getNumeric(bonus)?.current ?? 0);
            let total = modifier + bonusAmount;
            let profAmount = 0;

            const apply = this.getProficiency(proficiency)?.current?.apply;
            if (typeof apply === 'function') {
                profAmount = apply(pb);
                total += apply(pb);
            }
            return { total, proficiency: profAmount, bonus: bonusAmount };
        };

        const getScore = (score, modifier, proficiency, bonus) => {
            const modValue = this.getNumeric(modifier)?.current ?? 0

            return {
                score: this.getNumeric(score)?.current ?? 10,
                modifier: modValue,
                save: getSave(modValue, proficiency, bonus)
            };
        };

        return {
            proficiencyBonus: pb,
            level: this.getNumeric(AbilityScore.Level)?.current ?? 1,
            ac: this.getNumeric(AbilityScore.ArmorClass)?.current ?? 10,
            hp: {
                maximum: this.#hitPoints.maximum,
                remaining: this.#hitPoints.remaining,
                temp: this.#hitPoints.temp,
                total: this.#hitPoints.total
            },
            scores: {
                str: getScore(AbilityScore.STR, AbilityModifier.STR, SaveProficiency.STR, SaveBonus.STR),
                dex: getScore(AbilityScore.DEX, AbilityModifier.DEX, SaveProficiency.DEX, SaveBonus.DEX),
                con: getScore(AbilityScore.CON, AbilityModifier.CON, SaveProficiency.CON, SaveBonus.CON),
                wis: getScore(AbilityScore.WIS, AbilityModifier.WIS, SaveProficiency.WIS, SaveBonus.WIS),
                int: getScore(AbilityScore.INT, AbilityModifier.INT, SaveProficiency.INT, SaveBonus.INT),
                cha: getScore(AbilityScore.CHA, AbilityModifier.CHA, SaveProficiency.CHA, SaveBonus.CHA)
            }
        };
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

    /** Rebuilds the stat block for the token */
    rebuild() {
        try {
            const options = this.#token.options;
            const player = this.getPlayerSheet();

            this.#player = (player != null || (options.characterId != null && options.itemType === 'pc'));
            this.#contributor = (
                window.DM === true || options.player_owned === true ||
                (window.PLAYER_ID != null && options.characterId?.toString() === window.PLAYER_ID.toString())
            );

            const sheets = { options, player };

            if (this.#contributor) {
                if (this.#player) {
                    sheets.playerExt = this.getPlayerExtended();
                } else {
                    sheets.open5e = this.getOpen5e();
                    sheets.monster = this.getBeyondMonster();
                }
            }

            sheets.pb = this.#refreshLevel(sheets);

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

            delete this.#warnings['rebuild'];
        } catch (error) {
            this.reportFailure('rebuild', `Failed to rebuild character sheet`, error);
        }

        this.recalculate();
    }

    /** Recalculates the values for the properties within the stat block after changes have been applied. */
    recalculate() {
        try {
            for (const condition of Object.values(this.#conditions)) {
                condition.recalculate();
            }

            for (const numeric of Object.values(this.#numeric)) {
                numeric.recalculate();
            }

            this.#hitPoints.checkMaximum();

            for (const proficiency of Object.values(this.#proficiencies)) {
                proficiency.recalculate();
            }

            delete this.#warnings['recalculate'];
        } catch (error) {
            this.reportFailure('recalculate', `Failed to recalculate status efforts`, error);
        }

        this.sync();
    }

    /** Retrieves the character sheet information from D&D Beyond */
    getPlayerSheet() {
        if (this.#token.options.sheet == null) {
            return null;
        }

        const expected = this.#token.options.sheet.toLowerCase();
        return window.pcs.find((entry) => uriEquals(entry.sheet, expected));
    }

    /** Retrieves the extended player character sheet information from D&D Beyond */
    getPlayerExtended() {
        return fetchPlayerExtendedSheet(this.#token.options.characterId);
    }

    /** Retrieves the common D&D Beyond monster stat block if the token is an instance of one */
    getBeyondMonster() {
        return fetchBeyondSheetForToken(this.#token);
    }

    /** Retrieves the common Open 5E stat block if the token is an instance of one */
    getOpen5e() {
        return fetchOpen5eSheetForToken(this.#token);
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
     * Retrieves either the level or challenge rating from the appropriate sheet for the token
     * @param {Object} sheets - The sheet information for the token.
     * @returns {number} The proficiency bonus for the token
    */
    #refreshLevel(sheets) {
        if (sheets.player) {
            const pb = sheets.player.proficiencyBonus ?? 2;
            this.#updateNumeric(AbilityScore.Level.uri, sheets.player.level ?? 1);
            this.#updateNumeric(AbilityScore.ProficiencyBonus.uri, pb);
            return pb;
        }

        if (sheets.monster) {
            let id = sheets.monster.challengeRatingId ?? 0;
            let cr = id;
            let pb = 2;

            const ratings = window.ddbConfigJson?.["challengeRatings"] ?? []
            if (id >= 0 && id < ratings.length) {
                const rating = ratings[id];
                cr = rating.value;
                pb = rating.proficiencyBonus;
            }

            if (pb == null) {
                cr = (id - 4); // CR 1 starts at index 5 currently so lets push it down for the purposes of the calculation
                pb = 1 + Math.ceil((cr > 0 ? cr : 1) / 4);
            }

            this.#updateNumeric(AbilityScore.Level.uri, cr);
            this.#updateNumeric(AbilityScore.ProficiencyBonus.uri, pb ?? 2);
            return pb;
        }

        if (sheets.open5e) {
            const cr = sheets.open5e.challenge_rating ?? 0;
            let pb = sheets.open5e.proficiency_bonus;
            if (pb == null) {
                pb = 1 + Math.ceil((cr > 0 ? cr : 1) / 4);
            }

            this.#updateNumeric(AbilityScore.Level.uri, cr);
            this.#updateNumeric(AbilityScore.ProficiencyBonus.uri, pb ?? 2);
            return pb;
        }

        this.#updateNumeric(AbilityScore.Level.uri, 0);
        this.#updateNumeric(AbilityScore.ProficiencyBonus.uri, 2);
        return 2;
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

        const proficient = this.#reviewPlayerSaveProficiency(save, sheets);

        const expected = score.uri.toLowerCase();
        let bonus = sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            abilityMod;

        // Tear down the full save value to get to the total bonus
        bonus -= abilityMod;
        if (proficient) {
            bonus -= sheets.pb;
        }

        this.#updateProficiency(save.uri, proficient ? ProficiencyType.Standard : ProficiencyType.None);
        this.#updateNumeric(saveBonus.uri, bonus);

        return;
    }

    #reviewPlayerSaveProficiency(save, sheets) {
        if (save.playerExt == null) {
            return false;
        }

        if (sheets.playerExt == null) {
            return sheets.options.proficiency_ext?.[save.uri] === true;
        }

        let proficient = false;
        for (const group of Object.values(sheets.playerExt.modifiers ?? {})) {
            for (const entry of group) {
                if (entry.type?.toLowerCase() === 'proficiency' && entry.subType?.toLowerCase() === save.playerExt) {
                    proficient = true;
                    break;
                }
            }
        }

        const current = sheets.options.proficiency_ext?.[save.uri] ?? false;
        if (current !== proficient) {
            if (sheets.options.proficiency_ext == null) {
                sheets.options.proficiency_ext = {};
            }

            if (proficient === true) {
                sheets.options.proficiency_ext[save.uri] = true;
            } else {
                delete sheets.options.proficiency_ext[save.uri];
            }

            this.hasPendingChanges(true);
        }

        return proficient;
    }

    /**
     * Determines whether a condition is applied to the stat block.
     * @param {ConditionType} condition - The condition to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAppliedCondition(condition, sheets) {
        const srd = (typeof condition.srd === 'string');

        const findUri = (condition.srd ?? '').toLowerCase();
        const fromToken = (srd && (sheets.options.conditions?.findIndex(entry => entry?.name?.toLowerCase() === findUri) ?? -1) >= 0);
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

    refreshGlobalStatBlock(window.TOKEN_OBJECTS, id);
    refreshGlobalStatBlock(window.all_token_objects, id);
}

/** Forces any tokens for the specified identifier to rebuild */
function refreshGlobalStatBlock(tokens, id) {
    for (const token of Object.values(tokens)) {
        if (token.options.id === id) {
            token.stats.rebuild();
        }
    }
}

// #region Player Character Sheets

/** Forces any tokens from all global token stores that implement the specified player character sheet to rebuild */
export function refreshPlayerSheets(player) {
    if (player == null) {
        return;
    }

    refreshGlobalPlayerSheets(window.TOKEN_OBJECTS, player);
    refreshGlobalPlayerSheets(window.all_token_objects, player);
}

/** Forces any tokens that implement the specified player character sheet to rebuild */
function refreshGlobalPlayerSheets(tokens, player) {
    for (const token of Object.values(tokens)) {
        if (token.options.sheet === player) {
            token.stats.rebuild();
        }
    }
}

/** Forces any tokens from all global token stores that implement the specified extended player character sheet to rebuild */
export function refreshPlayerExtended(player) {
    if (player == null) {
        return;
    }

    const asNumber = (typeof player === 'number') ? player : parseInt(player);
    const asString = player.toString();

    refreshGlobalPlayerExtended(window.TOKEN_OBJECTS, asNumber, asString);
    refreshGlobalPlayerExtended(window.all_token_objects, asNumber, asString);
}

/** Forces any tokens that implement the specified extended player character sheet to rebuild */
function refreshGlobalPlayerExtended(tokens, asNumber, asString) {
    for (const token of Object.values(tokens)) {
        if (token.options.characterId === asNumber || token.options.characterId === asString) {
            token.stats.rebuild();
        }
    }
}

/** Cache of v5 character sheets */
const playerSheetsExt = {};

/** Loads the cache of extended player character sheets for the provided identifier */
export function fetchPlayerExtendedSheet(id) {
    if (typeof id === 'number') {
        id = id.toString();
    }

    const owner = (window.DM || window.characterData?.id?.toString() === (id ?? ''));
    if (!owner || id == null || typeof id !== 'string' || id.trim().length <= 1) {
        return undefined;
    }

    if (id in playerSheetsExt) {
        return playerSheetsExt[id].sheet;
    }

    const loader = { loading: true, failed: false, sheet: undefined };
    playerSheetsExt[id] = loader;

    if (window.characterData?.id?.toString() == id) {
        loader.sheet = window.characterData;
        return loader.sheet;
    }

    DDBApi.fetchCharacter(id).then((payload) => {
        loader.sheet = payload;
        refreshPlayerExtended(id);
    }).catch((error) => {
        loader.failed = true;
        console.error(`Failed to load extended player character sheet ${id}`, error);
    }).finally(() => {
        loader.loading = false
    });

    return loader.sheet;
}

// #endregion

// #region Open 5e

/** Forces any tokens from all global token stores that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshOpen5eStatBlocks(monster) {
    if (monster == null) {
        return;
    }
    
    monster = monster.toLowerCase();
    refreshOpen5eMonsterStats(window.TOKEN_OBJECTS, monster);
    refreshOpen5eMonsterStats(window.all_token_objects, monster);
}

/** Forces any tokens that implement the specified Beyond monster stat block to rebuild */
function refreshOpen5eMonsterStats(tokens, monster) {
    for (const token of Object.values(tokens)) {
        if (uriEquals(token.options.itemType, 'open5e') && uriEquals(token.options.itemId, monster)) {
            token.stats.rebuild();
        }
    }
}

const open5eCreatures = {};

/** Retrieves the common Open 5E stat block if the token is an instance of one */
export function fetchOpen5eSheetForToken(token) {
    if (!uriEquals(token.options?.itemType, 'open5e') || token.options?.itemId == null){
        return null;
    }

    return fetchOpen5eSheet(token.options.itemId);
}

/** Loads the cache of Open 5E creature stat blocks for the provided key */
export function fetchOpen5eSheet(key) {
    key = key?.toLowerCase();
    if (key == null) {
        return undefined;
    }

    if (key in open5eCreatures) {
        return open5eCreatures[key].sheet;
    }

    const loader = { loading: true, failed: false, sheet: undefined };
    open5eCreatures[key] = loader;

    // We are doing single lookups here because any fragility with the API calls
    // should not prevent entire batches from loading and this is only reacting
    // to tokens within the campaign
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

    return undefined;
}

// #endregion

// #region D&D Beyond Monsters

const beyondCreatures = {
    sheets: {},
    pending: new Set(),
    timer: undefined,
    delay: 2000 // Initial wait delay while the VTT loads
};

/** Forces any tokens from all global token stores that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshMonsterStatBlocks(monster) {
    if (monster == null) {
        return;
    }

    refreshGlobalMonsterStats(window.TOKEN_OBJECTS, monster);
    refreshGlobalMonsterStats(window.all_token_objects, monster);
}

/** Forces any tokens that implement the specified Beyond monster stat block to rebuild */
function refreshGlobalMonsterStats(tokens, monster) {
    for (const token of Object.values(tokens)) {
        if (token.options.monster === monster) {
            token.stats.rebuild();
        }
    }
}

/**
 * Loads the cache of D&D Beyond creature stat blocks for the provided token
 * @param {Token} token - The token to retrieve the monster stat block for.
 */
export function fetchBeyondSheetForToken(token) {
    const itemType = token?.options?.itemType?.toLowerCase();
    if (itemType !== 'monster') {
        return undefined;
    }

    const monster = token.options.monster ?? token.options.itemId;
    if (monster == null){
        return undefined;
    }

    return fetchBeyondSheet(monster);
}

/**
 * Loads the cache of D&D Beyond creature stat blocks for the provided identifier
 * @param {number | undefined} monster - The identifier of the monster to retrieve.
 */
export function fetchBeyondSheet(monster) {
    if (monster == null) {
        return undefined;
    }

    if (monster in beyondCreatures.sheets) {
        const requested = beyondCreatures.sheets[monster];
        if (requested.sheet !== undefined) {
            return requested.sheet;
        }

        const fromCache = cached_monster_items[monster]?.monsterData;
        if (fromCache !== undefined) {
            beyondCreatures.pending.delete(monster);
            if (beyondCreatures.pending.size === 0 && beyondCreatures.timer !== undefined) {
                window.clearTimeout(beyondCreatures.timer);
                beyondCreatures.timer = undefined;
            }

            requested.sheet = fromCache;
            requested.loading = false;
            requested.failed = false;
        }

        return requested.sheet;
    }

    const fromCache = cached_monster_items[monster]?.monsterData;
    const loader = { loading: true, failed: false, sheet: fromCache };
    beyondCreatures.sheets[monster] = loader;

    if (fromCache != null) {
        return fromCache;
    }

    appendPendingBeyondMonster(monster);
    return undefined;
}

/** Adds a monster to the pending queue and starts the wait timer to give the existing caches time if needed */
function appendPendingBeyondMonster(monster) {
    beyondCreatures.pending.add(monster);

    if (beyondCreatures.timer === undefined) {
        beyondCreatures.timer = window.setTimeout(fetchPendingBeyondSheets, beyondCreatures.delay);
    }
}

/** Loads the cache of D&D Beyond creature stat blocks for any currently pending keys */
function fetchPendingBeyondSheets() {
    if (window.LOADING === true) {
        beyondCreatures.timer = window.setTimeout(fetchPendingBeyondSheets, beyondCreatures.delay);
        return;
    }

    const reviewing = new Set(beyondCreatures.pending.values());
    beyondCreatures.pending.clear();
    beyondCreatures.timer = undefined;

    const updating = [];
    for (const key of reviewing.values()) {
        const requested = beyondCreatures.sheets[key];
        if (requested.sheet !== undefined) {
            continue;
        }

        const fromCache = cached_monster_items[key]?.monsterData;
        if (fromCache !== undefined) {
            requested.sheet = fromCache;
            requested.loading = false;
            requested.failed = false;
            continue;
        }

        updating.push(key);
    }

    if (updating.length === 0) {
        return;
    }

    const individual = () => {
        for (const monster of updating) {
            const target = beyondCreatures.sheets[monster];

            DDBApi.fetchMonsters([monster]).then((response) => {
                target.sheet = response?.find(entry => entry.id === monster);
                target.failed = false;
                refreshMonsterStatBlocks(monster);
            }).catch((error) => {
                target.failed = true;
                console.error(`Failed to load D&D Beyond creature stat block ${monster}`, error);
            }).finally(() => target.loading = false);
        }
    }

    // Attempt a batch fetch first but if it fails roll over to the indivual fetch
    DDBApi.fetchMonsters(updating).then((response) => {
        for (const monster of updating) {
            const target = beyondCreatures.sheets[monster];
            target.sheet = response?.find(entry => entry.id === monster);
            target.failed = false;
            target.loading = false
            refreshMonsterStatBlocks(monster);
        }
    }).catch((error) => {
        console.error('Batch retrieval of D&D Beyond monster sheet failed; rolling over to individual lookups', error);
        individual();
    });
}

// #endregion

// Addressing compatibility issues
window.initStatBlock = (token) => new StatBlock(token);
window.refreshTokenStats = refreshStatBlock;
window.refreshPlayerTokenStats = refreshPlayerSheets;
window.refreshMonsterTokenStats = refreshMonsterStatBlocks;
window.refreshOpen5eTokenStats = refreshOpen5eStatBlocks;