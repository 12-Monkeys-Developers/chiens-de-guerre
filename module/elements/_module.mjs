import AdoptedStylesheetMixin from "./adopted-style-sheet-mixin.mjs"
import CheckboxElement from "./checkbox.mjs"
import ToggleSwitchElement from "./toggle-switch.mjs"
import slideToggle from "./slide-toggle.mjs"

window.customElements.define(CheckboxElement.tagName, CheckboxElement)
window.customElements.define(ToggleSwitchElement.tagName, ToggleSwitchElement)

export { AdoptedStylesheetMixin, CheckboxElement, ToggleSwitchElement, slideToggle }
