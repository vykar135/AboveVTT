
/**
 * @typedef {'system' | 'dark' | 'light'} ThemeOptions
 * 
 * @callback DialogCloseCallback
 * @param {JQuery<HTMLElement> | undefined} [anchor] - The former anchor that is beind released by the dialog.
 * @param {JQuery<HTMLElement> | undefined} [content] - The former content that is being released by the dialog.
 * @returns {void}
 * 
 * @typedef DialogOptions
 * @property {string[]} classNames - The collection of class names to enable on the dialog.
 * @property {'top' | 'bottom' | 'left' | 'right'} [edge] - The edge to originate the dialog from.
 * @property {'start' | 'center' | 'end'} [alignment] - Where along the anchor element's edge the dialog will start.
 * @property {'topleft' | 'bottomleft' | 'topright' | 'bottomright'} [screenOrigin] - How the dialog will position itself relative to the viewport.
 * @property {number} [offset] - The number of pixels to offset the dialog from the bound edge.
 * @property {DialogCloseCallback} [onClose] - The callback to make when the dialog is closed.
 * 
 * @typedef ActionBarOptions
 * @property {boolean} names - Whether names are shown in the action bar.
 * 
 * @typedef EnvironmentChangeEvent
 * @property {ThemeOptions} theme
 * @property {ActionBarOptions} actionBar
 */

const EnvironmentLocalStore = 'AVTT-UX-Settings';
const EnvironmentChangeEvent = 'avtt.ux.change';

export class TabletopEnvironment {
    /** @type {ThemeOptions} */
    #theme;
    #themeObserver;

