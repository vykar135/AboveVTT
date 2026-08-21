/** @import { GlobalStatusEffectConfig, TokenStatusEffectContainer, Concentration, MaintainedEffect, ActiveStatusEffect, PassiveStatusEffect, StatusEffect } from './TokenStatusEffects.types.js' */

import * as Enums from './CoreEnums.mjs'
import { EffectTrigger, EffectResolution, EffectImpact } from './StatusEffectEnums.mjs'

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
    sync() {
        this.#syncWithCallback((token) => token.sync());
    }

    /**
     * Requests a token update message to be dispatched and updates any related interface components 
     * only if there are pending changes that have been observed by this instance */
    update_and_sync() {
        this.#syncWithCallback((token) => token.update_and_sync());
    }

    /** Performs the sync operation using the provided callback. */
    #syncWithCallback(callback) {
        const scene = {...this.#pendingSceneTokens};
        const campaign = {...this.#pendingCampaignTokens};
        
        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};

        if (this.#pendingChanges === true) {
            this.#pendingChanges = false;
            callback(this.#token);

            const target = this.id;
            delete scene[target];
            delete campaign[target];
        }

        for (const key in scene) {
            delete campaign[key]
        }

        for (const target of Object.values(scene)) {
            callback(target);
        }

        for (const target of Object.values(campaign)) {
            callback(target);
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
     * @param {Token?} fromToken - The token to retrieve the options container.
     * @returns {TokenStatusEffectContainer}
     */
    #getContainer(fromToken = undefined) {
        const settings = fromToken ?? this.#token;

        if (settings.options.status_effects == null) {
            settings.options.status_effects = {};
        }

        return settings.options.status_effects;
    }

    /**
     * Retrieves the main status effects container for the current token within a global token stores with the ability to notify of a change.
     * @returns {GlobalStatusEffectConfig[]} - The collection of tokens within any global container.
     */
    #getMyContainers() {
        const target = this.id;
        const local = this.#getContainer();
        const scene = this.#getGlobalContainer(window.TOKEN_OBJECTS, target);
        const campaign = this.#getGlobalContainer(window.all_token_objects, target);

        const containers = [ { settings: local, hasChanges: (modified) => this.#hasPendingChanges(modified) }];

        if (scene != null && scene !== local) {
            containers.push({ settings: scene, hasChanges: TokenStatusEffects.#doNothing});
        }

        if (campaign != null && campaign !== local && campaign !== scene) {
            containers.push({ settings: campaign, hasChanges: TokenStatusEffects.#doNothing});
        }

        return containers;
    }

    /** Callback used when we are applying changes across the global token stores but we know the local token will be handling the sync */
    static #doNothing() { };
    
    /**
     * Retrieves the main status effects container for the targeted token within a global token stores with the ability to notify of a change.
     * @param {string} target - The identifier of the token to update
     * @returns {GlobalStatusEffectConfig[]} - The collection of tokens within any global container.
     */
    #getTargetContainers(target) {
        const scene = this.#getGlobalContainer(window.TOKEN_OBJECTS, target);
        const campaign = this.#getGlobalContainer(window.all_token_objects, target);
        const hasScene = (scene != null);

        const containers = [];
        if (scene != null) {
            containers.push({ settings: scene, hasChanges: (modified) => {
                if (modified === true) {
                    this.#pendingSceneTokens[target] = scene;
                }
            }});
        }

        if (campaign != null && campaign !== scene) {
            containers.push({ settings: campaign, hasChanges: (modified) => {
                if (!hasScene && modified === true) {
                    this.#pendingCampaignTokens[target] = campaign;
                }
            }});
        }

        return containers;
    }

    /**
     * Executes the provided callback against each of the provided status effect containers.
     * @param {GlobalStatusEffectConfig[]} targets - The collection of status effect containers to apply the changes to.
     * @param {(target: GlobalStatusEffectConfig) => void} commit - Callback used to commit changes to a token.
     */
    static #applyContainerChanges(targets, commit) {
        for (const target of targets) {
            commit(target)
        }
    }

    /**
     * Retrieves or initialized the main status effects container for a token within a global token store.
     * @param {Object.<string, Token>} tokens - The collection of tokens to update
     * @param {string} target - The identifier of the token to update
     */
    #getGlobalContainer(tokens, target) {
        const token = tokens[target];
        if (token == null) {
            return null;
        }

        return this.#getContainer(token);
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

    /** The amount of status effects that the token is allowed to concentrate on */
    get concentrationLimit() {
        return this.#getContainer().concentration?.limit ?? 1;
    }

    /**
     * Whether the token is entering or leaving the Incapacitated state
     * @param {boolean} affected - true when incapacitated; otherwise false
     * */
    isIncapacitated(affected) {
        const callback = (target) => {
            const settings = target.settings;
            const previous = settings.incapacitated;
            settings.incapacitated = (affected ?? false);
            target.hasChanges(settings.incapacitated !== previous);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        const settings = this.#getContainer();
        if (settings.incapacitated === true) {
            this.dropConcentration(settings);
        }
    }

    /**
     * Whether the token is allowed to concetrate on status effects
     * @param {boolean} allowed - Whether the token is permitted to concentrate
     * @param {number} limit - The maximum number of effects that the token can concentrate on
     * */
    canConcentrate(allowed, limit) {
        const callback = (target) => {
            const settings = this.#getConcentration(target.settings);
            const wasAllowed = settings.allowed;
            const previousLimit = settings.limit;

            settings.allowed = allowed ?? true;
            settings.limit = limit ?? 1;

            target.hasChanges(settings.allowed !== wasAllowed || settings.limit !== previousLimit);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        this.reviewConcentration();
    }

    /** Clones and appends the effect to the provided collection, then notifies the target that a change was made to it. */
    static #applyEffect(target, collection, effect) {
        const cloned = structuredClone(effect);
        collection.push(cloned);
        target.hasChanges(true);
    }

    /**
     * Appends a passive effect to the to the token.
     * @param {PassiveStatusEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyPassiveEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = this.getPassive(target.settings);
            TokenStatusEffects.#applyEffect(target, current, effect);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        return effect.tracking;
    }

    /**
     * Clears a passive status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropPassiveEffect(tracking) {
        let removedAnywhere = false;

        const callback = (target) => {
            const current = this.getPassive(target.settings);

            const rebuild = current.filter(item => item.tracking !== tracking);
            settings.passive = rebuild;

            const removed = (rebuild.length !== current.length);
            target.hasChanges(removed);

            if (removed) {
                removedAnywhere = true;
            }
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);
        
        return removedAnywhere;
    }

    /**
     * Appends a active effect to the to the token.
     * @param {ActiveStatusEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyActiveEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = this.getActive(target.settings);
            TokenStatusEffects.#applyEffect(target, current, effect);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        return effect.tracking;
    }

    /**
     * Clears an active status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropActiveEffect(tracking) {
        let removedAnywhere = false;

        const callback = (target) => {
            const current = this.getActive(target.settings);

            const rebuild = current.filter(item => item.tracking !== tracking);
            settings.active = rebuild;

            const removed = (rebuild.length !== current.length);
            target.hasChanges(removed);

            if (removed) {
                removedAnywhere = true;
            }
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);
        
        return removedAnywhere;
    }

    /** Drops all ongoing concentration effects */
    dropConcentration() {
        const callback = (target) => {
            const wasConcentrating = target.settings.concentrating;
            settings.concentrating = false;
            target.hasChanges(settings.concentrating !== wasConcentrating);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        const current = maintaining.filter(item => this.requiresConcentration(item));
        for (const effect of current) {
            this.dropMaintainedEffect(effect.tracking);
        }
    }

    /**
     * Appends a maintained effect to the to the token.
     * @param {MaintainedEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyMaintainedEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = this.getMaintaining(target.settings);
            TokenStatusEffects.#applyEffect(target, current, effect);
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        return effect.tracking;
    }

    /**
     * Spreads a maintained effect onto other tokens.
     * @param {string} tracking - The tracking identifier of the effect to spread.
     * @param {string[]} targets - The collection of token identifiers to spread the effect to.
     */
    spreadMaintainedEffect(tracking, targets) {
        const current = this.getMaintaining();
        const spreading = current.filter(item => item.tracking === tracking);

        if (spreading.length === 0) {
            return;
        }

        for (const id of targets) {
            const containers = this.#getTargetContainers(id);
            if (containers.length === 0) {
                continue;
            }

            for (const effect of spreading) {
                const callback = (applyTo) => {
                    const active = this.getActive(applyTo.settings);
                    const find = active.findIndex((check) => check.tracking === id);
                    if (find === -1) {
                        TokenStatusEffects.#applyEffect(applyTo, active, effect);
                    }
                };

                TokenStatusEffects.#applyContainerChanges(containers, callback);
            }
        }
    }

    /**
     * Clears a maintained status effect from the token by its tracking identifier along with any active effects on other tokens.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropMaintainedEffect(tracking) {
        let removedAnywhere = false;

        const callback = (target) => {
            const current = this.getMaintaining(target.settings);

            const rebuild = current.filter(item => item.tracking !== tracking);
            settings.maintaining = rebuild;

            const removed = (rebuild.length !== current.length);
            target.hasChanges(removed);

            if (removed) {
                removedAnywhere = true;
            }
        }

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, callback);

        if (removedAnywhere) {
            removedAnywhere = this.#dropGlobalTargetEffects(window.TOKEN_OBJECTS, tracking, this.#pendingSceneTokens) || removedAnywhere;
            removedAnywhere = this.#dropGlobalTargetEffects(window.all_token_objects, tracking, this.#pendingCampaignTokens) || removedAnywhere;
        }
        
        return removedAnywhere;
    }

    /**
     * Clears an active status effect from all tokens in the collection by its tracking identifier.
     * @param {Object.<string, Token>} tokens - The collection of 
     * @param {string} tracking - The tracking identifier of the effect to drop.
     */
    #dropGlobalTargetEffects(tokens, tracking, changes) {
        let removedAnywhere = false;
        for (const [key, value] of Object.entries(tokens)) {
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

        if (settings.incapacitated === true || concentration.allowed === false) {
            this.dropConcentration();
            return 0;
        }

        const maintaining = this.getMaintaining(settings);
        const current = maintaining.filter(item => this.requiresConcentration(item));
        if (current.length === 0) {
            if (settings.concentrating !== false) {
                this.dropConcentration();
            }

            return 0;
        }

        let limit = concentration.limit || 1;
        if (limit < 0) {
            const callback = (target) => {
                const localChange = this.#getConcentration(target.settings);
                localChange.limit = 0;
                target.hasChanges(true);
            }

            limit = 0;
            const containers = this.#getMyContainers();
            TokenStatusEffects.#applyContainerChanges(containers, callback);
        }

        if (current.length <= limit) {
            return current.length;
        }

        if (limit < 1) {
            this.dropConcentration();
            return 0;
        }
        
        const abandoned = [];

        // Since the token is beyond its concentration limit, 
        // we need to end the appropriate number of the earliest effects
        while (current.length > limit) {
            const leaving = current.shift();
            abandoned.push(leaving);
        }

        for (const effect of abandoned) {
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