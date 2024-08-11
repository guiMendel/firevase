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

  /** Manages snapshot listeners cleanups */
  protected cleanup: CleanupManager = new CleanupManager()

  /** What will be fetched */
  protected _target: T | undefined

  /** Whether a fetch has been performed or disposed */
  protected state: 'ready-to-fetch' | 'fetched' | 'disposed' = 'ready-to-fetch'

  /** Must be executed whenever a new snapshot for this fetch is available */
  protected emitFetch: OnFetch<V> = (snapshot, cleanupManager) => {
    this._mainFetchListener(snapshot, cleanupManager)

    for (const listener of this.fetchListeners)
      listener(snapshot, cleanupManager)
  }

  private _mainFetchListener: OnFetch<V>

  /** Whether this fetcher has received data from fetch yet */
  protected _hasLoaded = false

  public get fetchState() {
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

  /** Performs the fetch */
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
   * It should call emitFetch and set _hasLoaded
   */
  protected abstract fetchImplementation: () => Promise<void>

  /** Updates what will be fetched and guarantees that the fetchState stays the same */
  updateTarget = (
    newTarget?: T,
    options: { force: boolean } = { force: false }
  ) => {
    if (compareTargets(this._target, newTarget) && options.force == false)
      return

    this._target = newTarget

    const previousState = this.state

    this.cleanup.dispose()

    if (previousState === 'ready-to-fetch') this.state = 'ready-to-fetch'
    else if (previousState === 'fetched' && newTarget != undefined)
      this.trigger()

    for (const listener of this.updateTargetListeners) listener(newTarget)
  }

  /** Resets all state and target */
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
