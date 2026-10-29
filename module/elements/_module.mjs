import AdoptedStylesheetMixin from "./adopted-style-sheet-mixin.mjs"
import CheckboxElement from "./checkbox.mjs"
import ToggleSwitchElement from "./toggle-switch.mjs"

// Seul l'interrupteur est une balise des fiches ; la case à cocher n'en est que la classe de base.
window.customElements.define(ToggleSwitchElement.tagName, ToggleSwitchElement)

export { AdoptedStylesheetMixin, CheckboxElement, ToggleSwitchElement }
