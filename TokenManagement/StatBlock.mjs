/** @import { Token } from './Token.types.js' */

import { fetchBeyondSheetForToken, fetchOpen5eSheetForToken, fetchPlayerExtendedSheet } from './StatBlockSources.mjs';
import { DiceActionsEnabled, AbilityScore, ConditionType, DamageType, ProficiencyType, SkillCheck, uriEquals, Movement } from './CoreEnums.mjs'
import HitPointBlock from './HitPointBlock.mjs';
import ConditionTracker, { BlindedDice, CharmedDice, DeafenedDice, ExhaustionDice, FrightenedDice, GrappledDice, IncapacitatedDice, InvisibleDice, ParalyzedDice, PetrifiedDice, PoisonedDice, ProneDice, RestrainedDice, StunnedDice, UnconsciousDice } from './ConditionTracker.mjs';
import NumericStatTracker from './NumericStatTracker.mjs';
import TokenStatusEffects from './TokenStatusEffects.mjs';
import { DiceAction, DiceActionContext } from './DiceAction.mjs';
import DefenseTracker from './DefenseTracker.mjs';
import ToggleTracker from './ToggleTracker.mjs';

/** Manages a normalized stat block for the provided token by importing details from associated creature stat blocks */
export default class StatBlock {
    #token;
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

    /** @type {number | undefined} Timestamp when the stat block was notified of a pending change */
    #pendingChanges;
    /** @type {{ [uri: string]: NumericStatTracker}} */
    #numeric;
    /** @type {{ [uri: string]: { message: string, error: Error }}} Components within the stat block that failed to complete successuflly */
    #warnings;

    /** @param {Token} token - The token to normalize the stat block for. */
    constructor(token){
        this.#token = token;

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

        this.rebuild();
    }

