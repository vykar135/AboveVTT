// @ts-nocheck

/**
 * @import { ConfigurationSettings } from './CoreEnums.mjs'
 * 
 * @typedef {Object} AvailableSheets
 * @property {import("../types/Token.types.js").TokenOptions | undefined} tokenOptions
 * @property {any} [playerOptions]
 * @property {any} [player]
 * @property {any} [playerExt]
 * @property {any} [open5e]
 * @property {any} [monster]
 * @property {number} [pb]
 */

import ConditionTracker from './ConditionTracker.mjs';
import { DiceActionsEnabled, AbilityScore, ConditionType, DamageType, ProficiencyType, SkillCheck, uriEquals, Movement } from './CoreEnums.mjs'
import DefenseTracker from './DefenseTracker.mjs';
import { DiceAction } from './DiceAction.mjs';
import NumericStatTracker from './NumericStatTracker.mjs';
import StatBlock from "./StatBlock.mjs";
import ToggleTracker from './ToggleTracker.mjs';

export default class StatNormalization {
    #stats;
    #sheets;
    #player;
    #level;

    /**
     * @param {StatBlock} stats 
     * @param {AvailableSheets} sheets 
     * @param {boolean} player 
    */
    constructor(stats, sheets, player) {
        this.#stats = stats;
        this.#sheets = sheets;
        this.#player = player;
        this.#level = 0;
        Object.freeze(this);
    }

