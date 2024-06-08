import { CleanupManager } from '../CleanupManager'

const compareTargets = <T>(target1: T | undefined, target2: T | undefined) =>
  typeof target1 === typeof target2 &&
  JSON.stringify(target1) === JSON.stringify(target2)

export type OnFetch<V> = (snapshot: V, cleanupManager: CleanupManager) => void

export abstract class Fetcher<T, V> {
  private disposeListeners: Array<() => void> = []
  private resetListeners: Array<() => void> = []
  private beforeFetchListeners: Array<() => void> = []
  private updateTargetListeners: Array<(target: T | undefined) => void> = []
  private fetchListeners: Array<OnFetch<V>> = []

  /** Gerencia o cleanup dos snapshot listeners */
  protected cleanup: CleanupManager = new CleanupManager()

  /** O que esta sendo fetchado */
  protected _target: T | undefined

  /** Se um fetch esta ativo ou se ja foi descartado */
  protected state: 'ready-to-fetch' | 'fetched' | 'disposed' = 'ready-to-fetch'

  /** Callback para executar sempre que houver um novo snapshot para este fetch */
  protected emitFetch: OnFetch<V> = (snapshot, cleanupManager) => {
    this._mainFetchListener(snapshot, cleanupManager)

    for (const listener of this.fetchListeners)
      listener(snapshot, cleanupManager)
  }

  private _mainFetchListener: OnFetch<V>

  /** Whether this fetcher has not received data from fetch yet */
  protected _hasLoaded = false

  public get fetchState() {
    // Para o publico, utilizamos o estado empty para indicar que nao ha target
    if (!this._target) return 'empty'

    return this.state
  }

  public getTarget = () => {
    return this._target
  }

  public getCleanupManager = () => {
    return this.cleanup
  }

  public dispose = () => {
    this.cleanup.dispose()

    for (const listener of this.disposeListeners) listener()
  }

  public get hasLoaded() {
    return this._hasLoaded
  }

  constructor(target: T | undefined, onFetch: OnFetch<V>) {
    this._target = target
    this._mainFetchListener = onFetch

    this.cleanup.onDispose(() => (this.state = 'disposed'))
  }

  /** Inicia o fetch */
  trigger = () => {
    for (const listener of this.beforeFetchListeners) listener()

    if (this.state === 'fetched') return

    // Even when empty, we should set to fetched
    // This way, when we do get a target later on, we will know to trigger the fetch
    this.state = 'fetched'

    if (this._target == undefined) return

    this.fetchImplementation()
  }

  /**
   * Implements how the subclass performs the fetch.
   * It should call onFetch and set _hasLoaded
   */
  protected abstract fetchImplementation: () => Promise<void>

  /** Atualiza o alvo de fetch, e mantem o estado de fetch */
  updateTarget = (newTarget?: T) => {
    if (compareTargets(this._target, newTarget)) return

    this._target = newTarget

    // Vai manter este estado
    const previousState = this.state

    // Descarta somente o cleanup manager interno
    this.cleanup.dispose()

    if (previousState === 'ready-to-fetch') this.state = 'ready-to-fetch'
    else if (previousState === 'fetched' && newTarget != undefined)
      this.trigger()

    for (const listener of this.updateTargetListeners) listener(newTarget)
  }

  /** Reinicia o ref, resetando o alvo para undefined e o estado para 'empty' */
  reset = () => {
    this.dispose()

    this.updateTarget(undefined)

    this.state = 'ready-to-fetch'

    this._hasLoaded = false

    for (const listener of this.resetListeners) listener()
  }

  onDispose = (callback: () => void) => {
    this.disposeListeners.push(callback)
  }

  onReset = (callback: () => void) => {
    this.resetListeners.push(callback)
  }

  onUpdateTarget = (callback: (target: T | undefined) => void) => {
    this.updateTargetListeners.push(callback)
  }

  onBeforeFetchTrigger = (callback: () => void) => {
    this.beforeFetchListeners.push(callback)
  }

  onFetch = (callback: OnFetch<V>) => {
    this.fetchListeners.push(callback)
  }
}
