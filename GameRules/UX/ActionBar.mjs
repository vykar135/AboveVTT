export default class ActionBar {
    constructor() {
        Object.freeze(this);
    }
}

window.actionControls = Object.freeze({
    actionBar: new ActionBar()
});