    /** The normalized level to assign to the character sheet. */
    get level() { return this.#level; }

    /** Rebuilds the stat block for the token */
    rebuild() {
        if (!DiceActionsEnabled) {
            return;
        }

        this.#sheets.pb = this.#refreshLevel();

        const ac = this.#sheets.player?.armorClass ?? this.#sheets.tokenOptions?.armorClass ?? this.#sheets.monster?.armorClass ?? 
            this.#sheets.open5e?.armor_class ?? this.#sheets.open5e?.armorClass ?? 10;
        this.#updateNumeric(this.#stats.ac, ac);

        const totalHp = this.#sheets.player?.hitPointInfo?.maximum ?? this.#sheets.tokenOptions?.hitPointInfo?.maximum ?? 0;
        this.#updateNumeric(this.#stats.hp.maximumChanges, totalHp);

        this.#refreshAbility(AbilityScore.STR, this.#stats.scores.str, this.#stats.modifiers.str, this.#stats.saves.str);
        this.#refreshAbility(AbilityScore.DEX, this.#stats.scores.dex, this.#stats.modifiers.dex, this.#stats.saves.dex);
        this.#refreshAbility(AbilityScore.CON, this.#stats.scores.con, this.#stats.modifiers.con, this.#stats.saves.con);
        this.#refreshAbility(AbilityScore.WIS, this.#stats.scores.wis, this.#stats.modifiers.wis, this.#stats.saves.wis);
        this.#refreshAbility(AbilityScore.INT, this.#stats.scores.int, this.#stats.modifiers.int, this.#stats.saves.int);
        this.#refreshAbility(AbilityScore.CHA, this.#stats.scores.cha, this.#stats.modifiers.cha, this.#stats.saves.cha);

        this.#refreshSkill(this.#stats.skills.acrobatics, SkillCheck.Acrobatics);
        this.#refreshSkill(this.#stats.skills.animalHandling, SkillCheck.AnimalHandling);
        this.#refreshSkill(this.#stats.skills.arcana, SkillCheck.Arcana);
        this.#refreshSkill(this.#stats.skills.athletics, SkillCheck.Athletics);
        this.#refreshSkill(this.#stats.skills.deception, SkillCheck.Deception);
        this.#refreshSkill(this.#stats.skills.history, SkillCheck.History);
        this.#refreshSkill(this.#stats.skills.insight, SkillCheck.Insight);
        this.#refreshSkill(this.#stats.skills.intimidation, SkillCheck.Intimidation);
        this.#refreshSkill(this.#stats.skills.investigation, SkillCheck.Investigation);
        this.#refreshSkill(this.#stats.skills.medicine, SkillCheck.Medicine);
        this.#refreshSkill(this.#stats.skills.nature, SkillCheck.Nature);
        this.#refreshSkill(this.#stats.skills.perception, SkillCheck.Perception);
        this.#refreshSkill(this.#stats.skills.performance, SkillCheck.Performance);
        this.#refreshSkill(this.#stats.skills.persuasion, SkillCheck.Persuasion);
        this.#refreshSkill(this.#stats.skills.religion, SkillCheck.Religion);
        this.#refreshSkill(this.#stats.skills.sleightOfHand, SkillCheck.SleightOfHand);
        this.#refreshSkill(this.#stats.skills.stealth, SkillCheck.Stealth);
        this.#refreshSkill(this.#stats.skills.survival, SkillCheck.Survival);

        this.#refreshCondition(this.#stats.conditions.blinded, ConditionType.Blinded);
        this.#refreshCondition(this.#stats.conditions.charmed, ConditionType.Charmed);
        this.#refreshCondition(this.#stats.conditions.deafened, ConditionType.Deafened);
        this.#refreshCondition(this.#stats.conditions.exhaustion, ConditionType.Exhaustion);
        this.#refreshCondition(this.#stats.conditions.frightened, ConditionType.Frightened);
        this.#refreshCondition(this.#stats.conditions.grappled, ConditionType.Grappled);
        this.#refreshCondition(this.#stats.conditions.incapacitated, ConditionType.Incapacitated);
        this.#refreshCondition(this.#stats.conditions.invisible, ConditionType.Invisible);
        this.#refreshCondition(this.#stats.conditions.paralyzed, ConditionType.Paralyzed);
        this.#refreshCondition(this.#stats.conditions.petrified, ConditionType.Petrified);
        this.#refreshCondition(this.#stats.conditions.poisoned, ConditionType.Poisoned);
        this.#refreshCondition(this.#stats.conditions.prone, ConditionType.Prone);
        this.#refreshCondition(this.#stats.conditions.restrained, ConditionType.Restrained);
        this.#refreshCondition(this.#stats.conditions.stunned, ConditionType.Stunned);
        this.#refreshCondition(this.#stats.conditions.unconscious, ConditionType.Unconscious);

        this.#refreshDefenses(this.#stats.defenses.slashing, DamageType.Slashing);
        this.#refreshDefenses(this.#stats.defenses.piercing, DamageType.Piercing);
        this.#refreshDefenses(this.#stats.defenses.bludgeoning, DamageType.Bludgeoning);
        this.#refreshDefenses(this.#stats.defenses.acid, DamageType.Acid);
        this.#refreshDefenses(this.#stats.defenses.cold, DamageType.Cold);
        this.#refreshDefenses(this.#stats.defenses.fire, DamageType.Fire);
        this.#refreshDefenses(this.#stats.defenses.force, DamageType.Force);
        this.#refreshDefenses(this.#stats.defenses.lightning, DamageType.Lightning);
        this.#refreshDefenses(this.#stats.defenses.necrotic, DamageType.Necrotic);
        this.#refreshDefenses(this.#stats.defenses.poison, DamageType.Poison);
        this.#refreshDefenses(this.#stats.defenses.psychic, DamageType.Psychic);
        this.#refreshDefenses(this.#stats.defenses.radiant, DamageType.Radiant);
        this.#refreshDefenses(this.#stats.defenses.thunder, DamageType.Thunder);

        this.#refreshMovement(this.#stats.movement.walk, Movement.Walk);
        this.#refreshMovement(this.#stats.movement.crawl, Movement.Crawl);
        this.#refreshMovement(this.#stats.movement.climb, Movement.Climb);
        this.#refreshMovement(this.#stats.movement.swim, Movement.Swim);
        this.#refreshMovement(this.#stats.movement.burrow, Movement.Burrow);
        this.#refreshMovement(this.#stats.movement.fly, Movement.Fly);
        this.#refreshMovement(this.#stats.movement.hover, Movement.Hover);
    }

    /**
     * Updates the specified numeric property for the stat block.
     * @param {NumericStatTracker} tracker 
     * @param {number} value 
     */
    #updateNumeric(tracker, value) {
        tracker.setBaseValue(value);

        if (this.#player) {
            const snapshots = this.#sheets.playerOptions?.snapshots?.numeric;
            if (snapshots != null) {
                tracker.setSnapshot(snapshots[tracker.uri], false);
            }
        }

        return tracker;
    }