    /** @type {ActionBarOptions} */
    #actionBar;

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
        this.#actionBar = stored.actionBar ?? {
            names: true
        };

        this.#themeObserver = window.matchMedia('(prefers-color-scheme: light)');
        this.#themeObserver.addEventListener('change', this.#changeSystemTheme.bind(this));

        Object.freeze(this);
    }

    /** Commits the environment settings to local storage. */
    #commit() {
        const config = {
            theme: this.#theme,
            actionBar: this.#actionBar
        };

        const json = JSON.stringify(config);
        localStorage.setItem(EnvironmentLocalStore, json);

        this.#dispatchEvents();
    }

    /** Creates and sends an event notifying components of a change to the environment settings. */
    #dispatchEvents() {
        const notify = this.#createEnvironmentChangeEvent();
        window.dispatchEvent(notify);
    }

    /** Handles an update to the user's preferred system theme. */
    #changeSystemTheme() {
        if (this.#theme !== 'system') {
            return;
        }

        this.#dispatchEvents();
    }

    /**
     * Updates the theme for the tabletop
     * @param {ThemeOptions} theme */
    changeTheme(theme) {
        this.#theme = theme ?? 'system';
        this.#commit();
    }

    /**
     * Updates the options for the action bar.
     * @param {ActionBarOptions} options 
     */
    changeActionBar(options) {
        if (options == null) {
            return;
        }

        const current = this.#actionBar;
        this.#actionBar = {
            names: options.names ?? current.names ?? true
        }

        this.#commit();
    }

    /**
     * Registers a callback to monitor for changes to the tabletop theme.
     * @param {(event: Event) => void} callback 
     * @returns {() => void} Callback used to remove the event listener. */
    monitor(callback) {
        const notify = this.#createEnvironmentChangeEvent();
        callback(notify);

        window.addEventListener(EnvironmentChangeEvent, callback);

        return () => {
            window.removeEventListener(EnvironmentChangeEvent, callback);
        };
    }

    /** Generates a custom event to send to the theme change event. */
    #createEnvironmentChangeEvent() {
        let showing = this.#theme;
        if (showing === 'system') {
            showing = (this.#themeObserver?.matches ?? false) ? 'light' : 'dark'
        }

        return new CustomEvent(EnvironmentChangeEvent, {
            detail: {
                theme: showing,
                actionBar: structuredClone(this.#actionBar)
            },
            bubbles: false,
            cancelable: false
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
    /** @type {DialogCloseCallback | undefined} */
    #onClose;
    /** @type {string[]} */
    #classNames;
    /** @type {'top' | 'bottom' | 'left' | 'right'} */
    #edge;
    /** @type {'start' | 'center' | 'end'} */
    #alignment;
    /** @type {'topleft' | 'bottomleft' | 'topright' | 'bottomright'} */
    #screenOrigin
    /** @type {number} */
    #offset;

    /** @param {JQuery<HTMLElement>} container - The container to place the dialog within.  */
    constructor(parent) {
        this.#dialog = $('<div class="avtt-dialog" />').appendTo(parent);
        this.#archor = undefined;
        this.#content = undefined;
        this.#onClose = undefined;
        this.#classNames = [];

        const eventing = $(window);
        eventing.on('keydown', this.#keyboardClose.bind(this));
        eventing.on('resize', this.#position.bind(this));

        

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
        if (typeof this.#onClose === 'function') {
            try {
                this.#onClose(this.#archor, this.#content);
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

        this.#closeDialog();
    }

    /** Finalizes a request to close the dialog. */
    #closeDialog() {
        for (const name of this.#classNames) {
            this.#dialog.toggleClass(name, false);
        }

        this.#archor = undefined;
        this.#content = undefined;
        this.#onClose = undefined;
        this.#classNames = [];
        this.#dialog.toggleClass('open', false);
    }

    /**
     * Moves the dialog to the specified anchor and opens it if it isn't already; otherwise closes the dialog.
     * @param {JQuery<HTMLElement>} anchor - The HTML element to anchor the dialog to.
     * @param {JQuery<HTMLElement>} content - The HTML element to display within the dialog.
     * @param {DialogOptions} [options] - Additional options used to render or managed the dialog.
     */
    attach(anchor, content, options) {
        if (typeof this.#onClose === 'function') {
            try {
                this.#onClose(this.#archor, this.#content);
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
            this.#closeDialog();
            return;
        }

        if ((content?.length ?? 0) > 0) {
            this.#dialog.append(content);
        }

        this.#archor = anchor;
        this.#content = content;
        this.#onClose = options?.onClose;
        this.#classNames = options?.classNames ?? ['standard', 'centerX'];
        this.#edge = options?.edge ?? 'top';
        this.#alignment = options?.alignment ?? 'center';
        this.#screenOrigin = options?.screenOrigin ?? 'bottomleft';
        this.#offset = options?.offset ?? -5;

        this.#position();

        for (const name of this.#classNames) {
            this.#dialog.toggleClass(name, true);
        }

        this.#dialog.toggleClass('open', true);
    }

    /** Repositions the dialog to the appropriate location. */
    reposition() {
        this.#position();
    }

    /** Repositions the dialog based on the options provided. */
    #position() {
        if (this.#archor == null) {
            return;
        }

        const bounds = this.#archor.get(0).getBoundingClientRect();
        const isEdgeHorizontal = (this.#edge === 'top' || this.#edge === 'bottom');

        let edgeStart = bounds.top;
        let edgeEnd = bounds.bottom;
        if (isEdgeHorizontal) {
            edgeStart = bounds.left;
            edgeEnd = bounds.right;
        }

        const edgeSize = (isEdgeHorizontal) ? bounds.width : bounds.height;
        let edgePosition = edgeSize;
        if (this.#alignment === 'center') {
            edgePosition = (edgeSize / 2);
        } else if (this.#alignment === 'end') {
            edgePosition = edgeSize;
        }

        let x = bounds.left + edgePosition;
        let y = bounds.top + this.#offset;
        if (this.#edge === 'bottom') {
            y = bounds.bottom + this.#offset;
        } else if (this.#edge === 'left') {
            x = bounds.left + this.#offset;
            y = bounds.top + edgePosition;
        } else if (this.#edge === 'right') {
            x = bounds.right + this.#offset;
            y = bounds.top + edgePosition;
        }

        const css = {
            left: '',
            right: '',
            top: '',
            bottom: '',
            width: '',
            height: ''
        };

        if (this.#screenOrigin === 'topleft') {
            css.left = `${x}px`;
            css.top = `${y}px`;
            
        } else if (this.#screenOrigin === 'topright') {
            css.right = `${document.documentElement.clientWidth - x}px`;
            css.top = `${y}px`;

        } else if (this.#screenOrigin === 'bottomleft') {
            css.left = `${x}px`;
            css.bottom = `${document.documentElement.clientHeight - y}px`;
        } else if (this.#screenOrigin === 'bottomright') {
            css.right = `${document.documentElement.clientWidth - x}px`;
            css.bottom = `${document.documentElement.clientHeight - y}px`;
        }

        this.#dialog.css(css);
    }
}
