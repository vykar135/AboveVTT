/** @import { Token } from './Token.types.js' */

import { fetchBeyondSheetForToken, fetchOpen5eSheetForToken, fetchPlayerExtendedSheet } from './StatBlockSources.mjs';
import { DiceActionsEnabled, AbilityScore, ConditionType, DamageType, SkillCheck, uriEquals, Movement } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
import ConditionTracker, { BlindedDice, CharmedDice, DeafenedDice, ExhaustionDice, FrightenedDice, GrappledDice, IncapacitatedDice, InvisibleDice, ParalyzedDice, PetrifiedDice, PoisonedDice, ProneDice, RestrainedDice, StunnedDice, UnconsciousDice } from './ConditionTracker.mjs';
import NumericStatTracker from './NumericStatTracker.mjs';
import TokenStatusEffects from './TokenStatusEffects.mjs';
import { DiceAction, DiceActionContext } from './DiceAction.mjs';
import DefenseTracker from './DefenseTracker.mjs';
import ToggleTracker from './ToggleTracker.mjs';
import StatNormalization from './StatNormalization.mjs';

/** @type {{ [id: string]: StatBlock }} */
const StatBlockCache = {};

/**
 * Gets or adds the stat block from the central store
 * @param {string} id - The identifier of the character or creature to build the stat block for. */
export function GetStatBlock(id){
    if (id == null) {
        return undefined;
    }

    if (id in StatBlockCache) {
        return StatBlockCache[id];
    }

    const stats = new StatBlock(id);
    StatBlockCache[stats.id] = stats;

    stats.rebuild();
    return stats;
}

/**
 * Gets the stat block from the central store
 * @param {string} id - The identifier of the character or creature. */
export function LookupStatBlock(id){
    if (id != null && id in StatBlockCache) {
        return StatBlockCache[id];
    }

    return undefined;
}

/** Provides an enumeration of all available stat blocks. */
export function ListStatBlocks() {
    return Object.values(StatBlockCache);
}

/**
 * Manages a normalized stat block for the associated player or creature stat blocks
 * 
 * - Tracking information for creature stat blocks will only ever exist within tokens,
 * - Tracking information for players will exists within the campaign data, 
 *     allowing us to affect player rolls even when a token is not present.
*/
export default class StatBlock {
    #id;
    #needsRebuild;
    #pendingRebuild;

    #name;
    #proficiency;
    #ac;
    #scores;
    #modifiers;
    #initiative;
    #saves;
    #skills;
    #conditions;
    #defenses;
    #movement;
    #hitPoints;
    #diceContext;
    #effects;
    #wellKnownNumerics;
    #wellKnownToggles;
    #level;
    #player;
    #contributor;
    #hasSheet;

    /** @type {string | undefined} The URI for for the player character when applicable */
    #characterUri;
    /** @type {string | undefined} The identifier for the player character within D&D Beyond when applicable */
    #characterId;

    /** @type {number | undefined} Timestamp when the stat block was notified of a pending change */
    #pendingChanges;
    /** @type {{ [uri: string]: NumericStatTracker}} */
    #numeric;
    /** @type {{ [uri: string]: { message: string, error: Error }}} Components within the stat block that failed to complete successuflly */
    #warnings;

    /** @param {string} id - The identifier of the character or creature to build the stat block for. */
    constructor(id){
        this.#id = id;
        this.#needsRebuild = true;
        this.#characterUri = undefined;
        this.#characterId = undefined;

        this.#proficiency = new NumericStatTracker(this, 'pb', 2, 'Proficiency Bonus');
        this.#diceContext = new BlockDiceContext(this);

        this.#ac = new NumericStatTracker(this, 'ac', 10, 'Armor Class');
        this.#scores = new BlockAbilityScores(this);
        this.#modifiers = new BlockAbilityModifiers(this);
        this.#saves = new BlockSavingThrows(this);
        this.#skills = new BlockSkillChecks(this);
        this.#conditions = new BlockConditions(this);
        this.#defenses = new BlockDefenses(this);
        this.#movement = new BlockMovement(this);
        this.#hitPoints = new HitPointBlock(this);
        this.#effects = new TokenStatusEffects(this);

        this.#initiative = new DiceAction(this.diceContext, 'initiative', 'Initiative', true, 'dex', true);
        this.#initiative.tags.addRange(['initiative', 'dex']);
        this.#initiative.tagFreeze();

        const score = this.#scores;
        const modifiers = this.#modifiers;
        const movement = this.#movement;

        this.#wellKnownNumerics = [
            this.#proficiency,
            score.str, score.dex, score.con, score.wis, score.int, score.cha,
            modifiers.str.value, modifiers.dex.value, modifiers.con.value, modifiers.wis.value, modifiers.int.value, modifiers.cha.value,
            this.#ac, this.#hitPoints.maximumChanges,
            movement.walk, movement.crawl, movement.climb, movement.swim, movement.fly, movement.burrow
        ];
        