    /**
     * Retrieves either the level or challenge rating from the appropriate sheet for the token
     * @returns {number} The proficiency bonus for the token
    */
    #refreshLevel() {
        if (this.#sheets.player) {
            const pb = this.#sheets.player.proficiencyBonus ?? 2;
            this.#level = this.#sheets.player.level ?? 1;
            this.#updateNumeric(this.#stats.proficiencyBonus, pb);
            return pb;
        }

        if (this.#sheets.monster) {
            let id = this.#sheets.monster.challengeRatingId ?? 0;
            let cr = id;
            let pb = 2;

            const ratings = window.ddbConfigJson?.["challengeRatings"] ?? []
            const rating = ratings.find(entry => entry.id === id);
            if (rating != null) {
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
            this.#updateNumeric(this.#stats.proficiencyBonus, pb ?? 2);
            return pb;
        }

        if (this.#sheets.open5e) {
            const cr = this.#sheets.open5e.challenge_rating ?? 0;
            let pb = this.#sheets.open5e.proficiency_bonus;
            if (pb == null) {
                pb = 1 + Math.ceil((cr > 0 ? cr : 1) / 4);
            }

            this.#level = cr;
            this.#updateNumeric(this.#stats.proficiencyBonus, pb ?? 2);
            return pb;
        }

        this.#level = 0;
        this.#updateNumeric(this.#stats.proficiencyBonus, 2);
        return 2;
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {Object} config - The ability score to update.
     * @param {NumericStatTracker} score - The ability modifier to update.
     * @param {BlockAbilityModifier} modifier - The ability modifier to update.
     * @param {DiceAction} save - The ability modifier to update.
     */
    #refreshAbility(config, score, modifier, save) {
        this.#refreshAbilityScore(config, score);
        this.#refreshAbilityModifier(config, score, modifier);
        this.#refreshSaveModifiers(config, save, modifier);
    }

    /**
     * Determines the best ability score value to use for the stat block.
     * @param {Object} config - The ability score to update.
     * @param {NumericStatTracker} score - The ability modifier to update.
     */
    #refreshAbilityScore(config, score) {
        const expected = config.uri.toLowerCase();
        let value = this.#sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            this.#sheets.monster?.stats?.find((entry) => (entry.statId === config.dndBeyond))?.value ??
            this.#sheets.open5e?.ability_scores?.[config.open5e] ??
            this.#sheets.tokenOptions.abilities?.find((entry) => uriEquals(entry?.name, expected))?.score ??
            10;

        this.#updateNumeric(score, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {Object} config - The configuration for the ability score.
     * @param {NumericStatTracker} score - The ability score that is used to determine the baseline modifier when overrides are not present.
     * @param {BlockAbilityModifier} modifier - The ability modifier to update.
     */
    #refreshAbilityModifier(config, score, modifier) {
        const expected = config.uri.toLowerCase();
        let value = this.#sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier ??
            this.#sheets.open5e?.modifiers?.[config.open5e] ??
            this.#sheets.tokenOptions.abilities?.find((entry) => uriEquals(entry?.name, expected))?.modifier;

        if (value == null) {
            value = Math.floor((score.base - 10) / 2);
        }

