import { DiceActionsEnabled } from '../CoreEnums.mjs'

/**
 * @typedef {'system' | 'dark' | 'light'} ThemeOptions
 * 
 * Reviews what theme the user currently wants, adds an event listener for any changes, and a means to override it manually.
 * @param {JQuery<HTMLElement>} container 
 * @returns {(option: ThemeOptions) => void} */
export function MonitorSystemTheme(container) {
    const useLightMode = window.matchMedia('(prefers-color-scheme: light)');

    /** @type {ThemeOptions} */
    let manualTheme = localStorage.getItem('AVTT-Theme') ?? 'system';

    const setupTheme = (event) => {
        let requested = manualTheme;
        if (requested === 'system') {
            requested = (event?.matches ?? false) ? 'light' : 'dark'
        }

        container.toggleClass('use-light-mode', (requested === 'light'));
    };

    setupTheme(useLightMode);
    useLightMode.addEventListener('change', setupTheme);

    return (theme) => {
        manualTheme = theme ?? 'system';
        localStorage.setItem('AVTT-Theme', theme);
        setupTheme(undefined);
    };
}

/** Management of the main action bar for the active character or token being played by the user. */
class ActionBarControl {
    #container;
    #theme;
    #bar;

    constructor() {
        if (!DiceActionsEnabled) {
            Object.freeze(this);
            return;
        }

        this.#container = $('<div class="avtt-hotbar-container" />');
        this.#theme = MonitorSystemTheme(this.#container);

        this.#bar = $('<div class="avtt-hotbar">testing</div>').appendTo(this.#container);

        $(document.body).append(this.#container);
        Object.freeze(this);
    }

    /**
     * Manually sets the theme for all action bar controls.
     * @param {'system' | 'dark' | 'light' | undefined} theme */
    setTheme(theme) {
        this.#theme(theme ?? 'system');
    }    
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    actionBar: ActionBar
});