/** @import { Token } from '../Token.js' */
/** @import { TokenStatusEffectContainer } from './types.js' */

import * as Enums from '../CoreEnums.mjs'
import { ResolutionTrigger, ImpactTrigger, EffectResolution } from './enums.mjs'

export default class TokenStatusEffects {
    #parent;

    /**
     * Manages the status effects associated with the provided Token
     * @param {Token} parent
     */
    constructor(parent){
        this.#parent = parent;
    }

    /**
     * @returns {TokenStatusEffectContainer}
     */
    getContainer() {
        if (!('status_effects' in this.#parent.options)) {
            this.#parent.options.status_effects = {};
        }

        return this.#parent.options.status_effects;
    }
}

// Addressing compatibility issues
window.initTokenStatusEffects = (token) => new TokenStatusEffects(token);