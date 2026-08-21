/**
 * @typedef { 'prop:number' | 'prop:toggle' | 'prop:charges' | 'prop:roll' | 'prop:proficiency' | 'prop:advantage' | 'prop:resistance' | 'prop:ability:modifier' } PropertyTypeEnum
 *
 * @typedef { 'roll:basic' | 'roll:check' | 'roll:skill' | 'roll:save' | 'roll:tohit' | 'roll:damage' | 'roll:heal' } RollTypeEnum
 *
 * @typedef {'d4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'} DiceTypeEnum
 *
 * @typedef { 'proficiency:none' | 'proficient' | 'expert' | 'half' | 'half-up' | 'flaw' | 'flaw:heavy' | 'flaw:minor' } ProficiencyTypeEnum
 *
 * @typedef {'resist:none' | 'resist' | 'immune' | 'vulnerable'} ResistanceTypeEnum
 *
 * @typedef {'advantage:none' | 'advantage' | 'disadvantage'} AdvantageTypeEnum
 *
 * @typedef { 'dmg:magic' | 'dmg:physical' | 'slashing' | 'piercing' | 'bludgeoning' | 'acid' | 'cold' | 'fire' | 'force' |
 *     'lightning' | 'necrotic' | 'poison' | 'psychic' | 'radiant' | 'thunder'
 * } DamageTypeEnum
 *
 * @typedef { 'resistance:dmg:magic' | 'resistance:dmg:physical' | 'resistance:slashing' | 'resistance:piercing' |
 *     'resistance:bludgeoning' | 'resistance:acid' | 'resistance:cold' | 'resistance:fire' | 'resistance:force' | 'resistance:lightning' |
 *     'resistance:necrotic' | 'resistance:poison' | 'resistance:psychic' | 'resistance:radiant' | 'resistance:thunder'
 * } DamageResistanceEnum
 *
 * @typedef { 'blinded' | 'charmed' | 'deafened' | 'frightened' | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed' | 'petrified' |
 *     'poisoned' | 'prone' | 'restrained' | 'stunned' | 'unconscious' | 'sleep' | 'exhaustion'
 * } ConditionTypeEnum
 *
 * @typedef { 'resistance:blinded' | 'resistance:charmed' | 'resistance:deafened' | 'resistance:frightened' |
 *     'resistance:grappled' | 'resistance:incapacitated' | 'resistance:paralyzed' | 'resistance:petrified' |
 *     'resistance:poisoned' | 'resistance:prone' | 'resistance:restrained' | 'resistance:stunned' | 'resistance:unconscious' |
 *     'resistance:sleep' | 'resistance:exhaustion'
 * } ConditionResistanceEnum
 *
 * @typedef {'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | 'pb'} AbilityScoreEnum
 *
 * @typedef { 'advantage:limit' | 'action:limit' | 'action:bonus:limit' | 'reaction:limit' | 'weapon:attack:limit' } AbilityConstraintsEnum
 *
 * @typedef { 'concentration' | 'concentration:limit' | 'spell:slot:1' | 'spell:slot:2' | 'spell:slot:3' | 'spell:slot:4' | 
 *     'spell:slot:5' | 'spell:slot:6' | 'spell:slot:7' | 'spell:slot:8' | 'spell:slot:9'
 * } SpellTrackingEnum
 * 
 * @typedef { 'modifier:str' | 'modifier:dex' | 'modifier:con' | 'modifier:int' | 'modifier:wis' | 'modifier:cha' } AbilityModifierEnum
 *
 * @typedef {'hit:dice' | 'hp:max' | 'hp:temp'} HitPointEnum
 *
 * @typedef { 'check' | 'check:str' | 'check:dex' | 'check:con' | 'check:int' | 'check:wis' | 'check:cha' | 'check:pb' } AbilityCheckEnum
 *
 * @typedef { 'save' | 'save:str' | 'save:dex' | 'save:con' | 'save:int' | 'save:wis' | 'save:cha' | 'save:death' } SavingThrowEnum
 *
 * @typedef { 'proficiency:save' | 'proficiency:save:str' | 'proficiency:save:dex' | 'proficiency:save:con' |
 *     'proficiency:save:int' | 'proficiency:save:wis' | 'proficiency:save:cha' | 'proficiency:save:death'
 * } SaveProficiencyEnum
 *
 * @typedef { 'resistance:save' | 'resistance:save:str' | 'resistance:save:dex' | 'resistance:save:con' |
 *     'resistance:save:int' | 'resistance:save:wis' | 'resistance:save:cha' | 'resistance:save:death'
 * } SaveResistanceEnum
 *
 * @typedef { 'skill' | 'skill:str' | 'skill:dex' | 'skill:con' | 'skill:wis' | 'skill:int' | 'skill:cha' | 
 *     'skill:acrobatics' | 'skill:animal_handling' | 'skill:arcana' | 'skill:athletics' | 'skill:deception' | 
 *     'skill:history' | 'skill:insight' | 'skill:intimidation' | 'skill:investigation' | 'skill:medicine' |
 *     'skill:nature' | 'skill:perception' | 'skill:performance' | 'skill:persuasion' | 'skill:religion' | 
 *     'skill:sleight_of_hand' | 'skill:stealth' | 'skill:survival'
 * } SkillCheckEnum
 *
 * @typedef { 'proficiency:skill' | 'proficiency:skill:str' | 'proficiency:skill:dex' | 'proficiency:skill:con' |
 *     'proficiency:skill:wis' | 'proficiency:skill:int' | 'proficiency:skill:cha' | 'proficiency:skill:acrobatics' |
 *     'proficiency:skill:animal_handling' | 'proficiency:skill:arcana' | 'proficiency:skill:athletics' | 'proficiency:skill:deception' |
 *     'proficiency:skill:history' | 'proficiency:skill:insight' | 'proficiency:skill:intimidation' | 'proficiency:skill:investigation' |
 *     'proficiency:skill:medicine' | 'proficiency:skill:nature' | 'proficiency:skill:perception' | 'proficiency:skill:performance' |
 *     'proficiency:skill:persuasion' | 'proficiency:skill:religion' | 'proficiency:skill:sleight_of_hand' | 'proficiency:skill:stealth' |
 *     'proficiency:skill:survival'
 * } SkillProficiencyEnum
 *
 * @typedef { 'advantage:skill' | 'advantage:skill:str' | 'advantage:skill:dex' | 'advantage:skill:con' | 'advantage:skill:wis' | 
 *     'advantage:skill:int' | 'advantage:skill:cha' | 'advantage:skill:acrobatics' | 'advantage:skill:animal_handling' | 'advantage:skill:arcana' |
 *     'advantage:skill:athletics' | 'advantage:skill:deception' | 'advantage:skill:history' | 'advantage:skill:insight' |
 *     'advantage:skill:intimidation' | 'advantage:skill:investigation' | 'advantage:skill:medicine' | 'advantage:skill:nature' |
 *     'advantage:skill:perception' | 'advantage:skill:performance' | 'advantage:skill:persuasion' | 'advantage:skill:religion' |
 *     'advantage:skill:sleight_of_hand' | 'advantage:skill:stealth' | 'advantage:skill:survival'
 * } SkillAdvantageEnum
 */

export {};