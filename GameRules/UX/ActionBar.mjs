import { DiceActionsEnabled } from '../CoreEnums.mjs'
import { Tabletop, TabletopDialog } from './Tabletop.mjs';

/** Management of the main action bar for the active character or token being played by the user. */
class ActionBarControl {
    #container;
    #bar;
    #dialog;

    #hp;
    #abilities;
    #saves;
    #skills;
    #actions;
    #conditions;

    constructor() {
        if (!DiceActionsEnabled) {
            Object.freeze(this);
            return;
        }

        this.#container = $('<div class="avtt-hotbar-container" />');
        Tabletop.monitorTheme(this.#changeTheme.bind(this));

        this.#bar = $('<div class="avtt-hotbar" />').appendTo(this.#container);
        this.#dialog = new TabletopDialog(this.#container);

        this.#hp = $('<div class="avtt-hotbar-button hp"><span class="icon" /></div>').appendTo(this.#bar);
        this.#abilities = $('<div class="avtt-hotbar-button abilities"><span class="icon" /></div>').appendTo(this.#bar);
        this.#saves = $('<div class="avtt-hotbar-button saves"><span class="icon" /></div>').appendTo(this.#bar);
        this.#skills = $('<div class="avtt-hotbar-button skills"><span class="icon" /></div>').appendTo(this.#bar);
        this.#actions = $('<div class="avtt-hotbar-button actions"><span class="icon" /></div>').appendTo(this.#bar);
        this.#conditions = $('<div class="avtt-hotbar-button srd-conditions"><span class="icon" /></div>').appendTo(this.#bar);

        let count = 0;
        for (const entry of [ this.#hp, this.#abilities, this.#saves, this.#skills, this.#actions, this.#conditions ]) {
            const content = $(`<div>I\'m menu #${count}</div>`);
            entry.on('click', () => this.#dialog.attach(entry, content, { classNames: [ 'standard', 'centerX' ]}))
            count++;
        }

        $(document.body).append(this.#container);

        Object.freeze(this);
    }

    /**
     * Handles a change to the tabletop's theme
     * @param {CustomEvent<{ theme: string }>} event
    */
    #changeTheme(event) {
        const requested = event.detail.theme ?? 'dark';
        this.#container.toggleClass('use-light-mode', (requested === 'light'));
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

class ActionBarMenu {
    constructor() {
        Object.freeze(this);
    }
}

class HitPointManager {
    #button;
    #dialog;

    constructor() {

    }
}

export const ActionBar = new ActionBarControl();

window.tabletop = Object.freeze({
    environment: Tabletop,
    actionBar: ActionBar
});