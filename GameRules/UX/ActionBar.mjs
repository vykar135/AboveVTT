import { DiceActionsEnabled } from '../CoreEnums.mjs'

/**
 * @typedef {'system' | 'dark' | 'light'} ThemeOptions
 * 
 * @callback DialogReleaseCallback
 * @param {JQuery<HTMLElement> | undefined} [anchor] - The former anchor that is beind released by the dialog.
 * @param {JQuery<HTMLElement> | undefined} [content] - The former content that is being released by the dialog.
 */

/**
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
    #dialog;
    #videoOpen;

    #hp;
    #abilities;
    #saves;
    #skills;

    constructor() {
        if (!DiceActionsEnabled) {
            Object.freeze(this);
            return;
        }

        this.#container = $('<div class="avtt-hotbar-container" />');
        this.#theme = MonitorSystemTheme(this.#container);

        this.#bar = $('<div class="avtt-hotbar" />').appendTo(this.#container);
        this.#dialog = new ActionBarDialog(this.#container);
        this.#videoOpen = false;

        this.#hp = $('<div class="avtt-hotbar-button"><span>Hit Points</span></div>').appendTo(this.#bar);
        this.#abilities = $('<div class="avtt-hotbar-button"><span>Abilities</span></div>').appendTo(this.#bar);
        this.#saves = $('<div class="avtt-hotbar-button"><span>Saves</span></div>').appendTo(this.#bar);
        this.#skills = $('<div class="avtt-hotbar-button"><span>Skills</span></div>').appendTo(this.#bar);

        let count = 0;
        for (const entry of [ this.#hp, this.#abilities, this.#saves, this.#skills ]) {
            const content = $(`<div>I\'m menu #${count}</div>`);
            entry.on('click', () => this.#dialog.attach(entry, content))
            count++;
        }

        $(document.body).append(this.#container);

        Object.freeze(this);
    }

    /**
     * Manually sets the theme for all action bar controls.
     * @param {'system' | 'dark' | 'light' | undefined} theme */
    setTheme(theme) {
        this.#theme(theme ?? 'system');
    }

    /** Notifies the action bar that the peer-to-peer video panel is open. */
    setVideoOpen(open) {
        this.#dialog.close();

        if (!open) {
            this.#container.css({ "bottom": '' });
            return; 
        }

        const videoContainer = $('.video-meet-area');
        if (videoContainer.length == 0) {
            this.#container.css({ "bottom": '' });
            return; 
        }

        const bounds = videoContainer.get(0).getBoundingClientRect();
        this.#container.css({
            "bottom": `${document.documentElement.clientHeight - bounds.top}px`
        });
    }
}

export class ActionBarDialog {
    #dialog;

    /** @type {JQuery<HTMLElement> | undefined} */
    #archor;
    /** @type {JQuery<HTMLElement> | undefined} */
    #content;
    /** @type {DialogReleaseCallback | undefined} */
    #onRelease;

    /** @param {JQuery<HTMLElement>} container - The container to place the dialog within.  */
    constructor(parent) {
        this.#dialog = $('<div class="avtt-hotbar-menu" />').appendTo(parent);
        this.#archor = undefined;
        this.#content = undefined;

        $(window).on('keydown', this.#keyboardClose.bind(this));

        Object.freeze(this);
    }

    /** @param {JQuery.KeyDownEvent} event  */
    #keyboardClose(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    /** Closes the dialog. */
    close() {
        if (typeof this.#onRelease === 'function') {
            try {
                this.#onRelease(this.#archor, this.#content);
            } catch (error) {
                console.error('Failed to release content from an action bar dialog', error);
            }
        }

        try {
            this.#content?.detach();
        } catch (error) {
            console.error('Failed to detach content from an action bar dialog', error);
        }

        this.#dialog.empty();

        this.#archor = undefined;
        this.#content = undefined;
        this.#onRelease = undefined;
        this.#dialog.toggleClass('open', false);
    }

    /**
     * Moves the dialog to the specified anchor and opens it if it isn't already; otherwise closes the dialog.
     * @param {JQuery<HTMLElement>} anchor - The HTML element to anchor the dialog to.
     * @param {JQuery<HTMLElement>} content - The HTML element to display within the dialog.
     * @param {DialogReleaseCallback | undefined} onRelease
     */
    attach(anchor, content, onRelease) {
        if (typeof this.#onRelease === 'function') {
            try {
                this.#onRelease(this.#archor, this.#content);
            } catch (error) {
                console.error('Failed to release content from an action bar dialog', error);
            }
        }

        try {
            this.#content?.detach();
        } catch (error) {
            console.error('Failed to detach content from an action bar dialog', error);
        }

        this.#dialog.empty();
        if (content != null) {
            this.#dialog.append(content);
        }

        if (this.#archor === anchor) {
            this.#archor = undefined;
            this.#content = undefined;
            this.#onRelease = undefined;
            this.#dialog.toggleClass('open', false);
            return;
        }

        this.#archor = anchor;
        this.#content = content;
        this.#onRelease = onRelease;

        const bounds = anchor.get(0).getBoundingClientRect();
        this.#dialog.css({
            "left": `${bounds.left + (bounds.width / 2)}px`,
            "bottom": `${document.documentElement.clientHeight - bounds.top + 10}px`
        });

        this.#dialog.toggleClass('open', true);
    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    actionBar: ActionBar
});