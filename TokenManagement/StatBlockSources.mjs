import { DiceActionsEnabled, uriEquals } from "./CoreEnums.mjs";
import StatBlock, { GetStatBlock, ListStatBlocks, WaitingForScene } from "./StatBlock.mjs";

/** @param {(stats: StatBlock) => boolean} filter  */
function refreshFilteredStatBlocks(filter) {
    if (!DiceActionsEnabled) {
        return;
    }

    const available = ListStatBlocks();
    for (const stats of available) {
        if (filter(stats) === true) {
            stats.rebuild();
        }
    }
}

/** @param {(stats: StatBlock) => boolean} filter  */
function refreshFilteredTokens(filter) {
    if (!DiceActionsEnabled) {
        return;
    }

    const available = ListStatBlocks();
    for (const stats of available) {
        if (stats.token?.options == null) {
            continue;
        }

        if (filter(stats) === true) {
            stats.rebuild();
        }
    }
}

/** Forces any stat blocks within the global cache with the specified identifier to rebuild */
export function refreshStatBlock(id) {
    if (id == null) {
        return;
    }

    refreshFilteredStatBlocks((stats) => (stats.id === id));
}

// #region Player Character Sheets

/** Forces any stat blocks within the global cache that implement the specified player character sheet to rebuild */
export function refreshPlayerSheets(player) {
    if (player == null) {
        return;
    }

    refreshFilteredStatBlocks((stats) => (stats.characterUri === player));
}

/** Forces any stat blocks within the global cache that implement the specified extended player character sheet to rebuild */
export function refreshPlayerExtended(player) {
    if (!DiceActionsEnabled) {
        return;
    }

    if (player == null) {
        return;
    }

    const asNumber = (typeof player === 'number') ? player : parseInt(player);
    const asString = player.toString();

    refreshFilteredStatBlocks((stats) => (stats.characterId === asNumber || stats.characterId === asString));
}

/** Cache of v5 character sheets */
const playerSheetsExt = {};

/** Loads the cache of extended player character sheets for the provided identifier */
export function fetchPlayerExtendedSheet(id) {
    if (!DiceActionsEnabled) {
        return;
    }

    if (typeof id === 'number') {
        id = id.toString();
    }

    const owner = (window.DM || window.characterData?.id?.toString() === (id ?? ''));
    if (!owner || id == null || typeof id !== 'string' || id.trim().length <= 1) {
        return undefined;
    }

    if (id in playerSheetsExt) {
        return playerSheetsExt[id].sheet;
    }

    const loader = { loading: true, failed: false, sheet: undefined };
    playerSheetsExt[id] = loader;

    if (window.characterData?.id?.toString() == id) {
        loader.sheet = window.characterData;
        return loader.sheet;
    }

    DDBApi.fetchCharacter(id).then((payload) => {
        loader.sheet = payload;
        refreshPlayerExtended(id);
    }).catch((error) => {
        loader.failed = true;
        console.error(`Failed to load extended player character sheet ${id}`, error);
    }).finally(() => {
        loader.loading = false
    });

    return loader.sheet;
}

// #endregion

// #region Open 5e

/** Forces any stat blocks within the global cache that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshOpen5eStatBlocks(monster) {
    if (monster == null) {
        return;
    }
    
    monster = monster.toLowerCase();
    refreshFilteredTokens((stats) => (uriEquals(stats.token.options.itemType, 'open5e') && uriEquals(stats.token.options.itemId, monster)));
}

const open5eCreatures = {};

/** Retrieves the common Open 5E stat block if the token is an instance of one */
export function fetchOpen5eSheetForToken(token) {
    if (!DiceActionsEnabled) {
        return;
    }

    if (!uriEquals(token?.options?.itemType, 'open5e') || token?.options?.itemId == null){
        return null;
    }

    return fetchOpen5eSheet(token.options.itemId);
}

