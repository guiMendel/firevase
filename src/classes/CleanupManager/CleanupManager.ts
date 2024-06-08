type LinkRelation = 'propagate-both' | 'propagate-to' | 'propagate-from'

/** Permite armazenar callbacks para cleanup e fornece um meio de executar cleanups com antecedencia */
export class CleanupManager {
  /** O gerador de ids para managers */
  static managerId = 0

  /** O id desses cleanup manager */
  private readonly ownId = CleanupManager.managerId++

  // ====================================
  // CLEANUPS
  // ====================================

  /** O id do proximo cleanup */
  private nexCleanupId = 0

  private linkedManagers: Record<
    number,
    { other: CleanupManager; relation: LinkRelation }
  > = {}

  private managedCleanups: Record<number, () => void> = {}

  private disposeListeners: Array<() => void> = []

  /** Registra esse callback para cleanup
   * @returns um metodo que, se executado, invoca o callback e remove o callback deste manager
   */
  add(callback: () => void) {
    const callbackId = this.nexCleanupId++

    this.managedCleanups[callbackId] = callback

    const clearCleanup = () => delete this.managedCleanups[callbackId]

    const triggerEarlyCleanup = () => {
      callback()
      clearCleanup()
    }

    return {
      triggerEarlyCleanup,
      clearCleanup,
    }
  }

  private internalDispose(alreadyDisposedManagers: number[]) {
    // Chama os callbacks de dispose
    for (const callback of Object.values(this.managedCleanups)) callback()

    // Ativa o dispose dos linkados
    for (const { other, relation } of Object.values(this.linkedManagers)) {
      if (
        relation != 'propagate-from' &&
        alreadyDisposedManagers.includes(other.ownId) == false
      )
        other.internalDispose([...alreadyDisposedManagers, this.ownId])
    }

    for (const callback of this.disposeListeners) callback()

    this.managedCleanups = {}
  }

  /** Realiza o cleanup dos callbacks armazenados */
  dispose() {
    this.internalDispose([])
  }

  /** Associa dois cleanup managers: quando um chamar dispose, o outro tambem chamara dispose.
   * Apos um desses disposes acontecer, o link eh quebrado
   */
  link(relation: LinkRelation, otherManager: CleanupManager) {
    if (otherManager.ownId in this.linkedManagers) return

    this.linkedManagers[otherManager.ownId] = { other: otherManager, relation }

    // Traduz essa relacao para a relacao do outro ponto de vista
    const translateRelationPointOfView: Record<LinkRelation, LinkRelation> = {
      'propagate-both': 'propagate-both',
      'propagate-from': 'propagate-to',
      'propagate-to': 'propagate-from',
    }

    otherManager.link(translateRelationPointOfView[relation], this)
  }

  /** Executa esse callback sempre que realizar um dispose */
  onDispose(callback: () => void) {
    this.disposeListeners.push(callback)
  }
}
