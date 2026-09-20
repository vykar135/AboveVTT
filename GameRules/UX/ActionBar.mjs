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
    #settings;

    constructor() {
        this.#container = $('<div class="avtt-hotbar-container" />');

        this.#bar = $('<div class="avtt-hotbar" />').appendTo(this.#container);
        this.#dialog = new TabletopDialog(this.#container);
        this.#showingNames = false;
        this.#actor = undefined;

        const actorSelect = this.#setupActorSelection();

        this.#actorSelect = this.#createMenuButton('Play As', 'play-as', actorSelect, { modal: true });
        this.#actorSelect.button.appendTo(this.#bar);

        this.#portrait = this.#createActorPortrait(actorSelect);
        this.#hp = this.#createMenuButton('Health', 'hp', this.#createPlaceholder());
        this.#abilities = this.#createMenuButton('Abilities', 'abilities', this.#createPlaceholder());
        this.#saves = this.#createMenuButton('Saves', 'saves', this.#createPlaceholder());
        this.#skills = this.#createMenuButton('Skills', 'skills', this.#createPlaceholder());
        this.#actions = this.#createMenuButton('Actions', 'actions', this.#createPlaceholder());
        this.#statusEffects = this.#createMenuButton('Effects', 'status-effects', this.#createPlaceholder());
        this.#settings = this.#createMenuButton('Settings', 'settings', this.#setupSettingsMenu(), { modal: true });

        Tabletop.monitor(this.#changeEnvironment.bind(this));
        $(document.body).append(this.#container);

        StatBlockCache.onActorChanged(this.#changeActor.bind(this));

        Object.freeze(this);
    }

    /**
     * Handles a change to the tabletop's theme
     * @param {CustomEvent<EnvironmentChangeEvent>} event */
    #changeEnvironment(event) {
        const theme = event.theme ?? 'dark';
        this.#container.toggleClass('use-light-mode', (theme === 'light'));

        this.#showingNames = ((event.actionBar?.names ?? false) === true);
        this.#bar.toggleClass('names', this.#showingNames);

        this.#dialog.reposition();
    }

    /**
     * Handles a change to the current actor for the tabletop.
     * @param {StatBlock | undefined} actor */
    #changeActor(actor) {
        if ((this.#actor != null) !== (actor != null)) {
            this.#dialog.close();
        }

        this.#actor = actor;
        if (this.#actor == null) {
            this.#displayNoActor();
            return;
        }

        let name = (this.#actor.name ?? '').trim();
        if (name === '') {
            name = 'Unknown';
        }

        const css = {
            "background-image": `url(${this.#actor.image ?? 'https://www.dndbeyond.com/avatars/4675/675/636747837794884984.jpeg'})`,
            "border-color": (this.#actor.color ?? '')
        };

        this.#portrait.button.css(css);
        this.#portrait.button.attr('data-title', name);

        this.#actorSelect.button.detach();

        this.#portrait.button.appendTo(this.#bar);
        this.#hp.button.appendTo(this.#bar);
        this.#abilities.button.appendTo(this.#bar);
        this.#saves.button.appendTo(this.#bar);
        this.#skills.button.appendTo(this.#bar);
        this.#actions.button.appendTo(this.#bar);
        this.#statusEffects.button.appendTo(this.#bar);
        this.#settings.button.appendTo(this.#bar);
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
        this.#settings.button.appendTo(this.#bar);
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
        const button = $('<div class="avtt-hotbar-button" />');
        const icon = $(`<span class="icon" />`);
        const title = $(`<span class="title" />`);
        const callback = this.#showDialog.bind(this);

        let showing = false;
        options ??= { };
        options.classNames ??= [ 'standard', 'centerX' ];
        options.onClose ??= () => { };

        let onClose = options.onClose;
        if (typeof onClose !== 'function') {
            onClose = () => {
                console.log('standard callback');
            };
        }

        const copiedOptions = { ...options };
        copiedOptions.onClose = (anchor, content) => {
            showing = false;
            button.toggleClass('open', false);
            onClose(anchor, content);
        };

        title.text(name);
        button.addClass(style);
        button.attr('data-title', name);

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
            button.toggleClass('open', true);
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
        const button = $('<div class="avtt-hotbar-portrait" />');
        const callback = this.#showDialog.bind(this);

        let showing = false;

        /** @type {DialogOptions} */
        const options = {
            classNames: [ 'standard' ],
            onClose: () => {
                showing = false;
                button.toggleClass('open', false);
            },
            alignment: 'start',
            modal: true
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
            button.toggleClass('open', true);
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
        const selectable = $('<div class="avtt-available-actors" />');

        const rebuild = (/** @type {StatBlock} */ actor) => {
            const available = StatBlockCache.listMine();

            for (let validate = 0; validate < options.length; validate++) {
                const option = options[validate];

                // Tear down any extra options that once existed for deleted tokens.
                // We just detach here because tokens like to come back.
                if (validate >= available.length) {
                    option.container.detach();
                    option.showing = false;
                    continue;
                }

                // Option is already showing; nothing to do.
                if (option.showing) {
                    continue;
                }

                // Restore options that were detached due to a previous token deletion or scene change.
                selectable.append(option.container);
                option.showing = true;
            }

            // Setup new options for newly created tokens that exceed the bounds of the options collection.
            for (let push = options.length; push < available.length; push++) {
                const setup = {
                    showing: true,
                    actor: undefined,
                    container: $('<div class="available-actor" />'),
                    portrait: $('<div class="actor-portrait" />'),
                    name: $('<div class="actor-name" />')
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
                settings.container.attr('data-title', name);

                const css = {
                    "background-image": `url(${actor.image ?? 'https://www.dndbeyond.com/avatars/4675/675/636747837794884984.jpeg'})`,
                    "border-color": (actor.color ?? '')
                };

                settings.portrait.css(css);
            }
        };

        return () => {
            rebuild();
            return selectable;
        }
    }

    #setupSettingsMenu() {
        const container = $('<div class="avtt-hotbar-settings" />');

        const namesOption = $('<div class="avtt-hotbar-setting"><span class="title">Show Hotbar Names</span></div>');
        const namesToggle = $('<button type="button" role="switch" class="avtt-hotbar-toggle" />').appendTo(namesOption);

        const themeOption = $('<div class="avtt-hotbar-setting"><span class="title">Action Bar Theme</span></div>');
        const systemTheme = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="system" />').appendTo(themeOption);
        const darkMode = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="dark" />').appendTo(themeOption);
        const lightMode = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="light" />').appendTo(themeOption);

        container.append(themeOption).append(namesOption);

        const rebuild = () => {
            namesToggle.toggleClass('checked', Tabletop.actionBar.names);
            systemTheme.toggleClass('checked', Tabletop.theme === 'system');
            darkMode.toggleClass('checked', Tabletop.theme ===  'dark');
            lightMode.toggleClass('checked', Tabletop.theme === 'light');
        };

        namesToggle.on('click', () => {
            const updateTo = { ...Tabletop.actionBar };
            updateTo.names = !updateTo.names;

            Tabletop.changeActionBar(updateTo);
            namesToggle.toggleClass('checked', updateTo.names);
        });

        const updateTheme = (event) => {
            const updateTo = $(event.target).attr('data-theme') ?? 'system';
            Tabletop.changeTheme(updateTo);
            
            systemTheme.toggleClass('checked', updateTo === 'system');
            darkMode.toggleClass('checked', updateTo ===  'dark');
            lightMode.toggleClass('checked', updateTo === 'light');
        };

        systemTheme.on('click', updateTheme);
        darkMode.on('click', updateTheme);
        lightMode.on('click', updateTheme);

        return () => {
            rebuild();
            return container;
        }
    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    environment: Tabletop,
    actionBar: ActionBar
});