        this.#updateNumeric(modifier.value, value);
    }

    /**
     * Determines the best ability modifier value to use for the stat block.
     * @param {ConfigurationSettings} config - The configuration for the ability score.
     * @param {DiceAction} save - The ability modifier to update.
     * @param {BlockAbilityModifier} modifier - The ability modifier that can be used to determine any bonus values.
     */
    #refreshSaveModifiers(config, save, modifier) {
        if (this.#sheets.monster) {
            const beyondProf = this.#sheets.monster.savingThrows?.find((entry) => (entry.statId === config.dndBeyond));
            save.proficiency = beyondProf != null ? ProficiencyType.Proficient.multiplier : ProficiencyType.None.multiplier;
            save.bonus = beyondProf?.bonusModifier ?? 0;
            return;
        }

        if (this.#sheets.open5e) {
            const openProf = this.#sheets.open5e.saving_throws?.[config.open5e];
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (typeof openProf === 'number') {
                bonus = openProf;

                const abilityMod = this.#stats.modifiers[save.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(this.#sheets.pb));
            }

            save.proficiency = proficiency;
            save.bonus = bonus;
            return;
        }

        const abilityMod = modifier.value.base;
        const proficient = this.#reviewPlayerSaveProficiency(config);

        const expected = config.uri.toLowerCase();
        let bonus = this.#sheets.player?.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            this.#sheets.tokenOptions.abilities?.find((entry) => uriEquals(entry?.name, expected))?.save ??
            abilityMod;

        // Tear down the full save value to get to the total bonus
        bonus -= abilityMod;
        if (proficient) {
            bonus -= this.#sheets.pb;
        }

        save.proficiency = proficient ? ProficiencyType.Proficient.multiplier : ProficiencyType.None.multiplier;
        save.bonus = bonus;

        return;
    }

    /** Review the extended player character sheet for save proficiencies when it is available */
    #reviewPlayerSaveProficiency(config) {
        if (typeof config.playerSaveExt !== 'string') {
            return false;
        }

        const profUri = `${config.uri}:save`;
        if (this.#sheets.playerExt == null) {
            return this.#sheets.playerOptions?.proficiency?.[profUri] === true;
        }

        if (this.#sheets.playerSaves == null) {
            const starter = new Set();
            const unrestricted = new Set();

            this.#sheets.playerSaves = {
                starter,
                unrestricted
            };

            for (const [key, group] of Object.entries(this.#sheets.playerExt.modifiers ?? {})) {
                const forClass = key.toLowerCase() === 'class';
                for (const entry of group) {
                    if (entry.type?.toLowerCase() !== 'proficiency' || entry.subType?.toLowerCase()?.endsWith('-saving-throws') !== true) {
                        continue;
                    }

                    if (entry.availableToMulticlass === true || !forClass) {
                        unrestricted.add(entry.subType.toLowerCase())

                    } else if (starter.size < 2) {
                        // Classes only get 2 starter saves and multiclass saves are not allowed.
                        // There is probably a better way to determine this but D&D Beyond likes to be difficult.
                        starter.add(entry.subType.toLowerCase())
                    }
                }
            }
        }
        
        let proficient = this.#sheets.playerSaves.starter.has(config.playerSaveExt) || this.#sheets.playerSaves.unrestricted.has(config.playerSaveExt);

        const current = this.#sheets.playerOptions.proficiency?.[profUri] ?? false;
        if (current !== proficient) {
            if (this.#sheets.playerOptions.proficiency == null) {
                this.#sheets.playerOptions.proficiency = {};
            }

            if (proficient === true) {
                this.#sheets.playerOptions.proficiency[profUri] = true;
            } else {
                delete this.#sheets.playerOptions.proficiency[profUri];
            }

            this.#stats.hasPendingChanges(true);
        }

        return proficient;
    }

    /**
     * Determines the best skill proficiency value to use for the stat block.
     * @param {DiceAction} skill - The dice action associated with the skill check to update.
     * @param {Object} config - The configuration for the skill change across sheet types.
     */
    #refreshSkill(skill, config) {
        if (this.#sheets.monster) {
            const beyondProf = this.#sheets.monster.skills?.find((entry) => (entry.skillId === config.dndBeyond));
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (beyondProf != null) {
                bonus = beyondProf.value;

                const abilityMod = this.#stats.modifiers[skill.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(this.#sheets.pb));
            }

            skill.proficiency = proficiency;
            skill.bonus = bonus;
            return;
        }

        if (this.#sheets.open5e) {
            const openProf = this.#sheets.open5e.skill_bonuses?.[config.open5e];
            let bonus = 0;
            let proficiency = ProficiencyType.None.multiplier;

            if (typeof openProf === 'number') {
                bonus = openProf;

                const abilityMod = this.#stats.modifiers[skill.ability]?.value?.current ?? 0
                bonus -= abilityMod;

                proficiency = ProficiencyType.Proficient.multiplier;
                bonus -= (proficiency * Math.abs(this.#sheets.pb));
            }

            skill.proficiency = proficiency;
            skill.bonus = bonus;
            return;
        }

        if (this.#sheets.player == null) {
            skill.bonus = 0;
            skill.proficiency = ProficiencyType.None.multiplier;
            return;
        }

        const settings = this.#sheets.player.skills?.find(entry => entry.name?.toLowerCase() === config.player) ?? {};
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
     */
    #refreshCondition(condition, config) {
        const findUri = (config.srd ?? '').toLowerCase().trim();
        const fromToken = (this.#sheets.player == null && (this.#sheets.tokenOptions.conditions?.findIndex(entry => entry?.name?.toLowerCase() === findUri) ?? -1) >= 0);
        const player = (this.#sheets.player?.conditions?.find((entry) => entry?.name?.toLowerCase() === findUri));

        let intensity = player?.level;
        if (typeof intensity === 'string') {
            intensity = parseInt(intensity);
        }

        const immunity = (
            (this.#sheets.player?.immunities?.find((entry) => entry?.name?.toLowerCase() === findUri)) ??
            (this.#sheets.monster?.conditionImmunities?.find((entry) => typeof entry === 'number' && entry === config.dndBeyond)) ??
            (this.#sheets.open5e?.resistances_and_immunities?.condition_immunities?.find((entry) => entry?.key?.toLowerCase() === findUri))
        );

        condition.setBaseValue(fromToken, (player != null), intensity, (immunity != null));
    }

    /**
     * Determines whether a defenses against a damage type is applied to the stat block.
     * @param {DefenseTracker} defenses - The condition to update.
     * @param {{ uri: string, srd: string, open5e: string, ddbImmune: number, ddbResist: number, ddbVuln: number }} config
     */
    #refreshDefenses(defenses, config) {
        if (this.#sheets.monster) {
            const container = this.#sheets.monster.damageAdjustments ?? [];
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

        if (this.#sheets.open5e) {
            const findUri = (config.open5e ?? config.srd ?? config.uri ?? '').toLowerCase().trim();
            const container = this.#sheets.open5e.resistances_and_immunities ?? {};
            const immunity = container.damage_immunities?.find((entry) => entry?.key?.toLowerCase() === findUri);
            const resistance = container.damage_resistances?.find((entry) => entry?.key?.toLowerCase() === findUri);
            const vulnerability = container.damage_vulnerabilities?.find((entry) => entry?.key?.toLowerCase() === findUri);

            defenses.setBaseValue((immunity != null), (resistance != null), (vulnerability != null))
            return;
        }

        if (this.#sheets.player) {
            const findUri = (config.srd ?? config.uri ?? '').toLowerCase().trim();
            const immunity = this.#sheets.player.immunities?.find((entry) => entry?.name?.toLowerCase() === findUri);
            const resistance = this.#sheets.player.resistances?.find((entry) => entry?.name?.toLowerCase() === findUri);
            const vulnerability = this.#sheets.player.vulnerabilities?.find((entry) => entry?.name?.toLowerCase() === findUri);

            defenses.setBaseValue((immunity != null), (resistance != null), (vulnerability != null))
            return;
        }

        defenses.setBaseValue(false, false, false);
    }

    /**
     * Determines whether a defenses against a damage type is applied to the stat block.
     * @param {NumericStatTracker | ToggleTracker} movement - The moevment to update.
     * @param {{ open5e: string, player: string, monster: number, default: number }} config
     */
    #refreshMovement(movement, config) {
        let baseline = config.default ??  0;
        if (baseline > 0 && baseline <= 1) {
            const walking = this.#stats.movement.walk.base;
            baseline = Math.floor(walking * baseline);
        }

        if (this.#sheets.open5e) {
            const findUri = (config.open5e ?? '').toLowerCase().trim();
            const speed = this.#sheets.open5e.speed_all[findUri];

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

        if (this.#sheets.monster && config.monster != null) {
            const container = this.#sheets.monster.movements ?? [];
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

        if (this.#sheets.player && config.player != null) {
            const container = this.#sheets.player.speeds ?? [];
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