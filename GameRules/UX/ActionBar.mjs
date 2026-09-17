/** @import { DialogOptions, EnvironmentChangeEvent } from './Tabletop.mjs*/

import { Tabletop, TabletopDialog } from './Tabletop.mjs';
import StatBlock from '../StatBlock.mjs'
import { StatBlockCache } from '../StatBlockCache.mjs';

/**
 * @typedef {Object} ActionBarButton
 * @property {string} name - The name of the menu button.
 * @property {JQuery<HTMLElement>} button - The main container for the button.
 * @property {JQuery<HTMLElement>} icon - The HTML element that represents the icon being shown.
 * @property {JQuery<HTMLElement>} title - The HTML element that represents the title being shown.
 * @property {ActionMenuRender} render - Handles a request to rebuild the menu content for the provided actor and return it for binding.
 * @property {() => boolean} isShowing - Whether the button is currently showing the menu associated with it.
 * @property {DialogOptions} dialogOptions - The options used to control the dialog.
 * 
 * @callback ActionMenuRender
 * @param {StatBlock} actor - The actor to render the menu for.
 * @param {ActionBarButton} button - The button that the menu is attached to.
 * @returns {JQuery<HTMLElement>}
 */

/** Management of the main action bar for the active character or token being played by the user. */
class ActionBarControl {
    #container;
    #bar;
    #dialog;
    #showingNames;

    /** @type {StatBlock | undefined} */
    #actor;

    #actorSelect;
    #portrait;
    #hp;
    #abilities;
    #saves;
    #skills;
    #actions;
    #statusEffects;

    constructor() {
        this.#container = $('<div class="avtt-hotbar-container" />');

        this.#bar = $('<div class="avtt-hotbar" />').appendTo(this.#container);
        this.#dialog = new TabletopDialog(this.#container);
        this.#showingNames = false;
        this.#actor = undefined;

        const actorSelect = this.#setupActorSelection();

        this.#actorSelect = this.#createMenuButton('Play As', 'play-as', actorSelect);
        this.#actorSelect.button.appendTo(this.#bar);

        this.#portrait = this.#createActorPortrait(actorSelect);
        this.#hp = this.#createMenuButton('Health', 'hp', this.#createPlaceholder());
        this.#abilities = this.#createMenuButton('Abilities', 'abilities', this.#createPlaceholder());
        this.#saves = this.#createMenuButton('Saves', 'saves', this.#createPlaceholder());
        this.#skills = this.#createMenuButton('Skills', 'skills', this.#createPlaceholder());
        this.#actions = this.#createMenuButton('Actions', 'actions', this.#createPlaceholder());
        this.#statusEffects = this.#createMenuButton('Effects', 'status-effects', this.#createPlaceholder());

        Tabletop.monitor(this.#changeEnvironment.bind(this));
        $(document.body).append(this.#container);

        StatBlockCache.monitorActor(this.#changeActor.bind(this));

        Object.freeze(this);
    }

    /**
     * Handles a change to the tabletop's theme
     * @param {CustomEvent<EnvironmentChangeEvent>} event */
    #changeEnvironment(event) {
        const theme = event.detail.theme ?? 'dark';
        this.#container.toggleClass('use-light-mode', (theme === 'light'));

        this.#showingNames = ((event.detail.actionBar?.names ?? false) === true);
        this.#bar.toggleClass('names', this.#showingNames);

        this.#dialog.reposition();
    }

    /**
     * Handles a change to the current actor for the tabletop.
     * @param {CustomEvent<{ actor: StatBlock | undefined }>} event */
    #changeActor(event) {
        if ((this.#actor != null) !== (event.detail.actor != null)) {
            this.#dialog.close();
        }

        this.#actor = event.detail.actor;
        if (this.#actor == null) {
            this.#displayNoActor();
            return;
        }

        const css = {
            "background-image": `url(${this.#actor.image ?? 'https://www.dndbeyond.com/avatars/4675/675/636747837794884984.jpeg'})`,
            "border-color": (this.#actor.color ?? '')
        };

        this.#portrait.button.css(css);

        this.#actorSelect.button.detach();

        this.#portrait.button.appendTo(this.#bar);
        this.#hp.button.appendTo(this.#bar);
        this.#abilities.button.appendTo(this.#bar);
        this.#saves.button.appendTo(this.#bar);
        this.#skills.button.appendTo(this.#bar);
        this.#actions.button.appendTo(this.#bar);
        this.#statusEffects.button.appendTo(this.#bar);
    }

    /** Removes all buttons from the bar then appends the "Select Actor" button */
    #displayNoActor() {
        this.#portrait.button.detach();
        this.#hp.button.detach();
        this.#abilities.button.detach();
        this.#saves.button.detach();
        this.#skills.button.detach();
        this.#actions.button.detach();
        this.#statusEffects.button.detach();

        this.#actorSelect.button.appendTo(this.#bar);
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

    /**
     * Requests that a menu be shown.
     * @param {ActionBarButton} options - The details of the menu to show. */
    #showDialog(options) {
        const menu = options.render(this.#actor, options.button);
        this.#dialog.attach(options.button, menu, options.dialogOptions);
    }

    /**
     * Initializes a button that may be included in the menu.
     * @param {string} name - The name of the menu button.
     * @param {string} style - The name of the CSS class that the button will be displayed as.
     * @param {ActionMenuRender} render - A request to rebuild the menu content for the provided actor and return it for binding.
     * @param {DialogOptions} [options] - the options to control the dialog.
     * @returns {ActionBarButton}
     */
    #createMenuButton(name, style, render, options) {
        const button = $('<div class="avtt-hotbar-button"></div>');
        const icon = $(`<span class="icon" />`);
        const title = $(`<span class="title" />`);
        const callback = this.#showDialog.bind(this);

        let showing = false;
        options ??= {
            classNames: [ 'standard', 'centerX' ],
            onClose: () => { }
        }

        let onClose = options.onClose;
        if (typeof onClose !== 'function') {
            onClose = () => { };
        }

        const copiedOptions = { ...options };
        copiedOptions.onClose = (anchor, content) => {
            showing = false;
            onClose(anchor, content);
        };

        title.text(name);
        button.addClass(style);

        button.append(icon).append(title);

        /** @type {ActionBarButton} */
        const settings = Object.freeze({
            name,
            button,
            icon,
            title,
            render,
            isShowing: () => showing,
            dialogOptions: copiedOptions
        });

        button.on('click', () => {
            callback(settings);
            showing = true;
        });

        button.on('contextmenu', (e) => {
            e.preventDefault();
            callback(settings);
            showing = true;
        });

        return settings;
    }

    /**
     * Initializes the actor portait section of the actor bar..
     * @returns {ActionBarButton}
     */
    #createActorPortrait(render) {
        const button = $('<div class="avtt-hotbar-portrait"></div>');
        const callback = this.#showDialog.bind(this);

        let showing = false;

        /** @type {DialogOptions} */
        const options = {
            classNames: [ 'standard' ],
            onClose: () => { showing = false; },
            alignment: 'start'
        };

        /** @type {ActionBarButton} */
        const settings = Object.freeze({
            name: undefined,
            button,
            icon: undefined,
            title: undefined,
            render,
            isShowing: () => showing,
            dialogOptions: options
        });

        button.on('click', () => {
            callback(settings);
            showing = true;
        });

        button.on('contextmenu', (e) => {
            e.preventDefault();
            callback(settings);
            showing = true;
        });

        return settings;
    }

    /**
     * Creates a placeholder button for now.
     * @returns {ActionMenuRender}
     */
    #createPlaceholder() {
        const menu = $('<div>Action Bar </div>')

        return (actor, button) => {
            return menu;
        }
    }