    /**
     * Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance
     * @returns Whether the stat block requested to be synced.
    */
    sync() {
        if (this.#pendingChanges !== undefined) {
            const current = this.#pendingChanges;
            this.#pendingChanges = undefined;

            if ((this.#token.options.lastModified ?? 0) >= current) {
                return false;
            }

            console.log(`Syncing ${current} > ${this.#token.options.lastModified}`);
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
     * @returns Whether the stat block requested to be synced.
     */
    update_and_sync() {
        if (this.#pendingChanges !== undefined) {
            const current = this.#pendingChanges;
            this.#pendingChanges = undefined;

            if ((this.#token.options.lastModified ?? 0) >= current) {
                return false;
            }

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
     * @param {string} eventType - The type of event that failed to complete successfully.
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
        if (!DiceActionsEnabled) {
            return;
        }

        if (modified === true) {
            this.#pendingChanges = Date.now();
        }
    }

    /** Whether the stat block has active rebuild warnings */
    get hasWarnings() { return (Object.keys(this.#warnings ?? {}).length > 0); }

    /** The token that is being managed */
    get token() { return this.#token; }

    /** Whether the stat block is for a player */
    get isPlayer() { return this.#player; }

    /** Whether the user can contribute to the token. */
    get isContributor() { return (window.DM === true || this.#contributor === true); }

    /** Whether a backing character or monster stat block was found for the token */
    get hasSheet() { return this.#hasSheet; }

    /** The context used for any dice actions performed from this stat block. */
    get diceContext() { return this.#diceContext; }

    /** Gets the name of the token */
    get name() { return this.#token.options.name ?? 'Unknown Token'; }

    /** Details about the current state of the creature's hit points and associated controls. */
    get hp() { return this.#hitPoints; }

    /** Details about the current armor class for the creature.*/
    get ac() { return this.#ac.current ?? 10; }

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
        if (!DiceActionsEnabled) {
            return;
        }

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

            this.#hasSheet = ((sheets.player ?? sheets.playerExt ?? sheets.open5e ?? sheets.monster) != null);
            sheets.pb = this.#refreshLevel(sheets);

            const ac = options.armorClass ?? player?.armorClass ?? monster?.armorClass ?? 
                open5e?.armor_class ?? open5e?.armorClass ?? 10;
            this.#updateNumeric(this.#ac, ac);

            const totalHp = options.hitPointInfo?.maximum ?? player?.hitPointInfo?.maximum ?? 0;
            this.#updateNumeric(this.#hitPoints.maximumChanges, totalHp);

            this.#refreshAbility(AbilityScore.STR, this.#scores.str, this.#modifiers.str, this.#saves.str, sheets);
            this.#refreshAbility(AbilityScore.DEX, this.#scores.dex, this.#modifiers.dex, this.#saves.dex, sheets);
            this.#refreshAbility(AbilityScore.CON, this.#scores.con, this.#modifiers.con, this.#saves.con, sheets);
            this.#refreshAbility(AbilityScore.WIS, this.#scores.wis, this.#modifiers.wis, this.#saves.wis, sheets);
            this.#refreshAbility(AbilityScore.INT, this.#scores.int, this.#modifiers.int, this.#saves.int, sheets);
            this.#refreshAbility(AbilityScore.CHA, this.#scores.cha, this.#modifiers.cha, this.#saves.cha, sheets);

            this.#refreshSkill(SkillCheck.Acrobatics, this.#skills.acrobatics, sheets);
            this.#refreshSkill(SkillCheck.AnimalHandling, this.#skills.animalHandling, sheets);
            this.#refreshSkill(SkillCheck.Arcana, this.#skills.arcana, sheets);
            this.#refreshSkill(SkillCheck.Athletics, this.#skills.athletics, sheets);
            this.#refreshSkill(SkillCheck.Deception, this.#skills.deception, sheets);
            this.#refreshSkill(SkillCheck.History, this.#skills.history, sheets);
            this.#refreshSkill(SkillCheck.Insight, this.#skills.insight, sheets);
            this.#refreshSkill(SkillCheck.Intimidation, this.#skills.intimidation, sheets);
            this.#refreshSkill(SkillCheck.Investigation, this.#skills.investigation, sheets);
            this.#refreshSkill(SkillCheck.Medicine, this.#skills.medicine, sheets);
            this.#refreshSkill(SkillCheck.Nature, this.#skills.nature, sheets);
            this.#refreshSkill(SkillCheck.Perception, this.#skills.perception, sheets);
            this.#refreshSkill(SkillCheck.Performance, this.#skills.performance, sheets);
            this.#refreshSkill(SkillCheck.Persuasion, this.#skills.persuasion, sheets);
            this.#refreshSkill(SkillCheck.Religion, this.#skills.religion, sheets);
            this.#refreshSkill(SkillCheck.SleightOfHand, this.#skills.sleightOfHand, sheets);
            this.#refreshSkill(SkillCheck.Stealth, this.#skills.stealth, sheets);
            this.#refreshSkill(SkillCheck.Survival, this.#skills.survival, sheets);

            this.#refreshCondition(this.#conditions.blinded, ConditionType.Blinded, sheets);
            this.#refreshCondition(this.#conditions.charmed, ConditionType.Charmed, sheets);
            this.#refreshCondition(this.#conditions.deafened, ConditionType.Deafened, sheets);
            this.#refreshCondition(this.#conditions.exhaustion, ConditionType.Exhaustion, sheets);
            this.#refreshCondition(this.#conditions.frightened, ConditionType.Frightened, sheets);
            this.#refreshCondition(this.#conditions.grappled, ConditionType.Grappled, sheets);
            this.#refreshCondition(this.#conditions.incapacitated, ConditionType.Incapacitated, sheets);
            this.#refreshCondition(this.#conditions.invisible, ConditionType.Invisible, sheets);
            this.#refreshCondition(this.#conditions.paralyzed, ConditionType.Paralyzed, sheets);
            this.#refreshCondition(this.#conditions.petrified, ConditionType.Petrified, sheets);
            this.#refreshCondition(this.#conditions.poisoned, ConditionType.Poisoned, sheets);
            this.#refreshCondition(this.#conditions.prone, ConditionType.Prone, sheets);
            this.#refreshCondition(this.#conditions.restrained, ConditionType.Restrained, sheets);
            this.#refreshCondition(this.#conditions.stunned, ConditionType.Stunned, sheets);
            this.#refreshCondition(this.#conditions.unconscious, ConditionType.Unconscious, sheets);

            this.#refreshDefenses(this.#defenses.slashing, DamageType.Slashing, sheets);
            this.#refreshDefenses(this.#defenses.piercing, DamageType.Piercing, sheets);
            this.#refreshDefenses(this.#defenses.bludgeoning, DamageType.Bludgeoning, sheets);
            this.#refreshDefenses(this.#defenses.acid, DamageType.Acid, sheets);
            this.#refreshDefenses(this.#defenses.cold, DamageType.Cold, sheets);
            this.#refreshDefenses(this.#defenses.fire, DamageType.Fire, sheets);
            this.#refreshDefenses(this.#defenses.force, DamageType.Force, sheets);
            this.#refreshDefenses(this.#defenses.lightning, DamageType.Lightning, sheets);
            this.#refreshDefenses(this.#defenses.necrotic, DamageType.Necrotic, sheets);
            this.#refreshDefenses(this.#defenses.poison, DamageType.Poison, sheets);
            this.#refreshDefenses(this.#defenses.psychic, DamageType.Psychic, sheets);
            this.#refreshDefenses(this.#defenses.radiant, DamageType.Radiant, sheets);
            this.#refreshDefenses(this.#defenses.thunder, DamageType.Thunder, sheets);

            this.#refreshMovement(this.#movement.walk, Movement.Walk, sheets);
            this.#refreshMovement(this.#movement.crawl, Movement.Crawl, sheets);
            this.#refreshMovement(this.#movement.climb, Movement.Climb, sheets);
            this.#refreshMovement(this.#movement.swim, Movement.Swim, sheets);
            this.#refreshMovement(this.#movement.burrow, Movement.Burrow, sheets);
            this.#refreshMovement(this.#movement.fly, Movement.Fly, sheets);
            this.#refreshMovement(this.#movement.hover, Movement.Hover, sheets);

            delete this.#warnings['rebuild'];
        } catch (error) {
            this.reportFailure('rebuild', `Failed to rebuild character sheet`, error);
        }

        this.recalculate();
    }

    /** Recalculates the values for the properties within the stat block after changes have been applied. */
    recalculate() {
        if (!DiceActionsEnabled) {
            return;
        }

        try {
            for (const condition of Object.values(this.#conditions)) {
                condition.recalculate();
            }

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
     * @param {string | NumericStatTracker} tracker 
     * @param {number} value 
     * @return {NumericStatTracker}
     */
    #updateNumeric(tracker, value) {
        if (typeof value === 'string') {
            value = parseFloat(value);
        }

        if (typeof tracker === 'string') {
            const uri = tracker.toLowerCase();
            tracker = this.#numeric[tracker];
            if (tracker == null) {
                tracker = new NumericStatTracker(this, uri, value);
                this.#numeric[uri] = tracker;
            }
        }

        tracker.setBaseValue(value);

        const snapshots = this.#token.options.snapshots?.numeric;
        if (snapshots != null) {
            if (this.#player) {
                tracker.setSnapshot(snapshots[tracker.uri], false);
            } else if (tracker.uri in snapshots) {
                tracker.setSnapshot(undefined, true);
            }
        }

        return tracker;
    }

    /**
     * Retrieves either the level or challenge rating from the appropriate sheet for the token
     * @param {Object} sheets - The sheet information for the token.
     * @returns {number} The proficiency bonus for the token
    */
    #refreshLevel(sheets) {
        if (sheets.player) {
            const pb = sheets.player.proficiencyBonus ?? 2;
            this.#level = sheets.player.level ?? 1;
            this.#updateNumeric(this.#proficiency, pb);
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
                if (cr < 0) {
                    cr = 0;
                }

                pb = 1 + Math.ceil((cr > 0 ? cr : 1) / 4);
            }

            this.#level = cr;
            this.#updateNumeric(this.#proficiency, pb ?? 2);
            return pb;
        }

        if (sheets.open5e) {
            const cr = sheets.open5e.challenge_rating ?? 0;
            let pb = sheets.open5e.proficiency_bonus;
            if (pb == null) {
                pb = 1 + Math.ceil((cr > 0 ? cr : 1) / 4);
            }

            this.#level = cr;
            this.#updateNumeric(this.#proficiency, pb ?? 2);
            return pb;
        }

        this.#level = 0;
        this.#updateNumeric(this.#proficiency, 2);
        return 2;
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {Object} config - The ability score to update.
     * @param {NumericStatTracker} score - The ability modifier to update.
     * @param {BlockAbilityModifier} modifier - The ability modifier to update.
     * @param {DiceAction} save - The ability modifier to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAbility(config, score, modifier, save, sheets) {
        this.#refreshAbilityScore(config, score, sheets);
        this.#refreshAbilityModifier(config, score, modifier, sheets);
        this.#refreshSaveModifiers(config, save, modifier, sheets);
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {Object} config - The ability score to update.
     * @param {NumericStatTracker} score - The ability modifier to update.
     * @param {Object} sheets - The sheet information for the token.
     * @returns {NumericStatTracker}
     */
    #refreshAbilityScore(config, score, sheets) {
        const expected = config.uri.toLowerCase();
        let value = sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            sheets.monster?.stats?.find((entry) => (entry.statId === config.dndBeyond))?.value ??
            sheets.open5e?.ability_scores?.[config.open5e] ??
            10;

        this.#updateNumeric(score, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {Object} config - The configuration for the ability score.
     * @param {NumericStatTracker} score - The ability score that is used to determine the baseline modifier when overrides are not present.
     * @param {BlockAbilityModifier} modifier - The ability modifier to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshAbilityModifier(config, score, modifier, sheets) {
        const expected = config.uri.toLowerCase();
        let value = sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier ??
            sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier ??
            sheets.open5e?.modifiers?.[config.open5e];

        if (value == null) {
            value = Math.floor((score.base - 10) / 2);
        }

        this.#updateNumeric(modifier.value, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {Object} config - The configuration for the ability score.
     * @param {DiceAction} save - The ability modifier to update.
     * @param {BlockAbilityModifier} modifier - The ability modifier that can be used to determine any bonus values.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshSaveModifiers(config, save, modifier, sheets) {
        if (sheets.monster) {
            const beyondProf = sheets.monster.savingThrows?.find((entry) => (entry.statId === config.dndBeyond));
            save.proficiency = beyondProf != null ? ProficiencyType.Proficient.multiplier : ProficiencyType.None.multiplier;
            save.bonus = beyondProf?.bonusModifier ?? 0;
            return;
        }

        if (sheets.open5e) {
            const openProf = sheets.open5e.saving_throws?.[config.open5e];
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (typeof openProf === 'number') {
                bonus = openProf;

                const abilityMod = this.#modifiers[save.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(sheets.pb));
            }

            save.proficiency = proficiency;
            save.bonus = bonus;
            return;
        }

        const abilityMod = modifier.value.base;
        const proficient = this.#reviewPlayerSaveProficiency(config, sheets);

        const expected = config.uri.toLowerCase();
        let bonus = sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            sheets.options.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            abilityMod;

        // Tear down the full save value to get to the total bonus
        bonus -= abilityMod;
        if (proficient) {
            bonus -= sheets.pb;
        }

        save.proficiency = proficient ? ProficiencyType.Proficient.multiplier : ProficiencyType.None.multiplier;
        save.bonus = bonus;

        return;
    }

    /** Review the extended player character sheet for save proficiencies when it is available */
    #reviewPlayerSaveProficiency(config, sheets) {
        if (typeof config.playerSaveExt !== 'string') {
            return false;
        }

        const profUri = `${config.uri}:save`;
        if (sheets.playerExt == null) {
            return sheets.options.proficiency_ext?.[profUri] === true;
        }

        let proficient = false;
        for (const group of Object.values(sheets.playerExt.modifiers ?? {})) {
            for (const entry of group) {
                if (entry.type?.toLowerCase() === 'proficiency' && entry.subType?.toLowerCase() === config.playerSaveExt) {
                    proficient = true;
                    break;
                }
            }
        }

        const current = sheets.options.proficiency_ext?.[profUri] ?? false;
        if (current !== proficient) {
            if (sheets.options.proficiency_ext == null) {
                sheets.options.proficiency_ext = {};
            }

            if (proficient === true) {
                sheets.options.proficiency_ext[profUri] = true;
            } else {
                delete sheets.options.proficiency_ext[profUri];
            }

            this.hasPendingChanges(true);
        }

        return proficient;
    }

    /**
     * Determines the best skill proficiency value to use for the stat block.
     * @param {Object} config - The configuration for the skill change across sheet types.
     * @param {DiceAction} skill - The dice action associated with the skill check to update.
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshSkill(config, skill, sheets) {
        if (sheets.monster) {
            const beyondProf = sheets.monster.skills?.find((entry) => (entry.skillId === config.dndBeyond));
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (beyondProf != null) {
                bonus = beyondProf.value;

                const abilityMod = this.#modifiers[skill.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(sheets.pb));
            }

            skill.proficiency = proficiency;
            skill.bonus = bonus;
            return;
        }

        if (sheets.open5e) {
            const openProf = sheets.open5e.skill_bonuses?.[config.open5e];
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (typeof openProf === 'number') {
                bonus = openProf;

                const abilityMod = this.#modifiers[skill.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(sheets.pb));
            }

            skill.proficiency = proficiency;
            skill.bonus = bonus;
            return;
        }

        if (sheets.player == null) {
            skill.bonus = 0;
            skill.proficiency = ProficiencyType.None.multiplier;
            return;
        }

        const settings = sheets.player.skills?.find(entry => entry.name?.toLowerCase() === config.player) ?? {};
        skill.bonus = 0;

        if (settings.isExpert === true) {
            skill.proficiency = ProficiencyType.Expert.multiplier;
        } else if (settings.isProficient === true) {
            skill.proficiency = ProficiencyType.Proficient.multiplier;
        } else if (settings.isHalfProficient === true) {
            skill.proficiency = ProficiencyType.Beginner.multiplier;
        } else {
            skill.proficiency = ProficiencyType.None.multiplier;
        }

        return;
    }

    /**
     * Determines whether a condition is applied to the stat block.
     * @param {ConditionTracker} condition - The condition to update.
     * @param {{ srd: string, open5e: string, dndBeyond: number }}} config - Configuration settings for finding the condition on the various sheets
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshCondition(condition, config, sheets) {
        const findUri = (config.srd ?? '').toLowerCase().trim();
        const fromToken = (sheets.player == null && (sheets.options.conditions?.findIndex(entry => entry?.name?.toLowerCase() === findUri) ?? -1) >= 0);
        const player = (sheets.player?.conditions?.find((entry) => entry?.name?.toLowerCase() === findUri));

        let intensity = player?.level;
        if (typeof intensity === 'string') {
            intensity = parseInt(intensity);
        }

        const immunity = (
            (sheets.player?.immunities?.find((entry) => entry?.name?.toLowerCase() === findUri)) ??
            (sheets.monster?.conditionImmunities?.find((entry) => typeof entry === 'number' && entry === config.dndBeyond)) ??
            (sheets.open5e?.resistances_and_immunities?.condition_immunities?.find((entry) => entry?.key?.toLowerCase() === findUri))
        );

        condition.setBaseValue(fromToken, (player != null), intensity, (immunity != null));
    }

    /**
     * Determines whether a defenses against a damage type is applied to the stat block.
     * @param {DefenseTracker} defenses - The condition to update.
     * @param {{ uri: string, srd: string, open5e: string, ddbImmune: number, ddbResist: number, ddbVuln: number }} config
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshDefenses(defenses, config, sheets) {
        if (sheets.monster) {
            const container = sheets.monster.damageAdjustments ?? [];
            if (container.length === 0) {
                defenses.setBaseValue(false, false, false);
                return;
            }

            let immume = false;
            let resist = false;
            let vulnerable = false;

            for (const entry of container) {
                if (entry === config.ddbImmune || entry === DamageType.All.ddbImmune) {
                    immume = true;
                }

                if (entry === config.ddbResist || entry === DamageType.All.ddbResist) {
                    resist = true;
                }

                if (entry === config.ddbVuln) {
                    vulnerable = true;
                }
            }

            defenses.setBaseValue(immume, resist, vulnerable);
            return;
        }

        if (sheets.open5e) {
            const findUri = (config.open5e ?? config.srd ?? config.uri ?? '').toLowerCase().trim();
            const container = sheets.open5e.resistances_and_immunities ?? {};
            const immunity = container.damage_immunities?.find((entry) => entry?.key?.toLowerCase() === findUri);
            const resistance = container.damage_resistances?.find((entry) => entry?.key?.toLowerCase() === findUri);
            const vulnerability = container.damage_vulnerabilities?.find((entry) => entry?.key?.toLowerCase() === findUri);

            defenses.setBaseValue((immunity != null), (resistance != null), (vulnerability != null))
            return;
        }

        if (sheets.player) {
            const findUri = (config.srd ?? config.uri ?? '').toLowerCase().trim();
            const immunity = sheets.player.immunities?.find((entry) => entry?.name?.toLowerCase() === findUri);
            const resistance = sheets.player.resistances?.find((entry) => entry?.name?.toLowerCase() === findUri);
            const vulnerability = sheets.player.vulnerabilities?.find((entry) => entry?.name?.toLowerCase() === findUri);

            defenses.setBaseValue((immunity != null), (resistance != null), (vulnerability != null))
            return;
        }

        defenses.setBaseValue(false, false, false);
    }

    /**
     * Determines whether a defenses against a damage type is applied to the stat block.
     * @param {NumericStatTracker | ToggleTracker} movement - The moevment to update.
     * @param {{ open5e: string, player: string, monster: number, default: number }} config
     * @param {Object} sheets - The sheet information for the token.
     */
    #refreshMovement(movement, config, sheets) {
        let baseline = config.default ??  0;
        if (baseline > 0 && baseline <= 1) {
            const walking = this.#movement.walk.base;
            baseline = Math.floor(walking * baseline);
        }

        if (sheets.open5e) {
            const findUri = (config.open5e ?? '').toLowerCase().trim();
            const speed = sheets.open5e.speed_all[findUri];

            if (movement instanceof ToggleTracker) {
                movement.setBaseValue(speed === true);
            } else if (movement instanceof NumericStatTracker) {
                movement.setBaseValue(speed ?? baseline);
            }

            return;
        }

        if (movement instanceof ToggleTracker) {
            // D&D Beyond does not support hovering
            movement.setBaseValue(false);
            return;
        }

        if (!(movement instanceof NumericStatTracker)) {
            return;
        }

        if (sheets.monster && config.monster != null) {
            const container = sheets.monster.movements ?? [];
            if (container.length === 0) {
                movement.setBaseValue(baseline);
                return;
            }

            let speed = baseline;
            for (const entry of container) {
                if (entry.movementId === config.monster) {
                    speed = entry.speed;
                    break;
                }
            }

            movement.setBaseValue(speed);
            return;
        }

        if (sheets.player && config.player != null) {
            const container = sheets.player.speeds ?? [];
            if (container.length === 0) {
                movement.setBaseValue(baseline);
                return;
            }

            const findUri = config.player.toLowerCase();
            let speed = baseline;
            for (const entry of container) {
                if (entry.name?.toLowerCase() === findUri) {
                    speed = entry.distance;
                    break;
                }
            }

            movement.setBaseValue(speed);
            return;
        }

        movement.setBaseValue(baseline);
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
window.initStatBlock = (token) => new StatBlock(token);
window.statNormalizationEnabled = DiceActionsEnabled;