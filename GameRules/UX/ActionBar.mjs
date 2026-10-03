/** @import { DialogOptions, EnvironmentChangeEvent } from './Tabletop.mjs*/

import { Tabletop, TabletopDialog } from './Tabletop.mjs';
import StatBlock, { BlockAbilityModifier } from '../StatBlock.mjs'
import { StatBlockCache } from '../StatBlockCache.mjs';
import { DiceAction } from '../DiceAction.mjs';
import NumericStatTracker from '../NumericStatTracker.mjs';

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
    #revive;
    #dialog;
    #showingNames;

    /** @type {StatBlock | undefined} */
    #actor;
    /** @type {() => void} */
    #detachActor;

    #actorSelect;
    #portrait;
    #hp;
    #defense;
    #abilities;
    #saves;
    #skills;
    #actions;
    #statusEffects;
    #settings;

    constructor() {
        this.#container = $('<div class="avtt-actionbar-container" />');

        this.#bar = $('<div class="avtt-hotbar" />').appendTo(this.#container);
        this.#revive = $('<div class="avtt-actionbar-revive avtt-hint" data-title="Restore Action Bar"><span class="icon" /></div>');
        this.#revive.appendTo(this.#container);

        this.#revive.on('click', this.#onRevive.bind(this));

        var disabled = (Tabletop.actionBar.enabled === false);
        this.#bar.toggleClass('disabled', disabled);
        this.#revive.toggleClass('enabled', disabled);

        this.#dialog = new TabletopDialog(this.#container);
        this.#showingNames = false;
        this.#actor = undefined;
        this.#detachActor = undefined;

        const actorSelect = this.#setupActorSelection();

        this.#actorSelect = this.#createMenuButton('Play As', 'play-as', actorSelect, { modal: true });
        this.#actorSelect.button.appendTo(this.#bar);

        this.#portrait = this.#createActorPortrait(actorSelect);
        this.#hp = this.#createMenuButton('Health', 'hp', this.#setupHealthMenu(), { modal: true });
        this.#defense = this.#createMenuButton('Defense', 'defense', this.#createPlaceholder(), { modal: true });
        this.#abilities = this.#createMenuButton('Abilities', 'abilities', this.#setupAbilitiesMenu(), { modal: true });
        this.#saves = this.#createMenuButton('Saves', 'saves', this.#setupSavesMenu(), { modal: true });
        this.#skills = this.#createMenuButton('Skills', 'skills', this.#setupSkillsMenu(), { modal: true });
        this.#actions = this.#createMenuButton('Actions', 'actions', this.#createPlaceholder(), { modal: true });
        this.#statusEffects = this.#createMenuButton('Effects', 'status-effects', this.#createPlaceholder(), { modal: true });
        this.#settings = this.#createMenuButton('Settings', 'settings', this.#setupSettingsMenu(), { modal: true });

        Tabletop.monitor(this.#changeEnvironment.bind(this));
        $(document.body).append(this.#container);

        StatBlockCache.onActorChanged(this.#changeActor.bind(this));

        Object.freeze(this);
    }

    /** Restores the action bar if it was hidden. */
    restore() {
        if (Tabletop.actionBar.enabled !== true) {
            Tabletop.changeActionBar({ enabled: true });
        }
    }

    /**
     * Handles a change to the tabletop's theme
     * @param {CustomEvent<EnvironmentChangeEvent>} event */
    #changeEnvironment(event) {
        const theme = event.theme ?? 'dark';
        this.#container.toggleClass('use-light-mode', (theme === 'light'));

        this.#showingNames = ((event.actionBar?.names ?? false) === true);
        this.#bar.toggleClass('names', this.#showingNames);

        var disabled = (Tabletop.actionBar.enabled === false);
        this.#bar.toggleClass('disabled', disabled);
        this.#revive.toggleClass('enabled', disabled);

        this.#dialog.reposition();
    }

    /** Restores the action bar. */
    #onRevive() {
        Tabletop.changeActionBar({ enabled: true });
    }

    /**
     * Callback used when the actor is changed or rebuilt.
     * @param {StatBlock | undefined} actor - The actor that was updated.
    */
    #actorRebuilt(actor) {
        if (this.#actor == null || this.#actor !== actor) {
            return;
        }

        const total = actor.hp.total;
        this.#hp.icon.text(total > 0 ? actor.hp.total : '');
        this.#hp.icon.toggleClass('unconscious', total <= 0);

        this.#defense.icon.text(actor.ac.current);

        this.#hp.render(actor, this.#hp.button);
        this.#abilities.render(actor, this.#abilities.button);
        this.#saves.render(actor, this.#abilities.button);
        this.#skills.render(actor, this.#abilities.button);
    }

    /**
     * Handles a change to the current actor for the tabletop.
     * @param {StatBlock | undefined} actor */
    #changeActor(actor) {
        if ((this.#actor != null) !== (actor != null)) {
            this.#dialog.close();
        }

        if (this.#detachActor != null) {
            this.#detachActor();
            this.#detachActor = undefined;
        }

        this.#actor = actor;
        if (this.#actor == null) {
            this.#displayNoActor();
            return;
        }

        this.#detachActor = this.#actor.onRecalculated(this.#actorRebuilt.bind(this));

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

        this.#actorRebuilt(this.#actor);

        this.#portrait.button.appendTo(this.#bar);
        this.#hp.button.appendTo(this.#bar);
        this.#defense.button.appendTo(this.#bar);
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
        this.#defense.button.detach();
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
        if (menu == null) {
            return;
        }

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
        const button = $('<div class="avtt-actionbar-button" />');
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
            button.toggleClass('open', true);
            callback(settings);
            showing = true;
        });

        button.on('auxclick', (e) => {
            if (e.button !== 1) {
                return;
            }

            const persist = {
                ...settings,
                dialogOptions: {
                    ...settings.dialogOptions,
                    modal: false
                }
            };

            e.preventDefault();
            button.toggleClass('open', true);
            callback(persist);
            showing = true;
        });

        return settings;
    }

    /**
     * Initializes the actor portait section of the actor bar..
     * @returns {ActionBarButton}
     */
    #createActorPortrait(render) {
        const button = $('<div class="avtt-actionbar-portrait" />');
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

        const rebuild = () => {
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

    /**
     * Initializes the menu shown when the settings button in the action bar is clicked.
     * @returns {ActionMenuRender} */
    #setupSettingsMenu() {
        const container = $('<div class="avtt-actionbar-settings" />');
        $('<div class="avtt-menu-title">Tabletop Settings</div>').appendTo(container);

        const namesOption = $('<div class="avtt-actionbar-setting"><span class="title">Show Action Bar Names</span></div>');
        const namesToggle = $('<button type="button" role="switch" class="avtt-actionbar-toggle" />').appendTo(namesOption);

        const themeOption = $('<div class="avtt-actionbar-setting"><span class="title">Action Bar Theme</span></div>');
        const systemTheme = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="system" />').appendTo(themeOption);
        const darkMode = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="dark" />').appendTo(themeOption);
        const lightMode = $('<button type="button" role="radio" class="avtt-theme-icon" data-theme="light" />').appendTo(themeOption);

        const collapse = $('<div class="avtt-actionbar-setting"></div>');
        const collapseButton = $('<span class="collapse">Hide Action Bar</span>').appendTo(collapse);

        container.append(themeOption).append(namesOption).append(collapse);

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

        collapseButton.on('click', () => {
            this.#dialog.close();
            Tabletop.changeActionBar({ enabled: false });
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

    /**
     * Initializes the menu shown when the health button in the action bar is clicked.
     * @returns {ActionMenuRender} */
    #setupHealthMenu() {
        const container = $('<div class="avtt-actionbar-health" />');
        $('<div class="avtt-menu-title">Hit Points</div>').appendTo(container);

        const remaining = $('<input type="text" class="hp-amount" maxlength="5" />');
        const maximum = $('<div class="hp-amount" />');
        const temp = $('<input type="text" class="hp-amount" maxlength="5" />');

        const commitReminaing = () => {
            const target = this.#actor.hp;

            const requested = remaining.val().trim();
            if (requested.length === 0) {
                remaining.val(target.remaining);
                temp.val(target.temp <= 0 ? '--' : target.temp);
                return;
            }

            const amount = parseInt(requested);
            if (amount !== NaN) {
                if (amount < 0) {
                    target.damage(Math.abs(amount));
                } else if (requested.startsWith('+')) {
                    target.heal(amount);
                } else {
                    target.setRemaining(amount);
                }
            }

            remaining.val(target.remaining);
            temp.val(target.temp <= 0 ? '--' : target.temp);
        };

        const commitTemp = () => {
            const target = this.#actor.hp;

            const requested = temp.val().trim();
            if (requested.length === 0) {
                temp.val(target.temp <= 0 ? '--' : target.temp);
                return;
            }

            const amount = parseInt(requested);
            if (amount !== NaN) {
                target.setTemp(amount);
            }

            temp.val(target.temp <= 0 ? '--' : target.temp);
        };

        const keyPressed = (/** @type {JQuery.KeyDownEvent} */ e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.target.value = '';
                e.target.blur();
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
                return;
            }

            if (e.key === ' ' || e.key.length > 1) {
                return;
            }

            if (e.key !== '+' && e.key !== '-' && !(e.key >= '0' && e.key <= '9')) {
                e.preventDefault();
                return;
            }
        }

        remaining.on('blur', commitReminaing);
        remaining.on('keydown', keyPressed);
        remaining.on('focus', () => {
            remaining.trigger('select');
        });

        temp.on('blur', commitTemp);
        temp.on('keydown', keyPressed);
        temp.on('focus', () => {
            if (temp.val() === '--') {
                temp.val(0);
            }

            temp.trigger('select');
        });

        $('<div class="hit-points" />')
            .append($('<div class="hp-type">Current</div>'))
            .append($('<div class="hp-type"></div>'))
            .append($('<div class="hp-type">Max</div>'))
            .append($('<div class="hp-type">Temp</div>'))
            .append(remaining)
            .append($('<div class="hp-divider">/</div>'))
            .append(maximum)
            .append(temp)
            .appendTo(container);

        const rebuild = () => {
            const actor = this.#actor;
            if (actor == null) {
                return undefined;
            }

            remaining.val(actor.hp.remaining);
            maximum.text(actor.hp.maximum);
            temp.val(actor.hp.temp <= 0 ? '--' : actor.hp.temp);

            return container;
        };

        return rebuild;
    }

    /**
     * Initializes the menu shown when the abilities button in the action bar is clicked.
     * @returns {ActionMenuRender} */
    #setupAbilitiesMenu() {
        const container = $('<div class="avtt-actionbar-abilities" />');

        const scores = $('<div class="avtt-actionbar-scores" />').appendTo(container);
        $('<div class="avtt-menu-title">Ability Checks</div>').appendTo(scores);

        const movement = $('<div class="avtt-actionbar-movement" />').appendTo(container);
        $('<div class="avtt-menu-title">Movement</div>').appendTo(movement);

        const formatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

        const buildAbility = () => {
            const row = $('<div class="ability-check" />').appendTo(scores);
            const score = $('<div class="score" />').appendTo(row);
            const name = $('<div class="name" />').appendTo(row);
            const modifier = $('<div class="modifier" />').appendTo(row);

            const bindTo = (/** @type {BlockAbilityModifier} */ ability) => {
                score.text(ability.score.current);
                name.text(ability.score.name);
                modifier.text(formatter.format(ability.current));
            }

            return bindTo;
        };

        const buildSpeed = () => {
            const row = $('<div class="movement" />').appendTo(movement);
            const name = $('<div class="name" />').appendTo(row);
            const modifier = $('<div class="modifier" />').appendTo(row);

            const bindTo = (/** @type {NumericStatTracker} */ speed) => {
                const current = speed.current;
                name.text(speed.name);
                modifier.text(current <= 0 ? '--' : `${current} ft.`);
            }

            return bindTo;
        };

        const str = buildAbility();
        const dex = buildAbility();
        const con = buildAbility();
        const int = buildAbility();
        const wis = buildAbility();
        const cha = buildAbility();

        const walk = buildSpeed();
        const crawl = buildSpeed();
        const climb = buildSpeed();
        const swim = buildSpeed();
        const burrow = buildSpeed();
        const fly = buildSpeed();

        const rebuild = () => {
            const actor = this.#actor;
            if (actor == null) {
                return undefined;
            }

            str(actor.modifiers.str);
            dex(actor.modifiers.dex);
            con(actor.modifiers.con);
            int(actor.modifiers.int);
            wis(actor.modifiers.wis);
            cha(actor.modifiers.cha);

            walk(actor.movement.walk);
            crawl(actor.movement.crawl);
            climb(actor.movement.climb);
            swim(actor.movement.swim);
            burrow(actor.movement.burrow);
            fly(actor.movement.fly);

            return container;
        };

        return rebuild;
    }

    /**
     * Initializes the menu shown when the saving throws button in the action bar is clicked.
     * @returns {ActionMenuRender} */
    #setupSavesMenu() {
        const container = $('<div class="avtt-actionbar-saves" />');
        $('<div class="avtt-menu-title">Saving Throws</div>').appendTo(container);

        const formatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

        const buildSave = (name) => {
            const check = $('<div class="saving-throw" />').appendTo(container);
            $(`<div class="name">${name}</div>`).appendTo(check);

            const modifier = $('<div class="modifier" />').appendTo(check);

            const bindTo = (/** @type {StatBlock} */ actor, /** @type {DiceAction} */ save) => {
                const pb = actor.proficiencyBonus.current;
                const diceContext = actor.diceContext;
                const abilityMod = actor.modifiers[save.ability]?.current ?? 0;

                const bonusAmount = diceContext.convertNumeric(save.bonus) ?? 0;
                const profAmount = (pb * (diceContext.convertNumeric(save.proficiency) ?? 0));

                const total = abilityMod + bonusAmount + profAmount;

                modifier.text(formatter.format(total));
            }

            return bindTo;
        };

        const str = buildSave('Strength');
        const dex = buildSave('Dexterity');
        const con = buildSave('Constitution');
        const int = buildSave('Intellegence');
        const wis = buildSave('Wisdom');
        const cha = buildSave('Charisma');

        const rebuild = () => {
            const actor = this.#actor;
            if (actor == null) {
                return undefined;
            }

            str(actor, actor.saves.str);
            dex(actor, actor.saves.dex);
            con(actor, actor.saves.con);
            int(actor, actor.saves.int);
            wis(actor, actor.saves.wis);
            cha(actor, actor.saves.cha);

            return container;
        };

        return rebuild;
    }

    /**
     * Initializes the menu shown when the skill check button in the action bar is clicked.
     * @returns {ActionMenuRender} */
    #setupSkillsMenu() {
        const container = $('<div class="avtt-actionbar-skills" />');
        $('<div class="avtt-menu-title">Skill Checks</div>').appendTo(container);

        const options = $('<div class="avtt-skill-checks" />').appendTo(container);
        const formatter = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

        const buildSkill = () => {
            const check = $('<div class="skill" />').appendTo(options);
            const name = $(`<div class="name" />`).appendTo(check);
            const ability = $('<div class="ability" />').appendTo(check);
            const modifier = $('<div class="modifier" />').appendTo(check);

            const bindTo = (/** @type {StatBlock} */ actor, /** @type {DiceAction} */ skill) => {
                const pb = actor.proficiencyBonus.current;
                const diceContext = actor.diceContext;
                const abilityMod = actor.modifiers[skill.ability]?.current ?? 0;

                const bonusAmount = diceContext.convertNumeric(skill.bonus) ?? 0;
                const profAmount = (pb * (diceContext.convertNumeric(skill.proficiency) ?? 0));

                const total = abilityMod + bonusAmount + profAmount;

                name.text(skill.name);
                ability.text(skill.ability);
                modifier.text(formatter.format(total));
            }

            return bindTo;
        };

        const acrobatics = buildSkill();
        const animalHandling = buildSkill();
        const arcana = buildSkill();
        const athletics = buildSkill();
        const deception = buildSkill();
        const history = buildSkill();
        const insight = buildSkill();
        const intimidation = buildSkill();
        const investigation = buildSkill();
        const medicine = buildSkill();
        const nature = buildSkill();
        const perception = buildSkill();
        const performance = buildSkill();
        const persuasion = buildSkill();
        const religion = buildSkill();
        const sleightOfHand = buildSkill();
        const stealth = buildSkill();
        const survival = buildSkill();

        const rebuild = () => {
            const actor = this.#actor;
            if (actor == null) {
                return undefined;
            }

            acrobatics(actor, actor.skills.acrobatics);
            animalHandling(actor, actor.skills.animalHandling);
            arcana(actor, actor.skills.arcana);
            athletics(actor, actor.skills.athletics);
            deception(actor, actor.skills.deception);
            history(actor, actor.skills.history);
            insight(actor, actor.skills.insight);
            intimidation(actor, actor.skills.intimidation);
            investigation(actor, actor.skills.investigation);
            medicine(actor, actor.skills.medicine);
            nature(actor, actor.skills.nature);
            perception(actor, actor.skills.perception);
            performance(actor, actor.skills.performance);
            persuasion(actor, actor.skills.persuasion);
            religion(actor, actor.skills.religion);
            sleightOfHand(actor, actor.skills.sleightOfHand);
            stealth(actor, actor.skills.stealth);
            survival(actor, actor.skills.survival);

            return container;
        };

        return rebuild;
    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    environment: Tabletop,
    actionBar: ActionBar
});