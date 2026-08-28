 /** @import { TypedConfigurationSettings } from './CoreEnums.mjs' */
 /** @import { EffectImpactContext } from './EffectDefinition.types.js' */

import { PropertyIndex, PropertyType } from './CoreEnums.mjs';
import ConditionTracker from './ConditionTracker.mjs';
import NumericStatProperty from './NumericStatProperty.mjs';
import { EffectImpact } from './StatusEffectEnums.mjs';

/** @param {EffectImpactContext} context */
export function applyImpact(context) {
    const uri = (context.impact.type ?? '').toLowerCase();
    if (uri === EffectImpact.Modify.uri) {
        return applyModification(context);   
    }

    console.warn(`Attempted to apply an effect with an invalid type of ${uri}`);
}

/** @param {EffectImpactContext} context */
function applyModification(context) {
    const uri = context.overrides.modifies ?? context.impact.modifies ?? null;

    /** @type {TypedConfigurationSettings} */
    const definition = PropertyIndex[uri];
    if (definition == null || typeof definition !== 'object') {
        console.warn(`Attempted to apply any effect that modifies a property of '${uri}' that does not exist`);
        return;
    }

    if (definition.type === PropertyType.Condition) {
        return applyCondition(definition, context);
        
    } else if (definition.type === PropertyType.Number) {
        return applyNumeric(definition, context);
    }

    console.warn(`Attempted to apply an effect of ${definition.uri} that does not specify a valid property type`);
}

/**
 * @param {TypedConfigurationSettings} definition 
 * @param {EffectImpactContext} context
 */
function applyCondition(definition, context) {
    const condition = context.stats.getOrAddCondition(definition.uri, (s, u) => new ConditionTracker(s, u, false, false));
    condition.addInstance(context.tracking);
}

/**
 * @param {TypedConfigurationSettings} definition 
 * @param {EffectImpactContext} context
 */
function applyNumeric(definition, context) {
    const amount = context.overrides.amount ?? context.impact.amount ?? 1;
    if (typeof amount !== 'number') {
        console.warn(`Attempted to apply an effect that modifies numeric property ${definition.uri} that does not specify the amount to add`);
        return;
    }

    if (amount === 0) {
        return;
    }

    const condition = context.stats.getOrAddNumeric(definition.uri, (s, u) => new NumericStatProperty(s, u, 0));
    condition.addInstance(context.tracking, amount);
}

 