/** Loads the cache of Open 5E creature stat blocks for the provided key */
export function fetchOpen5eSheet(key) {
    if (!DiceActionsEnabled) {
        return;
    }

    key = key?.toLowerCase();
    if (key == null) {
        return undefined;
    }

    if (key in open5eCreatures) {
        return open5eCreatures[key].sheet;
    }

    const loader = { loading: true, failed: false, sheet: undefined };
    open5eCreatures[key] = loader;

    // We are doing single lookups here because any fragility with the API calls
    // should not prevent entire batches from loading and this is only reacting
    // to tokens within the campaign
    let url = `https://api.open5e.com/v2/creatures/?key__in=${key}&limit=1`
    fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to load Open5e creature stat block ${key} with status code ${response.status}`);
        }

        return response.json();
    }).then((payload) => {
        loader.sheet = payload?.results?.find(entry => uriEquals(entry.key, key));
        refreshOpen5eStatBlocks(key);
    }).catch((error) => {
        loader.failed = true;
        console.error(`Failed to load Open5e creature stat block ${key}`, error);
    }).finally(() => loader.loading = false);

    return undefined;
}

// #endregion

// #region D&D Beyond Monsters

const beyondCreatures = {
    sheets: {},
    pending: new Set(),
    timer: undefined,
    delay: 2000 // Initial wait delay while the VTT loads
};

/** Forces any stat blocks within the global cache that implement the specified D&D Beyond monster stat block to rebuild */
export function refreshMonsterStatBlocks(monster) {
    if (monster == null) {
        return;
    }

    refreshFilteredTokens((stats) => (stats.token.options.monster === monster));
}

/**
 * Loads the cache of D&D Beyond creature stat blocks for the provided token
 * @param {Token} token - The token to retrieve the monster stat block for.
 */
export function fetchBeyondSheetForToken(token) {
    if (!DiceActionsEnabled) {
        return;
    }

    const itemType = token?.options?.itemType?.toLowerCase();
    if (itemType !== 'monster') {
        return undefined;
    }

    const monster = token.options.monster ?? token.options.itemId;
    if (monster == null){
        return undefined;
    }

    return fetchBeyondSheet(monster);
}

/**
 * Loads the cache of D&D Beyond creature stat blocks for the provided identifier
 * @param {number | undefined} monster - The identifier of the monster to retrieve.
 */
export function fetchBeyondSheet(monster) {
    if (!DiceActionsEnabled) {
        return;
    }

    if (monster == null) {
        return undefined;
    }

    if (monster in beyondCreatures.sheets) {
        const requested = beyondCreatures.sheets[monster];
        if (requested.sheet !== undefined) {
            return requested.sheet;
        }

        const fromCache = cached_monster_items[monster]?.monsterData;
        if (fromCache !== undefined) {
            beyondCreatures.pending.delete(monster);
            if (beyondCreatures.pending.size === 0 && beyondCreatures.timer !== undefined) {
                window.clearTimeout(beyondCreatures.timer);
                beyondCreatures.timer = undefined;
            }

            requested.sheet = fromCache;
            requested.loading = false;
            requested.failed = false;
        }

        return requested.sheet;
    }

    const fromCache = cached_monster_items[monster]?.monsterData;
    const loader = { loading: true, failed: false, sheet: fromCache };
    beyondCreatures.sheets[monster] = loader;

    if (fromCache != null) {
        return fromCache;
    }

    appendPendingBeyondMonster(monster);
    return undefined;
}

/** Adds a monster to the pending queue and starts the wait timer to give the existing caches time if needed */
function appendPendingBeyondMonster(monster) {
    beyondCreatures.pending.add(monster);

    if (beyondCreatures.timer === undefined) {
        beyondCreatures.timer = window.setTimeout(fetchPendingBeyondSheets, beyondCreatures.delay);
    }
}

/** Loads the cache of D&D Beyond creature stat blocks for any currently pending keys */
function fetchPendingBeyondSheets() {
    if (WaitingForScene()) {
        beyondCreatures.timer = window.setTimeout(fetchPendingBeyondSheets, beyondCreatures.delay);
        return;
    }

    const reviewing = new Set(beyondCreatures.pending.values());
    beyondCreatures.pending.clear();
    beyondCreatures.timer = undefined;

    const updating = [];
    for (const key of reviewing.values()) {
        const requested = beyondCreatures.sheets[key];
        if (requested.sheet !== undefined) {
            continue;
        }

        const fromCache = cached_monster_items[key]?.monsterData;
        if (fromCache !== undefined) {
            requested.sheet = fromCache;
            requested.loading = false;
            requested.failed = false;
            continue;
        }

        updating.push(key);
    }

    if (updating.length === 0) {
        return;
    }

    const individual = () => {
        for (const monster of updating) {
            const target = beyondCreatures.sheets[monster];

            DDBApi.fetchMonsters([monster]).then((response) => {
                target.sheet = response?.find(entry => entry.id === monster);
                target.failed = false;
                refreshMonsterStatBlocks(monster);
            }).catch((error) => {
                target.failed = true;
                console.error(`Failed to load D&D Beyond creature stat block ${monster}`, error);
            }).finally(() => target.loading = false);
        }
    }

    // Attempt a batch fetch first but if it fails roll over to the indivual fetch
    DDBApi.fetchMonsters(updating).then((response) => {
        for (const monster of updating) {
            const target = beyondCreatures.sheets[monster];
            target.sheet = response?.find(entry => entry.id === monster);
            target.failed = false;
            target.loading = false
            refreshMonsterStatBlocks(monster);
        }
    }).catch((error) => {
        console.error('Batch retrieval of D&D Beyond monster sheet failed; rolling over to individual lookups', error);
        individual();
    });
}

// #endregion

// Addressing compatibility issues
window.statBlocks = Object.freeze({
    get: GetStatBlock,
    isEnabled:  () => DiceActionsEnabled,
    refreshStatBlock:  refreshStatBlock,
    refreshPlayer:  refreshPlayerSheets,
    refreshMonster:  refreshMonsterStatBlocks,
    refreshOpen5e:  refreshOpen5eStatBlocks
});