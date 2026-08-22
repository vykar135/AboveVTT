/** @import StatBlock from './StatBlock.mjs' */
/** @import TokenStatusEffects from './TokenStatusEffects.mjs' */

/**
 * @typedef {Object<string, any> & {
 *     id: string,
 *     conditions: (string | TokenCondition)[],
 *     custom_conditions: (string | TokenCondition)[],
 *     hitPointInfo: TokenHitPointInfo,
 *     armorClass: number | string,
 *     name: string,
 *     left: string,
 *     top: string,
 *     size: number,
 *     imgsrc: string,
 *     sheet: string
 * }} TokenOptions
 */

/** @typedef {{name: string, text?: string, level?: number, duration?: number}} TokenCondition */

/**
 * @typedef {Object} TokenHitPointInfo
 * @property {number | string} maximum - The token's maximum hit points.
 * @property {number | string} current - The token's current hit points, excluding temporary hit points.
 * @property {number | string} temp - The token's temporary hit points.
 */

/**
 * @typedef {Object} Token
 * @property {boolean} selected - Whether the token is currently selected.
 * @property {TokenOptions} options - The persisted options and configuration for the token.
 * @property {boolean} doing_highlight - Whether the token is currently being highlighted.
 * @property {number} SCENE_MOVE_GRID_PADDING_MULTIPLIER - The number of token sizes the token may move outside the scene.
 * @property {number} MIN_TOKEN_SIZE - The minimum token size in pixels.
 * @property {number} MAX_TOKEN_SIZE - The maximum token size in pixels.
 * @property {StatBlock} stats - The normalized stat block for the token.
 * @property {TokenStatusEffects} statusEffects - The manager for active, passive, and maintained token status effects.
 * @property {number} hp - The total of the token's base hit points and temporary hit points.
 * @property {number} totalHp - The total hit points assigned to the token, including temporary hit points.
 * @property {number} hpPercentage - The percentage of the token's base hit points relative to its maximum hit points.
 * @property {number} baseHp - The token's hit points without adding temporary hit points.
 * @property {number} tempHp - The token's temporary hit points.
 * @property {number} tempHpPercentage - The percentage of the token's temporary hit points relative to its maximum hit points.
 * @property {number} maxHp - The token's maximum hit points.
 * @property {number} ac - The token's armor class.
 * @property {string[]} conditions - The names of the conditions currently active on the token.
 * @property {Object} walkableArea - The scene bounds within which the token can be moved.
 * @property {boolean} isLineAoe - Whether the token represents a line area of effect.
 * @property {boolean} isAoe - Whether the token represents an area-of-effect shape rather than an image.
 * @property {boolean} isPlayer - Whether the token represents a player character.
 * @property {boolean} isCurrentPlayer - Whether the token represents the current player character.
 * @property {boolean} isMonster - Whether the token represents a monster.
 * @property {boolean} isInCombatTracker - Whether the token is currently in the combat tracker.
 * @property {() => void} stopAnimation
 * @property {() => void} moveToTop
 * @property {() => void} moveToBottom
 * @property {() => boolean} tinyToken
 * @property {() => boolean} isPlayerLocked
 * @property {() => boolean} isDMLocked
 * @property {() => boolean} isSelectable
 * @property {() => {width: number, height: number}} numberOfGridSpaces
 * @property {() => number} sizeWidth
 * @property {() => number} sizeHeight
 * @property {(conditionName: string) => boolean} hasCondition
 * @property {(conditionName: string) => number | undefined} conditionDuration
 * @property {(conditionName: string, text?: string) => void} addCondition
 * @property {(conditionName: string) => void} removeCondition
 * @property {(imageUrl: string) => Promise<void>} removeAlternativeImage
 * @property {() => {customStatBlock?: string, pcURL?: string}} getCustomPcUrl
 * @property {(newSize: number, linewidth?: boolean) => void} size
 * @property {(imageScale: number) => void} imageSize
 * @property {() => void} hide
 * @property {() => void} show
 * @property {(persist?: boolean, removeFromCombatTracker?: boolean) => void} delete
 * @property {(newRotation: number) => void} rotate
 * @property {() => void} moveUp
 * @property {() => void} moveDown
 * @property {() => void} moveLeft
 * @property {() => void} moveRight
 * @property {() => void} moveUpRight
 * @property {() => void} moveDownRight
 * @property {() => void} moveUpLeft
 * @property {() => void} moveDownLeft
 * @property {(dy: number, dx: number) => void} moveDirection
 * @property {(newFlip?: number) => void} flip
 * @property {(top: string | number, left: string | number) => void} move
 * @property {(forcedSceneId?: string) => void} sync
 * @property {(animationDuration?: number) => void} place_sync_persist
 * @property {(dontscroll?: boolean) => void} highlight
 * @property {(text: string) => void} notify
 * @property {(token: JQuery) => void} update_dead_cross
 * @property {(token: JQuery) => void} update_health_aura
 * @property {() => void} update_condition_timers
 * @property {() => void} update_age
 * @property {() => number} get_token_scale
 * @property {() => void} update_from_page
 * @property {(event?: Event) => void} update_and_sync
 * @property {() => void} update_combat_tracker
 * @property {() => void} update_quick_roll
 * @property {() => JQuery} build_hp
 * @property {() => JQuery} build_ac
 * @property {() => JQuery} build_elev
 * @property {() => JQuery|string} build_age
 * @property {(token: JQuery) => void} toggle_stats
 * @property {(token: JQuery) => void} build_stats
 * @property {(parent?: JQuery, singleRow?: boolean) => JQuery[]|undefined} build_conditions
 * @property {(tokenX: number, tokenY: number, placedToken: HTMLElement, ctxImageData: ImageData) => boolean} setTokenDragPos
 * @property {() => void} assignLightVisionOptions
 * @property {(options: TokenOptions, forcedSceneId?: string) => void} debounceSyncMessage
 * @property {() => void} deboucePlaceSync
 * @property {(animationDuration?: number, sceneId?: string, callback?: () => void) => boolean | void} throttlePlace
 * @property {(animationDuration?: number, sceneId?: string, callback?: () => void) => void} place
 * @property {() => void} prepareWalkableArea
 * @property {(key: string, numberRemaining: number) => void} track_ability
 * @property {(key: string, defaultValue?: number) => number | undefined} get_tracked_ability
 */

export {};