        this.#wellKnownToggles = [ movement.hover ];

        this.#warnings = {};
        this.#numeric = {};

        this.#level = 0;
        this.#pendingChanges = undefined;
        this.#player = false;
        this.#contributor = false;
        this.#hasSheet = false;

        Object.freeze(this);

        // Force a rebuild once the scene is loaded.
        this.#pendingRebuild = window.setTimeout(this.#checkRebuild.bind(this), 1000);
    }

    /** Checks if the stat block is still waiting for the scene to finish loading, then triggers a rebuild. */
    #checkRebuild(){
        if (!this.#needsRebuild) {
            this.#pendingRebuild = undefined;
            return;
        }

        if (window.LOADING === true || this.token == null) {
            this.#pendingRebuild = window.setTimeout(this.rebuild, 1000);
            return;
        }

        this.#pendingRebuild = undefined;
        this.rebuild();
    }

    /** Whether the stat block has active rebuild warnings */
    get hasWarnings() { return (Object.keys(this.#warnings ?? {}).length > 0); }

    /** Whether or not this stat block is waiting for the game state to reach a point it can rebuild. */
    get needsRebuild() { return this.#needsRebuild; }

    /** Whether the user can contribute to the token. */
    get isContributor() { return (window.DM === true || this.#contributor === true); }

    /** Whether a backing character or monster stat block was found for the token */
    get hasSheet() { return this.#hasSheet; }

    /** The identifier of the character or creature to normalize the stat block for. */
    get id() { return this.#id; }

    /** Whether the stat block is for a player */
    get isPlayer() { return this.#player; }

    /** The identifier for the player character within D&D Beyond when applicable */
    get characterId() { return this.#characterId; }

    /** The URI for for the player character when applicable */
    get characterUri() { return this.#characterUri; }

    /** The best token to normalize based on. */
    get token() { return this.tokenLocal ?? this.tokenGlobal; }

    /** @type {Token | undefined} The token from the global token store being managed. */
    get tokenGlobal() { return window.all_token_objects[this.#id]; }

    /** @type {Token | undefined} The token from the local token store being managed. */
    get tokenLocal() { return window.TOKEN_OBJECTS[this.#id]; }

    /** The context used for any dice actions performed from this stat block. */
    get diceContext() { return this.#diceContext; }

    /** Gets the name of the token */
    get name() { return this.#name ?? 'Unknown Token'; }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() { return this.#hitPoints; }

    /** Details about the armor class for the creature.*/
    get ac() { return this.#ac; }

    /** The character level or creature challenge rating for the stat block. */
    get level() { return this.#level; }

    /** The proficiency bonus for the stat block. */
    get proficiencyBonus() { return this.#proficiency; }

    /** Details about the initiative for the creature. */
    get initiative() { return this.#initiative; }

    /** The ability scores for the stat block. */
    get scores() { return this.#scores; }

    /** The ability scores for the stat block. */
    get modifiers() { return this.#modifiers; }

    /** The ability scores for the stat block. */
    get saves() { return this.#saves; }

    /** The skill checks for the stat block. */
    get skills() { return this.#skills; }

    /** The current state of condition for the stat block. */
    get conditions() { return this.#conditions; }

    /** The current state of defenses against the various types of damage for the stat block. */
    get defenses() { return this.#defenses; }

    /** The current state of movement speeds. */
    get movement() { return this.#movement; }

    /** The manager for active, passive, and maintained token status effects. */
    get statusEffects() { return this.#effects; }

    /** Gets the best options container for the stat block. */
    getOptions() {
        return this.#getPlayerOptions() ?? this.token?.options;
    }

    /** Gets the player metadata stored at the campaign level. */
    #getPlayerOptions() {
        if (this.#characterId == null) {
            return undefined;
        }

        let container = window.AVTT_CAMPAIGN_INFO.characters;
        if (container == null) {
            container = { };
            window.AVTT_CAMPAIGN_INFO.characters = container;
        }

        let options = container[this.#characterId];
        if (options == null) {
            options = { };
            container[this.#characterId] = options;
        }

        return options;
    }

    /**
     * Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance
     * @returns Whether the stat block requested to be synced.
    */
    sync() {
        return this.#syncWithCallback('sync', (target) => target.sync());
    }

    /**
     * Requests a token update message to be dispatched and updates any related interface components 
     * only if there are pending changes that have been observed by this instance
     * @returns Whether the stat block requested to be synced.
     */
    update_and_sync() {
        return this.#syncWithCallback('update_and_sync', (target) => target.update_and_sync());
    }

    /**
     * Performs the sync operation using the provided callback.
     * @param {string} failureUri - The URI to put into the warnings collection if the sync process fails.
     * @param {(target: Token) => void} callback - The callback made to sync the stat block
     */
    #syncWithCallback(failureUri, callback) {
        if (this.#pendingChanges === undefined) {
            return false;
        }

        const fromLocal = this.tokenLocal;
        const fromGlobal = this.tokenGlobal;
        const target = fromLocal ?? fromGlobal;
    
        if (target == null) {
            return false;
        }

        const current = this.#pendingChanges;
        this.#pendingChanges = undefined;

        // Supress the update process if the main token sync already fired.
        if ((target.options.lastModified ?? 0) >= current) {
            return false;
        }

        this.#cloneOptionData(fromLocal, fromGlobal);

        try {
            callback(target);
            delete this.#warnings[failureUri];
        } catch (error) {
            this.reportFailure(failureUri, `Failed to sync options data`, error);
        }

        return true;
    }

    /**
     * Creates a structured clone of stat block related information on the source and sets the appropriate properties on the destination.
     * @param {Token} source - The instance to clone information from.
     * @param {Token} destination - The instance to clone information to.
     */
    #cloneOptionData(source, destination) {
        if (source == null || destination == null || source === destination) {
            return;
        }

        destination.status_effects = structuredClone(source.status_effects);
        destination.hpSnapshot = structuredClone(source.hpSnapshot);
        destination.snapshots = structuredClone(source.snapshots);
    }

    /**
     * Sends the appropriate notification event to the user and mark the stat block with a failure state.
     * @param {string} eventType - The type of event that failed to complete successfully.
     * @param {string} message - The message to report to the user
     * @param {Error} error - The error that was encountered
     */
    reportFailure(eventType, message, error) {
        const target = this.token;
        message = `${message ?? 'Unknown exception encountered'} for ${target?.options?.name ?? 'Unnamed Token'} => ${target?.options?.id ?? ''}`;

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
        if (!DiceActionsEnabled) {
            return;
        }

        if (modified === true) {
            this.#pendingChanges = Date.now();
        }
    }

    /** Generates a snapshot of the creature stat block using the current calculated values. */
    getNormalizedSheet() {
        const pb = this.#proficiency.current ?? 2;

        const getSave = (save, abilityMod) => {
            const bonusAmount = save.bonus ?? 0;
            const profAmount = (pb * (save.proficiency ?? 0));
            const total = abilityMod + bonusAmount + profAmount;

            return { total, proficiency: profAmount, bonus: bonusAmount };
        };

        const getScore = (score, modifier, save) => {
            const modValue = modifier.value.current ?? 0;

            return {
                score: score.current ?? 10,
                modifier: modifier.value.current ?? 0,
                save: getSave(save, modValue)
            };
        };

        const getSkill = (skill) => {
            const abiltyMod = this.#modifiers[skill.ability]?.value;
            const modValue = abiltyMod?.current ?? 0
            const bonusAmount = skill.bonus ?? 0;
            const profAmount = (pb * (skill.proficiency ?? 0));
            const total = modValue + bonusAmount + profAmount;

            return { total, proficiency: profAmount, bonus: bonusAmount, modifier: skill.ability };
        };

        const getCondition = (condition) => {
            return {
                active: condition.isActive, 
                intensity: condition.isActive ? condition.intensity : 0, 
                immune: condition.immune
            }
        };

        const getDefense = (defense) => {
            return {
                immune: defense.immune, 
                resistant: defense.resistant, 
                vulnerable: defense.vulnerable
            }
        };

        return {
            hasSheet: this.#hasSheet,
            proficiencyBonus: pb,
            level: this.#level ?? 0,
            ac: this.#ac.current ?? 10,
            hp: {
                maximum: this.#hitPoints.maximum,
                remaining: this.#hitPoints.remaining,
                temp: this.#hitPoints.temp,
                total: this.#hitPoints.total
            },
            scores: {
                str: getScore(this.#scores.str, this.#modifiers.str, this.#saves.str),
                dex: getScore(this.#scores.dex, this.#modifiers.dex, this.#saves.dex),
                con: getScore(this.#scores.con, this.#modifiers.con, this.#saves.con),
                wis: getScore(this.#scores.wis, this.#modifiers.wis, this.#saves.wis),
                int: getScore(this.#scores.int, this.#modifiers.int, this.#saves.int),
                cha: getScore(this.#scores.cha, this.#modifiers.cha, this.#saves.cha)
            },
            skills: {
                acrobatics: getSkill(this.#skills.acrobatics),
                animal_handling: getSkill(this.#skills.animalHandling),
                arcana: getSkill(this.#skills.arcana),
                athletics: getSkill(this.#skills.athletics),
                deception: getSkill(this.#skills.deception),
                history: getSkill(this.#skills.history),
                insight: getSkill(this.#skills.insight),
                intimidation: getSkill(this.#skills.intimidation),
                investigation: getSkill(this.#skills.investigation),
                medicine: getSkill(this.#skills.medicine),
                nature: getSkill(this.#skills.nature),
                perception: getSkill(this.#skills.perception),
                performance: getSkill(this.#skills.performance),
                persuasion: getSkill(this.#skills.persuasion),
                religion: getSkill(this.#skills.religion),
                sleight_of_hand: getSkill(this.#skills.sleightOfHand),
                stealth: getSkill(this.#skills.stealth),
                survival: getSkill(this.#skills.survival)
            },
            conditions: {
                blinded: getCondition(this.#conditions.blinded),
                charmed: getCondition(this.#conditions.charmed),
                deafened: getCondition(this.#conditions.deafened),
                exhaustion: getCondition(this.#conditions.exhaustion),
                frightened: getCondition(this.#conditions.frightened),
                grappled: getCondition(this.#conditions.grappled),
                incapacitated: getCondition(this.#conditions.incapacitated),
                invisible: getCondition(this.#conditions.invisible),
                paralyzed: getCondition(this.#conditions.paralyzed),
                petrified: getCondition(this.#conditions.petrified),
                poisoned: getCondition(this.#conditions.poisoned),
                prone: getCondition(this.#conditions.prone),
                restrained: getCondition(this.#conditions.restrained),
                stunned: getCondition(this.#conditions.stunned),
                unconscious: getCondition(this.#conditions.unconscious)
            },
            defenses: {
                slashing: getDefense(this.#defenses.slashing),
                piercing: getDefense(this.#defenses.piercing),
                bludgeoning: getDefense(this.#defenses.bludgeoning),
                acid: getDefense(this.#defenses.acid),
                cold: getDefense(this.#defenses.cold),
                fire: getDefense(this.#defenses.fire),
                force: getDefense(this.#defenses.force),
                lightning: getDefense(this.#defenses.lightning),
                necrotic: getDefense(this.#defenses.necrotic),
                poison: getDefense(this.#defenses.poison),
                psychic: getDefense(this.#defenses.psychic),
                radiant: getDefense(this.#defenses.radiant),
                thunder: getDefense(this.#defenses.thunder)
            },
            movement: {
                walk: this.#movement.walk.current,
                crawl: this.#movement.crawl.current,
                climb: this.#movement.climb.current,
                swim: this.#movement.swim.current,
                burrow: this.#movement.burrow.current,
                fly: this.#movement.fly.current,
                hover: this.#movement.hover.enabled
            }
        };
    }

    /**
     * Retrieves a property from the stat block that implements a numeric value.
     * @param {string} uri - The identifier of the property on the stat block that implements a numeric value.
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
     */
    getOrAddNumeric(uri, init) {
        if (uri && typeof uri === 'object' && 'uri' in uri) {
            uri = uri.uri;
        }

        uri = uri.toLowerCase();
        let property = this.#numeric[uri];
        if (property == null && typeof init === 'function') {
            property = init(this, uri);
            this.#numeric[uri] = property;
        }

        return property;
    }

    /** A snapshot of the current initiative order in the combat tracker */
    getCurrentInitiative() {
        return StatBlock.getTokenInitiative(this.token);
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
        if (window.pcs == null) {
            return undefined;
        }

        const expected = this.#id.toLowerCase();
        return window.pcs.find((entry) => uriEquals(entry.sheet, expected));
    }

    /** Retrieves the extended player character sheet information from D&D Beyond */
    getPlayerExtended() {
        const main = this.getPlayerSheet();
        if (main == null) {
            return undefined;
        }

        return fetchPlayerExtendedSheet(main.characterId);
    }

    /** Retrieves the common D&D Beyond monster stat block if the token is an instance of one */
    getBeyondMonster() { return fetchBeyondSheetForToken(this.token); }

    /** Retrieves the common Open 5E stat block if the token is an instance of one */
    getOpen5e() { return fetchOpen5eSheetForToken(this.token); }

    /** Rebuilds the stat block for the token */
    rebuild() {
        if (!DiceActionsEnabled) {
            return;
        }

        try {
            const player = this.getPlayerSheet();
            const tokenOptions = this.token?.options;
            if (player == null && tokenOptions == null) {
                this.#needsRebuild = true;
                return;
            }

            this.#needsRebuild = false;

            this.#name = player?.name ?? tokenOptions?.name;
            this.#characterId = player?.characterId?.toString();
            this.#characterUri = player?.sheet;
            this.#player = (player != null || (tokenOptions.characterId != null && tokenOptions.itemType === 'pc'));
            this.#contributor = (
                window.DM === true || tokenOptions?.player_owned === true ||
                (window.PLAYER_ID != null && tokenOptions?.characterId?.toString() === window.PLAYER_ID.toString())
            );

            const sheets = { tokenOptions, player, playerExt: undefined, playerOptions: undefined };

            if (this.#player) {
                sheets.playerOptions = this.#getPlayerOptions();

                if (player?.hitPointInfo != null) {
                    // Snapshotting the base total HP because some messages are removing.
                    sheets.playerOptions.baseTotalHp = player.hitPointInfo.baseTotalHp ?? sheets.playerOptions.baseTotalHp;
                    sheets.playerOptions.hitPointInfo = { ...player.hitPointInfo };
                }
            }

            if (this.#contributor) {
                if (this.#player) {
                    sheets.playerExt = fetchPlayerExtendedSheet(player.characterId);
                } else {
                    sheets.open5e = this.getOpen5e();
                    sheets.monster = this.getBeyondMonster();
                }
            }

            this.#hasSheet = ((sheets.player ?? sheets.playerExt ?? sheets.open5e ?? sheets.monster) != null);

            const normalize = new StatNormalization(this, sheets, this.#player);
            normalize.rebuild();
            this.#level = normalize.level;

            delete this.#warnings['rebuild'];
        } catch (error) {
            this.reportFailure('rebuild', `Failed to rebuild character sheet`, error);
        }

        this.recalculate();
    }

    /** Recalculates the values for the properties within the stat block after changes have been applied. */
    recalculate() {
        if (!DiceActionsEnabled || this.#needsRebuild) {
            return;
        }

        try {
            this.#effects.reapply();

            this.#conditions.recalculate();

            for (const defense of Object.values(this.#defenses)) {
                defense.recalculate();
            }

            for (const wellKnown of this.#wellKnownNumerics) {
                wellKnown.recalculate();
            }

            for (const numeric of Object.values(this.#numeric)) {
                numeric.recalculate();
            }

            for (const wellKnown of this.#wellKnownToggles) {
                wellKnown.recalculate();
            }

            this.#hitPoints.checkMaximum();

            delete this.#warnings['recalculate'];
        } catch (error) {
            this.reportFailure('recalculate', `Failed to recalculate status efforts`, error);
        }

        this.sync();
    }
}

/** Defines the ability scores associated with a stat block. */
class BlockAbilityScores {
    constructor(stats) {
        this.str = new NumericStatTracker(stats, 'str', 10, 'Strength');
        this.dex = new NumericStatTracker(stats, 'dex', 10, 'Dexterity');
        this.con = new NumericStatTracker(stats, 'con', 10, 'Constitution');
        this.wis = new NumericStatTracker(stats, 'wis', 10, 'Wisdom');
        this.int = new NumericStatTracker(stats, 'int', 10, 'Intellegence');
        this.cha = new NumericStatTracker(stats, 'cha', 10, 'Charisma');
        Object.freeze(this);
    }
}

/** Defines the ability modifiers associated with a stat block. */
class BlockAbilityModifiers {
    constructor(stats) {
        this.str = new BlockAbilityModifier(stats, 'str', 'Strength Ability Check');
        this.dex = new BlockAbilityModifier(stats, 'dex', 'Dexterity Ability Check');
        this.con = new BlockAbilityModifier(stats, 'con', 'Constitution Ability Check');
        this.wis = new BlockAbilityModifier(stats, 'wis', 'Wisdom Ability Check');
        this.int = new BlockAbilityModifier(stats, 'int', 'Intellegence Ability Check');
        this.cha = new BlockAbilityModifier(stats, 'cha', 'Charisma Ability Check');
        Object.freeze(this);
    }
}

/** Defines an ability modifier associated with a stat block. */
class BlockAbilityModifier {
    /** @param {StatBlock} stats */
    constructor(stats, uri, name) {
        this.value = new NumericStatTracker(stats, `${uri}:modifier`, 0, name);

        this.check = new DiceAction(stats.diceContext, `${uri}:check`, name, true, uri, true);
        this.check.tags.addRange([ 'ability', uri ]);
        this.check.tagFreeze();

        Object.freeze(this);
    }

    /** Tracks the value for the ability score modifier. */
    value;
    /** Performs a d20 test using the ability score modifier.*/
    check;
    /** The current value of the property adjusted for a snapshot at the time an effect was applied. */
    get current() { return this.value.current; }
    /** The base value of the property. */
    get base() { return this.value.base; }
}

/** Defines the saving throws associated with a stat block. */
class BlockSavingThrows {
    /** @param {StatBlock} stats */
    constructor(stats) {
        this.str = new DiceAction(stats.diceContext, 'str:save', 'Strength Saving Throw', true, 'str', true);
        this.dex = new DiceAction(stats.diceContext, 'dex:save', 'Dexterity Saving Throw', true, 'dex', true);
        this.con = new DiceAction(stats.diceContext, 'con:save', 'Constitution Saving Throw', true, 'con', true);
        this.wis = new DiceAction(stats.diceContext, 'wis:save', 'Wisdom Saving Throw', true, 'wis', true);
        this.int = new DiceAction(stats.diceContext, 'int:save', 'Intellegence Saving Throw', true, 'int', true);
        this.cha = new DiceAction(stats.diceContext, 'cha:save', 'Charisma Saving Throw', true, 'cha', true);
        this.death = new DiceAction(stats.diceContext, 'death:save', 'Death Saving Throw', true, undefined, false);

        for (const stat of Object.values(this)) {
            if (!(stat instanceof DiceAction) || typeof stat.ability !== 'string') {
                continue;
            }

            stat.tags.addRange([ 'save', stat.ability ])
            stat.tagFreeze();
        }

        this.death.tags.addRange([ 'save', 'death' ])
        this.death.tagFreeze();

        Object.freeze(this);
    }
}

/** Defines the skills associated with a stat block. */
class BlockSkillChecks {
    /** @param {StatBlock} stats */
    constructor(stats) {
        this.acrobatics = new DiceAction(stats.diceContext, 'acrobatics', 'Acrobatics', true, 'dex', false);
        this.animalHandling = new DiceAction(stats.diceContext, 'animal_handling', 'Animal Handling', true, 'wis', false);
        this.arcana = new DiceAction(stats.diceContext, 'arcana', 'Arcana', true, 'int', false);
        this.athletics = new DiceAction(stats.diceContext, 'athletics', 'Athletics', true, 'str', false);
        this.deception = new DiceAction(stats.diceContext, 'deception', 'Deception', true, 'cha', false);
        this.history = new DiceAction(stats.diceContext, 'history', 'History', true, 'int', false);
        this.insight = new DiceAction(stats.diceContext, 'insight', 'Insight', true, 'wis', false);
        this.intimidation = new DiceAction(stats.diceContext, 'intimidation', 'Intimidation', true, 'cha', false);
        this.investigation = new DiceAction(stats.diceContext, 'investigation', 'Investigation', true, 'int', false);
        this.medicine = new DiceAction(stats.diceContext, 'medicine', 'Medicine', true, 'wis', false);
        this.nature = new DiceAction(stats.diceContext, 'nature', 'Nature', true, 'int', false);
        this.perception = new DiceAction(stats.diceContext, 'perception', 'Perception', true, 'wis', false);
        this.performance = new DiceAction(stats.diceContext, 'performance', 'Performance', true, 'cha', false);
        this.persuasion = new DiceAction(stats.diceContext, 'persuasion', 'Persuasion', true, 'cha', false);
        this.religion = new DiceAction(stats.diceContext, 'religion', 'Religion', true, 'int', false);
        this.sleightOfHand = new DiceAction(stats.diceContext, 'sleight_of_hand', 'Sleight of Hand', true, 'dex', false);
        this.stealth = new DiceAction(stats.diceContext, 'stealth', 'Stealth', true, 'dex', false);
        this.survival = new DiceAction(stats.diceContext, 'survival', 'Survival', true, 'wis', false);

        for (const stat of Object.values(this)) {
            if (!(stat instanceof DiceAction)) {
                continue;
            }

            stat.tags.addRange([ 'skill', stat.uri ])
            stat.tagFreeze();
        }

        Object.freeze(this);
    }
}

/** Defines the standard set of conditions that can be applied to a stat block. */
class BlockConditions {
    /** @param {StatBlock} stats */
    constructor(stats) {
        this.blinded = new ConditionTracker(stats, 'blinded', 'Blinded', BlindedDice);
        this.charmed = new ConditionTracker(stats, 'charmed', 'Charmed', CharmedDice);
        this.deafened = new ConditionTracker(stats, 'deafened', 'Deafened', DeafenedDice);
        this.exhaustion = new ConditionTracker(stats, 'exhaustion', 'Exhaustion', ExhaustionDice);
        this.frightened = new ConditionTracker(stats, 'frightened', 'Frightened', FrightenedDice);
        this.grappled = new ConditionTracker(stats, 'grappled', 'Grappled', GrappledDice);
        this.incapacitated = new ConditionTracker(stats, 'incapacitated', 'Incapacitated', IncapacitatedDice);
        this.invisible = new ConditionTracker(stats, 'invisible', 'Invisible', InvisibleDice);
        this.paralyzed = new ConditionTracker(stats, 'paralyzed', 'Paralyzed', ParalyzedDice);
        this.petrified = new ConditionTracker(stats, 'petrified', 'Petrified', PetrifiedDice);
        this.poisoned = new ConditionTracker(stats, 'poisoned', 'Poisoned', PoisonedDice);
        this.prone = new ConditionTracker(stats, 'prone', 'Prone', ProneDice);
        this.restrained = new ConditionTracker(stats, 'restrained', 'Restrained', RestrainedDice);
        this.stunned = new ConditionTracker(stats, 'stunned', 'Stunned', StunnedDice);
        this.unconscious = new ConditionTracker(stats, 'unconscious', 'Unconscious', UnconsciousDice);

        Object.freeze(this);
    }

    recalculate() {
        // Start with conditions that can affect other conditions
        this.petrified.recalculate();
        this.unconscious.recalculate();

        // Process conditions with stand alone effects
        this.blinded.recalculate();
        this.charmed.recalculate();
        this.deafened.recalculate();
        this.exhaustion.recalculate();
        this.frightened.recalculate();
        this.grappled.recalculate();
        this.incapacitated.recalculate();
        this.invisible.recalculate();
        this.paralyzed.recalculate();
        this.poisoned.recalculate();
        this.prone.recalculate();
        this.restrained.recalculate();
        this.stunned.recalculate();
    }
}

/** Defines the standard set of defenses agaist damage type that can be applied to a stat block. */
class BlockDefenses {
    /** @param {StatBlock} stats */
    constructor(stats) {
        this.slashing = new DefenseTracker(stats, 'slashing', 'Slashing');
        this.piercing = new DefenseTracker(stats, 'piercing', 'Piercing');
        this.bludgeoning = new DefenseTracker(stats, 'bludgeoning', 'Bludgeoning');
        this.acid = new DefenseTracker(stats, 'acid', 'Acid');
        this.cold = new DefenseTracker(stats, 'cold', 'Cold');
        this.fire = new DefenseTracker(stats, 'fire', 'Fire');
        this.force = new DefenseTracker(stats, 'force', 'Force');
        this.lightning = new DefenseTracker(stats, 'lightning', 'Lightning');
        this.necrotic = new DefenseTracker(stats, 'necrotic', 'Necrotic');
        this.poison = new DefenseTracker(stats, 'poison', 'Poison');
        this.psychic = new DefenseTracker(stats, 'psychic', 'Psychic');
        this.radiant = new DefenseTracker(stats, 'radiant', 'Radiant');
        this.thunder = new DefenseTracker(stats, 'thunder', 'Thunder');

        Object.freeze(this);
    }
}

/** Defines the standard set of movement options that can be applied to a stat block. */
class BlockMovement {
    /** @param {StatBlock} stats */
    constructor(stats) {
        this.walk = new NumericStatTracker(stats, 'speed:walk', 30, 'Walk');
        this.crawl = new NumericStatTracker(stats, 'speed:crawl', 15, 'Crawl');
        this.climb = new NumericStatTracker(stats, 'speed:climb', 15, 'Climb');
        this.swim = new NumericStatTracker(stats, 'speed:swim', 15, 'Swim');
        this.burrow = new NumericStatTracker(stats, 'speed:burrow', 0, 'Burrow');
        this.fly = new NumericStatTracker(stats, 'speed:fly', 0, 'Fly');
        this.hover = new ToggleTracker(stats, 'speed:toggle', 'Hover');

        Object.freeze(this);
    }
}

/** Defines the information from a creature stat block that is needed for a dice action to be executed. */
class BlockDiceContext extends DiceActionContext {
    #stats;

    /** @param {StatBlock} stats  */
    constructor(stats) {
        super();
        this.#stats = stats;
        Object.freeze(this);
    }

    /** The level of the creature performing the action. */
    get level() { return this.#stats.level; }

    /** Gets the numeric value associated with the provided URI if one exists.
     * @param {string} uri - The value to lookup within the context.
     * @returns {number}
     */
    getNumericValue(uri) { throw new Error('Not Implemented'); }

    /** The collection of available dice action modifiers
     * @returns {DiceActionModifier[]} */
    listActionModifiers() { throw new Error('Not Implemented'); }

    /** The collection of available dice roll modifiers
     * @returns {DiceRollModifier[]} */
    listRollModifiers() { throw new Error('Not Implemented'); }
}

// Addressing compatibility issues
window.initStatBlock = GetStatBlock;
window.statNormalizationEnabled = DiceActionsEnabled;