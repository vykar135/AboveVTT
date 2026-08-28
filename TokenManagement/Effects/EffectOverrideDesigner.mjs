
/** @import { EffectImpactRuleSettings } from '../EffectDefinition.types.js' */

export class EffectOverrideDesigner {
    constructor() {
        if (this.constructor === EffectOverrideDesigner) {
            throw new Error("Cannot create an instance of an effect override designer directly");
        }
    }

    /**
     * Applies the changes from the designer onto the provided overrides instance.
     * @param {EffectImpactRuleSettings} overrides - The overrides to modify with the content from the designer.
     */
    applyTo(overrides){
        throw new Error("The 'applyTo' method must be overriden by the subclass");
    }

    /**
     * Generates the interface that can override the requested setting.
     * @param {EffectImpactRuleSettings} defaults - The default values for the effect being override.
     * @returns {Node} The node to append to the editor interface
     */
    build(defaults){
        throw new Error("The 'build' method must be overriden by the subclass");
    }

    /** Handles the interface being torn down */
    dispose() { }
}

export class DurationOverrideDesigner extends EffectOverrideDesigner {
    /** @type {string} */
    #type;
    /** @type {number?} */
    #length;

    constructor() {
        super();
    }

    /**
     * Applies the changes from the designer onto the provided overrides instance.
     * @param {EffectImpactRuleSettings} overrides - The overrides to modify with the content from the designer.
     */
    applyTo(overrides){
        if (this.#type === undefined && this.#length === undefined) {
            return;
        }

        overrides.duration = {
            type: this.#type,
            length: this.#length
        };
    }

    /**
     * Generates the interface that can override the requested setting.
     * @param {EffectImpactRuleSettings} defaults - The default values for the effect being override.
     * @returns {Node} The node to append to the editor interface
     */
    build(defaults){
        this.#type = defaults.duration?.type;
        this.#length = defaults.duration?.length;
    }
}