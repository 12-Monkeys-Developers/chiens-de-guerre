import { SYSTEM } from "../config/system.mjs"
import CdgConfrontation from "../combat/confrontation.mjs"

/**
 * Message de tchat : l'en-tête montre le portrait du locuteur à côté de son nom.
 *
 * Seul le nom du locuteur (`.message-sender`) est remplacé ; l'horodatage, les commandes et la ligne
 * des destinataires d'un chuchotement restent ceux de Foundry.
 */
export default class CdgChatMessage extends ChatMessage {
  /** @inheritDoc */
  async renderHTML(options = {}) {
    const html = await super.renderHTML(options)
    this.#addSenderPortrait(html)
    return html
  }

  /**
   * Place le portrait devant le nom. Un contenu caché à l'utilisateur (jet à l'aveugle, initiative
   * d'un PNJ) montre le joueur qui l'a envoyé plutôt que le personnage, pour ne rien en révéler. La
   * carte de confrontation garde son en-tête : son bandeau attaquant → cible porte déjà les portraits.
   * @param {HTMLElement} html
   */
  #addSenderPortrait(html) {
    if (this.getFlag(SYSTEM.PACKAGE_ID, CdgConfrontation.FLAG)) return
    const sender = html.querySelector(".message-sender")
    if (!sender) return

    const visible = this.isContentVisible
    const name = visible ? this.alias : this.author?.name
    // `getSpeakerActor` et non `speakerActor`, qui se rabat sur le personnage de l'auteur : un message
    // sans locuteur garde l'avatar du joueur.
    const src = (visible ? ChatMessage.getSpeakerActor(this.speaker)?.img : null) ?? this.author?.avatar
    if (!src) return

    const portrait = document.createElement("img")
    Object.assign(portrait, { src, alt: name ?? "", className: "sender-portrait" })
    const label = document.createElement("span")
    label.className = "sender-name"
    label.append(name ?? "")

    sender.classList.add("cdg-sender")
    sender.replaceChildren(portrait, label)
  }
}