    /**
     * Creates a placeholder button for now.
     * @returns {ActionMenuRender}
     */
    #setupActorSelection() {
        /** @type {{ container: JQuery<HTMLElement>, portrait: JQuery<HTMLElement>, name: JQuery<HTMLElement> }[]} */
        const options = [];
        const selectable = $('<div class="avtt-available-actors"></div>');

        const rebuild = (/** @type {StatBlock} */ actor) => {
            const available = StatBlockCache.listMine();

            for (let validate = options.length - 1; validate >= 0; validate--) {
                const option = options[validate];

                // Tear down any extra options that once existed for deleted tokens.
                // We just detach here because tokens like to come back.
                if (validate >= available.length) {
                    option.container.detach();
                    option.showing = false;
                    continue;
                }

                // We have hit the point we are showing items so exit.
                if (option.showing) {
                    break;
                }

                // Restore options that were detached due to a previous token deletion.
                selectable.append(option);
                option.showing = true;
            }

            // Setup new options for newly created tokens that exceed the bounds of the options collection.
            for (let push = options.length; push < available.length; push++) {
                const setup = {
                    showing: true,
                    actor: undefined,
                    container: $('<div class="available-actor"></div>'),
                    portrait: $('<div class="actor-portrait"></div>'),
                    name: $('<div class="actor-name"></div>')
                };

                setup.container.on('click', () => {
                    StatBlockCache.changeActor(setup.actor);
                    this.#dialog.close();
                })

                setup.container.append(setup.portrait).append(setup.name);

                options.push(setup);
                selectable.append(setup.container);
            }

            // Walk through the list of available option and reassign them to an actor.
            for (let position = 0; position < available.length; position++) {
                const actor = available[position];
                const settings = options[position];

                let name = (actor.name ?? '').trim();
                if (name === '') {
                    name = 'Unknown';
                }

                actor.refreshVisuals();
                settings.actor = actor;
                settings.name.text(name);

                const css = {
                    "background-image": `url(${actor.image ?? 'https://www.dndbeyond.com/avatars/4675/675/636747837794884984.jpeg'})`,
                    "border-color": (actor.color ?? '')
                };

                settings.portrait.css(css);
            }
        };

        return (actor, button) => {
            rebuild();
            return selectable;
        }
    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    environment: Tabletop,
    actionBar: ActionBar
});