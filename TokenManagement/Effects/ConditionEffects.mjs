 /** @import { EffectImpactContext } from '../EffectDefinition.types.js' */

import { ConditionType, PropertyType } from '../CoreEnums.mjs';
import ConditionTracker from '../ConditionTracker.mjs';
import NumericStatProperty from '../NumericStatProperty.mjs';

 /** @param {EffectImpactContext} context */
 export function applyCondition(context) {
    const definition = ConditionType.getByUri(context.overrides.condition ?? context.impact.condition ?? null);
    if (typeof definition !== 'object') {
        console.warn(`Attempted to apply effects of a condition that does not specify the condition to add`);
        return;
    }

    if (definition.type === PropertyType.Condition) {
        const condition = context.stats.getOrAddCondition(definition.uri, (s, u) => new ConditionTracker(s, u, false, false));
        condition.addInstance(context.tracking);
        
    } else if (definition.type === PropertyType.Number) {
        const levels = context.overrides.amount ?? context.impact.amount ?? 1;
        if (typeof levels !== 'number') {
            console.warn(`Attempted to apply effects of condition ${definition.uri} that does not specify the levels to add`);
            return;
        }

        if (levels === 0) {
            return;
        }
        
        const condition = context.stats.getOrAddNumeric(definition.uri, (s, u) => new NumericStatProperty(s, u, 0));
        condition.addInstance(context.tracking, levels);
    }
 }

 