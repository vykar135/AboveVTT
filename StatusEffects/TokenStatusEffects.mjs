/** @import { TokenStatusEffectContainer, Concentration, MaintainedEffect, ActiveStatusEffect, PassiveStatusEffect, StatusEffect } from './types.js' */

import * as Enums from '../CoreEnums.mjs'
import { ResolutionTrigger, ImpactTrigger, EffectResolution } from './enums.mjs'

/**
 * Manages the active, passive, and maintained (concentration) status effects that are currently effecting to a token.
 */
export default class TokenStatusEffects {
    #token;
    #pendingChanges;
    #pendingSceneTokens;
    #pendingCampaignTokens;

    /**
     * Manages the status effects associated with the provided Token
     * @param {Token} parent
     */
    constructor(token){
        this.#token = token;
        this.#pendingChanges = false;
        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};
    }

    /** Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance */
    syncPending() {
        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;
            this.#token.sync();
        }

        const scene = {...this.#pendingSceneTokens};
        const campaign = {...this.#pendingCampaignTokens};

        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};

        for (const target of scene) {
            target.syncPending();
        }

        for (const target of campaign) {
            target.syncPending();
        }
    }

    /** Requests a token update message to be dispatched and updates any related interface components only if there are pending changes that have been observed by this instance */
    syncPendingAndUpdate() {
        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;
            this.#token.update_and_sync();
        }

        const scene = {...this.#pendingSceneTokens};
        const campaign = {...this.#pendingCampaignTokens};

        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};

        for (const target of scene) {
            target.syncPendingAndUpdate();
        }

        for (const target of campaign) {
            target.syncPendingAndUpdate();
        }
    }

    /**
     * Updates the current state of the pending changes flag; preserving if it was already set.
     * @param {boolean} modified - Whether a modification occurred.
     */
    #hasPendingChanges(modified) {
        if (modified === true) {
            this.#pendingChanges = true;
        }
    }

    /**
     * @return {Token} The token that is being managed
     */
    get token() {
        return this.#token;
    }

    /**
     * @returns {string} The identifier of the token being managed
     */
    get id() {
        return this.#token.options.id;
    }

    /**
     * Retrieves or initialized the main status effects container from the token options.
     * @returns {TokenStatusEffectContainer}
     */
    #getContainer() {
        if (this.#token.options.status_effects == null) {
            this.#token.options.status_effects = {};
        }

        return this.#token.options.status_effects;
    }

    /**
     * Retrieves or initialized the concentration settings for the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {Concentration}
     */
    #getConcentration(container = undefined) {
        const settings = container ?? this.#getContainer();
        if (settings.concentration == null) {
            settings.concentration = {};
        }

        return settings.concentration;
    }

    /**
     * Retrieves or initialized the collection of effects being maintained by the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {MaintainedEffect[]}
     */
    getMaintaining(container = undefined) {
        const settings = container ?? this.#getContainer();
        if (settings.maintaining == null) {
            settings.maintaining = [];
        }

        return settings.maintaining;
    }

    /**
     * Retrieves or initialized the collection of effects being maintained by the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {ActiveStatusEffect[]}
     */
    getActive(container = undefined) {
        const settings = container ?? this.#getContainer();
        if (settings.active == null) {
            settings.active = [];
        }

        return settings.active;
    }

    /**
     * Retrieves or initialized the collection of effects being maintained by the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {PassiveStatusEffect[]}
     */
    getPassive(container = undefined) {
        const settings = container ?? this.#getContainer();
        if (settings.passive == null) {
            settings.passive = [];
        }

        return settings.passive;
    }

    /** Whether the token is currently affected by the Incapacitated state */
    get incapacitated() {
        return this.#getContainer().incapacitated ?? false;
    }

    /** Whether the token is currently concentrating on one or more effects */
    get concentrating() {
        return this.#getContainer().concentrating ?? false;
    }

    /** Whether the token is permitted to concentrate */
    get concentrationAllowed() {
        return this.#getContainer().concentration?.allowed ?? true;
    }

    /** Whether concentration for the the token is temporarily being prevented */
    get concentrationBlocked() {
        return this.#getContainer().concentration?.blocked ?? false;
    }

    /** The amount of status effects that the token is allowed to concentrate on */
    get concentrationLimit() {
        return this.#getContainer().concentration?.limit ?? 1;
    }

    /**
     * Whether the token is entering or leaving the Incapacitated state
     * @param {boolean} affected - true when incapacitated; otherwise false
     * */
    isIncapacitated(affected) {
        const settings = this.#getContainer();
        const previous = settings.incapacitated;

        settings.incapacitated = (affected ?? false);

        this.#hasPendingChanges(settings.incapacitated !== previous);

        if (settings.incapacitated === true) {
            this.dropConcentration();
        }
    }

    /**
     * Whether the token is allowed to concetrate on status effects
     * @param {boolean} allowed - Whether the token is permitted to concentrate
     * @param {number} limit - The maximum number of effects that the token can concentrate on
     * @param {boolean} blocked - Whether concentration for the the token is temporarily being prevented
     * */
    canConcentrate(allowed, limit, blocked) {
        const settings = this.#getConcentration();
        const wasAllowed = settings.allowed;
        const wasBlocked = settings.blocked;
        const previousLimit = settings.limit;

        settings.allowed = allowed ?? true;
        settings.blocked = blocked ?? true;
        settings.limit = limit ?? 1;

        this.#hasPendingChanges(settings.allowed !== wasAllowed || settings.blocked !== wasBlocked || settings.limit !== previousLimit);
        this.reviewConcentration();
    }

    /** Drops all ongoing concentration effects */
    dropConcentration() {
        const settings = this.#getContainer();
        const wasConcentrating = settings.concentrating;
        settings.concentrating = false;

        this.#hasPendingChanges(settings.concentrating !== wasConcentrating);

        const current = maintaining.filter(item => this.requiresConcentration(item));
        for (const effect in abandoned) {
            this.dropMaintainedEffect(effect.tracking);
        }
    }

    /**
     * Clears a passive status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     */
    dropPassiveEffect(tracking) {
        const settings = this.#getContainer();
        const current = this.getPassive(settings);

        const rebuild = current.filter(item => item.tracking !== tracking);
        settings.passive = rebuild;

        const removed = (rebuild.length !== current.length);
        this.#hasPendingChanges(removed);
        return removed;
    }

    /**
     * Clears an active status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropActiveEffect(tracking) {
        const settings = this.#getContainer();
        const current = this.getActive(settings);

        const rebuild = current.filter(item => item.tracking !== tracking);
        settings.active = rebuild;

        const removed = (rebuild.length !== current.length);
        this.#hasPendingChanges(removed);
        return removed;
    }

    /**
     * Clears a maintained status effect from the token by its tracking identifier along with any active effects on other tokens.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropMaintainedEffect(tracking) {
        const settings = this.#getContainer();
        const current = this.getMaintaining(settings);

        const rebuild = current.filter(item => item.tracking !== tracking);
        settings.maintaining = rebuild;

        let removed = (rebuild.length !== current.length);
        this.#hasPendingChanges(removed);

        if (removed) {
            removed = this.#dropGlobalActiveEffects(window.TOKEN_OBJECTS, tracking, this.#pendingSceneTokens) || removed;
            removed = this.#dropGlobalActiveEffects(window.all_token_objects, tracking, this.#pendingCampaignTokens) || removed;
        }
        
        return removed;
    }

    /**
     * Clears an active status effect from all tokens in the collection by its tracking identifier.
     * @param {Object.<string, Token>} tokens - The collection of 
     * @param {string} tracking - The tracking identifier of the effect to drop.
     */
    #dropGlobalActiveEffects(tokens, tracking, changes) {
        if (tokens == null) {
            return;
        }

        let removedAnywhere = false;
        for (const [key, value] in Object.entries(window.TOKEN_OBJECTS)) {
            const removed = value.statusEffects.dropActiveEffect(tracking);

            if (removed) {
                removedAnywhere = true;
                changes[key] = value.statusEffects;
            }
        }

        return removedAnywhere;
    }

    /**
     * Review the current settings and maintained effects to determine if any updates to the token need to occur.
     * @returns {number} - The number of effects that are currently being concentrated on.
     */
    reviewConcentration() {
        const settings = this.#getContainer();
        const concentration = this.#getConcentration(settings);
        const maintaining = this.getMaintaining(settings);

        if (settings.incapacitated === true || concentration.allowed === false || concentration.blocked === true) {
            this.dropConcentration();
            return 0;
        }

        const current = maintaining.filter(item => this.requiresConcentration(item));
        if (current.length === 0) {
            if (settings.concentrating !== false) {
                this.#pendingChanges = true;
                settings.concentrating = false;
            }

            return 0;
        }

        let limit = concentration.limit || 1;
        if (limit < 0) {
            this.#pendingChanges = true;
            concentration.limit = limit = 0;
        }

        if (current.length <= limit) {
            return current.length;
        }

        if (limit < 1) {
            this.dropConcentration();
            return 0;
        }
        
        this.#pendingChanges = true;
        const abandoned = [];

        // Since the token is beyond its concentration limit, 
        // we need to end the appropriate number of the earliest effects
        while (current.length > limit) {
            const leaving = current.shift();
            abandoned.push(leaving);
        }

        for (const effect in abandoned) {
            this.dropMaintainedEffect(effect.tracking);
        }

        return current.length;
    }

    /**
     * Determines whether the provided status effect requires concentration
     * @param {StatusEffect} effect 
     */
    requiresConcentration(effect) {
        return effect.concentration ?? false
    }
}

// Addressing compatibility issues
window.initTokenStatusEffects = (token) => new TokenStatusEffects(token);