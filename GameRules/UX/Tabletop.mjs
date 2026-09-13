
/**
 * @typedef {'system' | 'dark' | 'light'} ThemeOptions
 * 
 * @callback DialogReleaseCallback
 * @param {JQuery<HTMLElement> | undefined} [anchor] - The former anchor that is beind released by the dialog.
 * @param {JQuery<HTMLElement> | undefined} [content] - The former content that is being released by the dialog.
 */

const EnvironmentLocalStore = 'AVTT-UX-Settings';
const ThemeEvent = 'avtt.ux.theme';

export class TabletopEnvironment {
    /** @type {ThemeOptions} */
    #theme;
    #themeObserver;

    constructor() {
        let stored = localStorage.getItem(EnvironmentLocalStore) ?? {}
        if (typeof stored === 'string') {
            try {
                stored = JSON.parse(stored);
            } catch (error) {
                stored = { };
                console.error('Failed to read tabletop environment settings; resetting it to defaults', error);
            }
        }

        this.#theme = stored.theme ?? 'system';
        this.#themeObserver = window.matchMedia('(prefers-color-scheme: light)');
        this.#themeObserver.addEventListener('change', this.#changeSystemTheme.bind(this));

        Object.freeze(this);
    }

    /** Commits the environment settings to local storage. */
    #commit() {
        const config = {
            theme: this.#theme
        };

        const json = JSON.stringify(config);
        localStorage.setItem(EnvironmentLocalStore, json);
    }

    /**
     * Updates the theme for the tabletop
     * @param {ThemeOptions} theme */
    changeTheme(theme) {
        this.#theme = theme ?? 'system';
        this.#commit();

        const notify = this.#createThemeEvent();
        window.dispatchEvent(notify)
    }

    /**
     * Registers a callback to monitor for changes to the tabletop theme.
     * @param {(event: CustomEvent<{theme: string}>) => void} callback 
     * @returns {() => void} Callback used to remove the event listener. */
    monitorTheme(callback) {
        const notify = this.#createThemeEvent();
        callback(notify);

        window.addEventListener(ThemeEvent, callback);

        return () => {
            window.removeEventListener(ThemeEvent, callback);
        };
    }

    /** Handles an update to the user's preferred system theme. */
    #changeSystemTheme() {
        if (this.#theme !== 'system') {
            return;
        }

        const notify = this.#createThemeEvent();
        window.dispatchEvent(notify)
    }

    /** Generates a custom event to send to the theme change event. */
    #createThemeEvent() {
        let showing = this.#theme;
        if (showing === 'system') {
            showing = (this.#themeObserver?.matches ?? false) ? 'light' : 'dark'
        }

        return new CustomEvent(ThemeEvent, {
            detail: {
                theme: showing
            }
        });
    }
}

/** Setup singletone for the tabletop environment. */
export const Tabletop = new TabletopEnvironment();

/** Provides a common dialog that can anchor to other elements within the tabletop. */
export class TabletopDialog {
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
        this.#onRelease = undefined;

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

        if (this.#archor === anchor) {
            this.#archor = undefined;
            this.#content = undefined;
            this.#onRelease = undefined;
            this.#dialog.toggleClass('open', false);
            return;
        }

        if (content != null) {
            this.#dialog.append(content);
        }

        this.#archor = anchor;
        this.#content = content;
        this.#onRelease = onRelease;

        const bounds = anchor.get(0).getBoundingClientRect();
        this.#dialog.css({
            "left": `${bounds.left + (bounds.width / 2)}px`,
            "bottom": `${document.documentElement.clientHeight - bounds.top + 5}px`
        });

        this.#dialog.toggleClass('open', true);
    }
}
