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
   * L'acteur qui parle : celui du jeton s'il y en a un (un PNJ non lié a le sien), sinon l'acteur.
   * @returns {Actor|undefined}
   */
  get speakerActor() {
    const { scene, token, actor } = this.speaker
    if (scene && token) {
      const tokenActor = game.scenes.get(scene)?.tokens.get(token)?.actor
      if (tokenActor) return tokenActor
    }
    return game.actors.get(actor)
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
    const src = (visible ? this.speakerActor?.img : null) ?? this.author?.avatar
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
