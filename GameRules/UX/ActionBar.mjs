import { DiceActionsEnabled } from '../CoreEnums.mjs'

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
        this.#theme = this.#monitorSystemTheme();

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

    /**
     * Reviews what theme the user currently wants and adds an event listener for any changes.
     * @returns {(option: 'system' | 'dark' | 'light') => void} */
    #monitorSystemTheme() {
        const useLightMode = window.matchMedia('(prefers-color-scheme: light)');

        /** @type {'system' | 'dark' | 'light'} */
        let manualTheme = localStorage.getItem('AVTT-Theme') ?? 'system';

        const setupTheme = (event) => {
            let requested = manualTheme;
            if (requested === 'system') {
                requested = (event?.matches ?? false) ? 'light' : 'dark'
            }

            this.#container.toggleClass('use-light-mode', (requested === 'light'));
        };

        setupTheme(useLightMode);
        useLightMode.addEventListener('change', setupTheme);

        return (theme) => {
            manualTheme = theme ?? 'system';
            localStorage.setItem('AVTT-Theme', theme);
            setupTheme(undefined);
        };
    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    actionBar: ActionBar
});