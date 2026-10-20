/**
 * Crée un message de tchat dans le mode de visibilité voulu — par défaut celui que le joueur a choisi
 * dans le sélecteur du tchat (public, MJ seulement, à l'aveugle, pour soi).
 *
 * `ChatMessage.create` n'applique ce mode que si on le lui passe : sans l'option `messageMode`, un
 * jet secret sortirait public.
 * @param {Object} data Les données du message.
 * @param {Object} [options]
 * @param {string} [options.messageMode] Une clé de `CONFIG.ChatMessage.modes` ; à défaut, le mode du tchat.
 * @returns {Promise<ChatMessage>}
 */
export function createChatMessage(data, { messageMode } = {}) {
  return ChatMessage.implementation.create(data, { messageMode: messageMode ?? currentMessageMode() })
}

/**
 * Le mode de visibilité choisi dans le sélecteur du tchat.
 * @returns {string}
 */
export function currentMessageMode() {
  return game.settings.get("core", "messageMode")
}
