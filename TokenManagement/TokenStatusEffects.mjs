/** @import { Token } from './Token.types.js' */
/** @import { GlobalStatusEffectConfig, TokenStatusEffectContainer, Concentration, MaintainedEffect, ActiveStatusEffect, PassiveStatusEffect, StatusEffect } from './TokenStatusEffects.types.js' */

import StatBlock from './StatBlock.mjs';

/**
 * Manages the active, passive, and maintained (concentration) status effects that are currently effecting to a token.
 */
export default class TokenStatusEffects {
    /** @type {StatBlock} */
    #stats;
    /** @type {{ [key: string]: Token}} */
    #pendingSceneTokens;
    /** @type {{ [key: string]: Token}} */
    #pendingCampaignTokens;
    /** @type {number} */
    #version;

    /**
     * Manages the status effects associated with the provided Token
     * @param {StatBlock} stats
     */
    constructor(stats){
        this.#stats = stats;
        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};
        this.#version = Date.now();
    }

    /** Requests a token update message to be dispatched only if there are pending changes that have been observed by this instance */
    sync() {
        this.#syncWithCallback((stats) => stats.sync());
    }

    /**
     * Requests a token update message to be dispatched and updates any related interface components 
     * only if there are pending changes that have been observed by this instance */
    update_and_sync() {
        this.#syncWithCallback((stats) => stats.update_and_sync());
    }

    /**
     * Performs the sync operation using the provided callback.
     * @param {(stats: StatBlock) => boolean} callback - The callback made to sync the stat block
     */
    #syncWithCallback(callback) {
        const scene = {...this.#pendingSceneTokens};
        const campaign = {...this.#pendingCampaignTokens};
        
        this.#pendingSceneTokens = {};
        this.#pendingCampaignTokens = {};

        if (callback(this.#stats) === true) {
            const target = this.id;
            delete scene[target];
            delete campaign[target];
        }

        for (const key in scene) {
            delete campaign[key]
        }

        for (const target of Object.values(scene)) {
            callback(target.stats);
        }

        for (const target of Object.values(campaign)) {
            callback(target.stats);
        }
    }

    /** @returns {StatBlock} The stat block that is being modified by these effects. */
    get stats() {
        return this.#stats;
    }

    /** @returns {Token} The token that is being managed */
    get token() {
        return this.#stats.token;
    }

    /** @returns {string} The identifier of the token being managed */
    get id() {
        return this.#stats.token.options.id;
    }

    /** @returns {number} The current version of the status effects */
    get version() {
        return this.#version;
    }

    /**
     * Retrieves or initialized the main status effects container from the token options.
     * @returns {TokenStatusEffectContainer}
     */
    #getContainer() {
        return TokenStatusEffects.#initContainer(this.#stats.token);
    }

    /**
     * Retrieves or initialized the main status effects container from the token options.
     * @param {Token} forToken - The token to retrieve the status effect container for.
     * @returns {TokenStatusEffectContainer}
     */
    static #initContainer(forToken) {
        if (forToken.options.status_effects == null) {
            forToken.options.status_effects = {};
        }

        return forToken.options.status_effects;
    }

    /**
     * Retrieves the main status effects container for the current token within global token stores with the ability to notify of a change.
     * @returns {GlobalStatusEffectConfig[]} - The collection of tokens within any global container.
     */
    #getMyContainers() {
        const target = this.id;
        const local = this.#getContainer();
        const [scene, sceneToken] = TokenStatusEffects.#getGlobalContainer(window.TOKEN_OBJECTS, target);
        const [campaign, campaignToken] = TokenStatusEffects.#getGlobalContainer(window.all_token_objects, target);

        const containers = [ { settings: local, hasChanges: (modified) => this.#stats.hasPendingChanges(modified) }];

        if (scene != null && scene !== local) {
            containers.push({ settings: scene, hasChanges: (modified) => {
                if (modified === true) {
                    this.#pendingSceneTokens[target] = sceneToken;
                }
            }});
        }

        if (campaign != null && campaign !== local && campaign !== scene) {
            containers.push({ settings: campaign, hasChanges: (modified) => {
                if (modified === true) {
                    this.#pendingCampaignTokens[target] = campaignToken;
                }
            }});
        }

        return containers;
    }
    
    /**
     * Retrieves the main status effects container for the targeted token within a global token stores with the ability to notify of a change.
     * @param {string} target - The identifier of the token to update
     * @returns {GlobalStatusEffectConfig[]} - The collection of tokens within any global container.
     */
    #getTargetContainers(target) {
        const [scene, sceneToken] = TokenStatusEffects.#getGlobalContainer(window.TOKEN_OBJECTS, target);
        const [campaign, campaignToken] = TokenStatusEffects.#getGlobalContainer(window.all_token_objects, target);

        const containers = [];
        if (scene != null) {
            containers.push({ settings: scene, hasChanges: (modified) => {
                if (modified === true) {
                    this.#pendingSceneTokens[target] = sceneToken;
                }
            }});
        }

        if (campaign != null && campaign !== scene) {
            containers.push({ settings: campaign, hasChanges: (modified) => {
                if (modified === true) {
                    this.#pendingCampaignTokens[target] = campaignToken;
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
    static #getGlobalContainer(tokens, target) {
        const token = tokens[target];
        if (token == null) {
            return [null, null];
        }

        return [TokenStatusEffects.#initContainer(token), token];
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
     * Applies all of the active status effects to the stat block and 
     * requests a recalculation of all properties after the changes are applied
     */
    reapply() {
        this.#version = Date.now();

        this.#stats.recalculate();
    }

    /**
     * Whether the token is entering or leaving the Incapacitated state
     * @param {boolean} affected - true when incapacitated; otherwise false
     * */
    isIncapacitated(affected) {
        const callback = (target) => {
            const settings = target.settings;
            const previous = (settings.incapacitated ?? false);
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
     * Retrieves or initialized the concentration settings for the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {Concentration}
     */
    static #initConcentration(container) {
        if (container.concentration == null) {
            container.concentration = { };
        }

        return container.concentration;
    }

    /**
     * Whether the token is allowed to concetrate on status effects
     * @param {boolean} allowed - Whether the token is permitted to concentrate
     * @param {number} limit - The maximum number of effects that the token can concentrate on
     * */
    canConcentrate(allowed, limit) {
        const callback = (target) => {
            const settings = TokenStatusEffects.#initConcentration(target.settings);
            const wasAllowed = (settings.allowed ?? true);
            const previousLimit = (settings.limit ?? 1);

            settings.allowed = (allowed ?? true);
            settings.limit = (limit ?? 1);

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
     * Retrieves or initialized the collection of passive effects for the token.
     * @returns {PassiveStatusEffect[]}
     */
    getPassive() {
        const settings = this.#getContainer();
        return TokenStatusEffects.#initPassive(settings);
    }

    /**
     * Retrieves or initialized the collection of passive effects for the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {PassiveStatusEffect[]}
     */
    static #initPassive(container) {
        if (container.passive == null) {
            container.passive = [];
        }

        return container.passive;
    }

    /**
     * Appends a passive effect to the to the token.
     * @param {PassiveStatusEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyPassiveEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = TokenStatusEffects.#initPassive(target.settings);
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
            const current = TokenStatusEffects.#initPassive(target.settings);

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
     * Retrieves or initialized the collection of active effects for the token.
     * @returns {ActiveStatusEffect[]}
     */
    getActive() {
        const settings = this.#getContainer();
        return TokenStatusEffects.#initActive(settings);
    }

    /**
     * Retrieves or initialized the collection of active effects for the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {ActiveStatusEffect[]}
     */
    static #initActive(container) {
        if (container.active == null) {
            container.active = [];
        }

        return container.active;
    }

    /**
     * Appends a active effect to the to the token.
     * @param {ActiveStatusEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyActiveEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = TokenStatusEffects.#initActive(target.settings);
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
            const current = TokenStatusEffects.#initActive(target.settings);

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
        console.log(`Dropping concentration for ${this.id}`);

        const containers = this.#getMyContainers();
        TokenStatusEffects.#applyContainerChanges(containers, TokenStatusEffects.#dropConcentrationCallback);

        const maintaining = this.getMaintaining();
        const current = maintaining.filter(item => this.requiresConcentration(item));
        for (const effect of current) {
            this.dropMaintainedEffect(effect.tracking);
        }
    }

    /** Removes the concentration flag from the target */
    static #dropConcentrationCallback(target) {
        if ((target.settings.concentrating ?? false) !== false) {
            target.settings.concentrating = false;
            target.hasChanges(true);
        }
    }

    /**
     * Retrieves or initialized the collection of maintained effects for the token.
     * @returns {MaintainingStatusEffect[]}
     */
    getMaintaining() {
        const settings = this.#getContainer();
        return TokenStatusEffects.#initMaintaining(settings);
    }

    /**
     * Retrieves or initialized the collection of maintained effects for the token.
     * @param {TokenStatusEffectContainer?} container - The status effect container to retrieve the concentration settings from.
     * @returns {MaintainingStatusEffect[]}
     */
    static #initMaintaining(container) {
        if (container.maintaining == null) {
            container.maintaining = [];
        }

        return container.maintaining;
    }

    /**
     * Appends a maintained effect to the to the token.
     * @param {MaintainedEffect} effect - The status effect to append to the token.
     * @returns {string} The tracking identifier of the effect.
     */
    applyMaintainedEffect(effect) {
        effect.tracking = uuid();

        const callback = (target) => {
            const current = TokenStatusEffects.#initMaintaining(target.settings);
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
                    const active = TokenStatusEffects.#initActive(applyTo.settings);
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
            const current = TokenStatusEffects.#initMaintaining(target.settings);

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
            const settings = TokenStatusEffects.#initContainer(value);
            const current = TokenStatusEffects.#initActive(settings);

            const rebuild = current.filter(item => item.tracking !== tracking);
            settings.active = rebuild;

            const removed = (rebuild.length !== current.length);
            if (removed) {
                removedAnywhere = true;
                changes[key] = value;
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
        const concentration = TokenStatusEffects.#initConcentration(settings);

        if ((settings.incapacitated ?? false) === true || (concentration.allowed ?? true) === false) {
            this.dropConcentration();
            return 0;
        }

        const maintaining = TokenStatusEffects.#initMaintaining(settings);
        const current = maintaining.filter(item => this.requiresConcentration(item));
        if (current.length === 0) {
            if ((settings.concentrating ?? false) !== false) {
                this.dropConcentration();
            }

            return 0;
        }

        let limit = concentration.limit || 1;
        if (limit < 0) {
            const callback = (target) => {
                const localChange = TokenStatusEffects.#initConcentration(target.settings);
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