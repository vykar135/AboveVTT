import { GetCharacterId, IsGameMaster, WaitingForScene } from './CoreEnums.mjs'
import StatBlock from './StatBlock.mjs';

export const ActorEvent = 'avtt.actor';

export class StatBlockCacheManager {
    /** @type {{ [id: string]: StatBlock }} */
    #cache = {};
    /** @type {StatBlock | undefined} */
    #character;
    /** @type {StatBlock | undefined} */
    #actor;

    constructor() {
        this.#cache = {};
        this.#character = undefined;
        this.#actor = undefined;

        this.#loadPlayers();
        Object.freeze(this);
    }

    /** Retrieves the primary character stat block to use when a player is viewing the VTT. */
    get primary() {
        return this.#character;
    }

    /** Gets the stat block that the user is currently acting as; will default to the primary character when applicable. */
    get actor() { return this.#actor ?? this.#character; }

    /**
     * Updates the current actor within the tabletop.
     * @param {StatBlock | undefined} actor - The stat block for the current actor.
     */
    changeActor(actor) {
        if (actor == null || actor instanceof StatBlock) {
            this.#actor = actor;

            const notify = this.#createActorEvent();
            window.dispatchEvent(notify);
        }
    }

    /**
     * Registers a callback to monitor for changes to the tabletop actor.
     * @param {(event: Event) => void} callback 
     * @returns {() => void} Callback used to remove the event listener. */
    monitorActor(callback) {
        const notify = this.#createActorEvent();
        callback(notify);

        window.addEventListener(ActorEvent, callback);

        return () => {
            window.removeEventListener(ActorEvent, callback);
        };
    }

    /** Creates an instance of an event related to the modification of the current actor. */
    #createActorEvent() {
        const actor = this.actor;

        return new CustomEvent(ActorEvent, {
            detail: {
                actor: actor
            },
            bubbles: false,
            cancelable: false
        });
    }

    /**
     * Gets or adds the stat block from the central store
     * @param {string} id - The identifier of the character or creature to build the stat block for. */
    get(id){
        if (id == null) {
            return undefined;
        }

        if (id in this.#cache) {
            return this.#cache[id];
        }

        const stats = new StatBlock(id);
        this.#cache[stats.id] = stats;

        stats.rebuild();
        return stats;
    }

    /**
     * Gets the stat block from the central store without initializing it.
     * @param {string} id - The identifier of the character or creature. */
    lookup(id){
        if (id != null && id in this.#cache) {
            return this.#cache[id];
        }

        return undefined;
    }

    /** Provides an enumeration of all available stat blocks. */
    list() {
        return Object.values(this.#cache);
    }

    /** Provides an enumeration of all stat blocks that the user is a contributor to. */
    listMine() {
        const available = this.list();
        if (IsGameMaster()) {
            return available;
        }

        return available.filter(entry => entry.isContributor);
    }

    /** Waits for the scene to load then initializes any */
    #loadPlayers() {
        if (WaitingForScene()) {
            window.setTimeout(this.#loadPlayers.bind(this), 1000);
            return;
        }

        const active = GetCharacterId()?.toString()?.toLowerCase();
        for (const entry of window.pcs) {
            const character = this.get(entry.sheet);
            if (character == null) {
                continue;
            }

            if (character.level === 0) {
                character.rebuild();
            }

            if (character.characterId != null && character.characterId === active) {
                this.#character = character;
            }
        }

        const notify = this.#createActorEvent();
        window.dispatchEvent(notify);
    }
}

export const StatBlockCache = new StatBlockCacheManager();