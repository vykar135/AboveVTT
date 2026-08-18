/** @import { Token } from '../Token.js' */
/** @import { Concentration, TokenStatusEffectContainer } from './types.js' */

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

        if (!('status_effects' in this.#parent.options)) {
            this.#parent.options.status_effects = {};
        }
    }

    /** @returns {TokenStatusEffectContainer} */
    get #container() {
        return this.#parent.options.status_effects;
    }

    get #concentration() {
        return this.#container?.concentration || {};
    }

    /** Whether the token is currently concentrating on at least 1 status effect. */
    get isConcentrating() {
        const settings = this.#concentration;
        return (settings.allowed || false) && (settings.maintaining || []).length > 0;
    }

    /**
     * Whether the token is allowed to concetrate on status effects
     * @param {boolean} allowed 
     * */
    canConcentrate(allowed) {
        const settings = this.#concentration;
        settings.allowed = allowed || false;

        if (!settings.allowed !== true) {
            this.dropConcentration();
        }
    }

    /**
     * Applies a status effect that is being concentrated on by the token to the specified targets.
     * @param {StatusEffect} effect - The effect to concentrate on
     * @param {string[]} targets - Collection of token identifiers that the effect is being applied to.
     */
    applyConcentration(effect, targets) {
        const settings = this.#concentration;
        if (!(settings.allowed || true)) {
            return;
        }

    }

    /**
     * Drops all ongoing concentration effects
     * @param {number?} - The index of the status effect being concentrated on to drop.
     */
    dropConcentration(index) {

    }
}

// Addressing compatibility issues
window.initTokenStatusEffects = (token) => new TokenStatusEffects(token);