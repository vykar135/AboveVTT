/** @import { Token } from './Token.types.js' */
/** @import { TokenStatusEffectContainer, Concentration, MaintainedEffect, ActiveStatusEffect, PassiveStatusEffect, StatusEffect } from './TokenStatusEffects.types.js' */

import StatBlock, { ListStatBlocks, LookupStatBlock } from './StatBlock.mjs';

/**
 * @typedef GlobalStatusEffectConfig
 * @property {TokenStatusEffectContainer} settings - The configuration for status effects.
 * @property {TokenStatusEffects} effects - The status effects being modified.
 * @property {(modified: boolean) => void} hasChanges - Callback used to notify the status effect manager of a change
 */

/**
 * Manages the active, passive, and maintained (concentration) status effects that are currently effecting to a token.
 */
export default class TokenStatusEffects {
    #stats;
    #version;
    #incapacitatedSources;
    #concentrating;

    /** @type {{ [key: string]: StatBlock}} */
    #affectedTokens;

    /**
     * Manages the status effects associated with the provided Token
     * @param {StatBlock} stats */
    constructor(stats){
        this.#stats = stats;
        this.#affectedTokens = {};
        this.#version = Date.now();
        this.#incapacitatedSources = new Set();
        this.#concentrating = false;

        Object.freeze(this);
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
        const affected = {...this.#affectedTokens};
        
        this.#affectedTokens = {};

        this.#stats.recalculate();
        if (callback(this.#stats) === true) {
            const target = this.id;
            delete affected[target];
        }

        for (const target of Object.values(affected)) {
            target.recalculate();
            callback(target);
        }
    }

    /** @returns {StatBlock} The stat block that is being modified by these effects. */
    get stats() {
        return this.#stats;
    }

    /** @returns {string} The identifier of the token being managed */
    get id() { return this.#stats.token?.options?.id; }

    /** @returns {number} The current version of the status effects */
    get version() { return this.#version; }

    /** Whether the token is currently affected by the Incapacitated state */
    get incapacitated() { return (this.#incapacitatedSources.size > 0); }

    /** Whether the token is currently concentrating on one or more effects */
    get concentrating() { return this.#concentrating; }

    /** Whether the token is permitted to concentrate */
    get concentrationAllowed() {
        return this.#getContainer().concentration?.allowed ?? true;
    }

    /** The amount of status effects that the token is allowed to concentrate on */
    get concentrationLimit() {
        return this.#getContainer().concentration?.limit ?? 1;
    }

    /**
     * Retrieves or initialized the main status effects container from the token options.
     * @returns {TokenStatusEffectContainer}
     */
    #getContainer() {
        const token = this.#stats.token;
        if (token.options.status_effects == null) {
            token.options.status_effects = {};
        }

        return token.options.status_effects;
    }
    
    /**
     * Retrieves the main stat block for the targeted token.
     * @param {string} target - The identifier of the token to update
     * @returns {StatBlock | undefined}
     */
    #getTargetStatBlock(target) {
        const cached = LookupStatBlock(target);
        if (cached == null) {
            return undefined;
        }

        return cached;
    }

    /**
     * Applies all of the active status effects to the stat block
     */
    reapply() {
        this.#version = Date.now();
    }

    /**
     * Whether the token is entering or leaving the Incapacitated state
     * @param {string} source - The source of the incapacitation.
     * @param {boolean} affected - true when incapacitated; otherwise false
     * */
    isIncapacitated(source, affected) {
        const current = this.#incapacitatedSources.size;
        if (affected === true) {
            this.#incapacitatedSources.add(source);
        } else {
            this.#incapacitatedSources.delete(source);
        }

        if (this.#incapacitatedSources.size > 0 && current === 0) {
            this.dropConcentration();
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
        const container = this.#getContainer();
        const settings = TokenStatusEffects.#initConcentration(container);
        const wasAllowed = (settings.allowed ?? true);
        const previousLimit = (settings.limit ?? 1);

        settings.allowed = (allowed ?? true);
        settings.limit = (limit ?? 1);

        this.#stats.hasPendingChanges(settings.allowed !== wasAllowed || settings.limit !== previousLimit);

        this.reviewConcentration();
    }

    /**
     * Clones and appends the effect to the provided collection, then notifies the target that a change was made to it.
     * @param {GlobalStatusEffectConfig} target 
     * @param {StatusEffect[]} collection 
     * @param {StatusEffect} effect 
     * */
    #applyEffect(collection, effect) {
        const cloned = structuredClone(effect);
        collection.push(cloned);
        this.#stats.hasPendingChanges(true);
    }

    /**
     * Retrieves or initialized the collection of passive effects for the token.
     * @returns {PassiveStatusEffect[]} */
    getPassive() {
        const container = this.#getContainer();
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

        const passives = this.getPassive();
        this.#applyEffect(passives, effect);

        return effect.tracking;
    }

    /**
     * Clears a passive status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropPassiveEffect(tracking) {
        const current = this.getPassive();
        if (current.length === 0) {
            return false;
        }

        const rebuild = current.filter(item => item.tracking !== tracking);

        const container = this.#getContainer();
        container.passive = rebuild;

        const removed = (rebuild.length !== current.length);
        this.#stats.hasPendingChanges(removed);

        return removed;
    }

    /**
     * Retrieves or initialized the collection of active effects for the token.
     * @returns {ActiveStatusEffect[]}
     */
    getActive() {
        const container = this.#getContainer();
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

        const current = this.getActive();
        this.#applyEffect(current, effect);

        return effect.tracking;
    }

    /**
     * Clears an active status effect from the token by its tracking identifier.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropActiveEffect(tracking) {
        const current = this.getActive();
        if (current.length === 0) {
            return false;
        }

        const rebuild = current.filter(item => item.tracking !== tracking);

        const container = this.#getContainer();
        container.active = rebuild;

        const removed = (rebuild.length !== current.length);
        this.#stats.hasPendingChanges(removed);

        return removed;
    }

    /** Drops all ongoing concentration effects */
    dropConcentration() {
        console.log(`Dropping concentration for ${this.#stats.token?.options?.itemType} ${this.id} => ${this.#stats.name}`);

        this.#concentrating = false;

        const maintaining = this.getMaintaining();
        if (maintaining.length === 0) {
            return;
        }

        const current = maintaining.filter(item => this.requiresConcentration(item));
        for (const effect of current) {
            this.dropMaintainedEffect(effect.tracking);
        }
    }

    /**
     * Retrieves or initialized the collection of maintained effects for the token.
     * @returns {MaintainingStatusEffect[]}
     */
    getMaintaining() {
        const container = this.#getContainer();
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

        const current = this.getMaintaining();
        this.#applyEffect(current, effect);

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
            const target = this.#getTargetStatBlock(id);
            if (target == null) {
                continue;
            }

            for (const effect of spreading) {
                const active = target.statusEffects.getActive();
                const find = active.findIndex((check) => check.tracking === id);
                if (find === -1) {
                    target.statusEffects.#applyEffect(active, effect);
                    this.#affectedTokens[target.id] = target;
                }
            }
        }
    }

    /**
     * Clears a maintained status effect from the token by its tracking identifier along with any active effects on other tokens.
     * @param {string} tracking - The tracking identifier of the effect to drop.
     * @returns {boolean} - Whether an effect was removed.
     */
    dropMaintainedEffect(tracking) {
        const current = this.getMaintaining();
        const rebuild = current.filter(item => item.tracking !== tracking);

        const container = this.#getContainer();
        container.maintaining = rebuild;

        let removed = (rebuild.length !== current.length);
        this.#stats.hasPendingChanges(removed);

        const available = ListStatBlocks();
        for (const target of available) {
            const localRemove = target.dropActiveEffect(tracking);
            if (localRemove) {
                this.#affectedTokens[target.id] = target;
                removed = true;
            }
        }
        
        return removed;
    }

    /**
     * Review the current settings and maintained effects to determine if any updates to the token need to occur.
     * @returns {number} - The number of effects that are currently being concentrated on.
     */
    reviewConcentration() {
        const settings = this.#getContainer();
        const concentration = TokenStatusEffects.#initConcentration(settings);

        if (this.incapacitated === true || (concentration.allowed ?? true) === false) {
            this.dropConcentration();
            return 0;
        }

        const maintaining = this.getMaintaining();
        const current = maintaining.filter(item => this.requiresConcentration(item));
        if (current.length === 0) {
            if (this.#concentrating === true) {
                this.dropConcentration();
            }

            return 0;
        }

        let limit = concentration.limit ?? 1;
        if (limit < 0) {
            limit = 0;
            concentration.limit = 0;
            this.#stats.hasPendingChanges(true);
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