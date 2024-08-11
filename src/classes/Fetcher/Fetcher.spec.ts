import { Mock } from 'vitest'
import * as CleanupManagerNamespace from '../CleanupManager'
import { Fetcher } from './Fetcher'

const onFetchMock = vi.fn()
const fetchImplementation = vi.fn()

const target = 'target'
const newTarget = 'newTarget'
const snapshot = 'snapshot'

const setupCleanupManagerMock = () => {
  const cleanup = { onDispose: vi.fn(), dispose: vi.fn() }

  vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockReturnValue(
    cleanup as any
  )

  return cleanup
}

class TestFetcher<T = string, V = string> extends Fetcher<T, V> {
  protected override fetchImplementation = async () => fetchImplementation(this)
}

describe('Fetcher', () => {
  beforeEach(() => {
    vi.resetAllMocks().restoreAllMocks()

    fetchImplementation.mockImplementation(async (forwardedThis: any) => {
      forwardedThis._hasLoaded = true

      forwardedThis.emitFetch(snapshot, forwardedThis.cleanup)
    })
  })

  it('constructs with correct state', () => {
    const cleanup = setupCleanupManagerMock()

    const fetcher = new TestFetcher(target, onFetchMock)

    expect(fetcher).toHaveProperty('_target', target)
    expect(fetcher).toHaveProperty('_mainFetchListener', onFetchMock)

    expect(fetcher).toHaveProperty('disposeListeners', [])
    expect(fetcher).toHaveProperty('resetListeners', [])
    expect(fetcher).toHaveProperty('beforeFetchListeners', [])
    expect(fetcher).toHaveProperty('updateTargetListeners', [])
    expect(fetcher).toHaveProperty('fetchListeners', [])
    expect(fetcher).toHaveProperty('cleanup', cleanup)
    expect(fetcher).toHaveProperty('state', 'ready-to-fetch')
    expect(fetcher).toHaveProperty('_hasLoaded', false)
  })

  describe('fetchState', () => {
    it('on an empty target, returns empty', () => {
      const fetcher = new TestFetcher(undefined, onFetchMock)

      expect(fetcher.fetchState).toBe('empty')
    })

    it('with a valid target, returns ready-to-fetch', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      expect(fetcher.fetchState).toBe('ready-to-fetch')
    })

    it('after a fetch, returns fetched', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.trigger()

      expect(fetcher.fetchState).toBe('fetched')
    })

    it('after disposal, returns disposed', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.dispose()

      expect(fetcher.fetchState).toBe('disposed')
    })
  })

  it('getTarget returns the correct target', () => {
    const fetcher = new TestFetcher(target, onFetchMock)

    expect(fetcher.getTarget()).toBe(target)

    fetcher.updateTarget(newTarget)

    expect(fetcher.getTarget()).toBe(newTarget)
  })

  it('getCleanupManager returns the correct cleanup manager', () => {
    const cleanup = setupCleanupManagerMock()

    const fetcher = new TestFetcher(target, onFetchMock)

    expect(fetcher.getCleanupManager()).toBe(cleanup)
  })

  it('dispose should dispose cleanup manager and trigger listeners', () => {
    const cleanup = setupCleanupManagerMock()

    const listener = vi.fn()

    const fetcher = new TestFetcher(target, onFetchMock)

    fetcher.onDispose(listener)

    fetcher.dispose()

    expect(cleanup.dispose).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledOnce()
  })

  it('hasLoaded starts false, is set to true after fetch, and goes back to false after reset', () => {
    const fetcher = new TestFetcher(target, onFetchMock)

    expect(fetcher.hasLoaded).toBeFalsy()

    fetcher.trigger()

    expect(fetcher.hasLoaded).toBeTruthy()

    fetcher.reset()

    expect(fetcher.hasLoaded).toBeFalsy()
  })

  describe('trigger', () => {
    it('should notify "before fetch" listeners, even when already fetched', () => {
      const listener = vi.fn()

      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.onBeforeFetchTrigger(listener)

      fetcher.trigger()

      expect(listener).toHaveBeenCalledOnce()

      fetcher.trigger()

      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should only call fetchImplementation when state is not fetched', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      expect(fetchImplementation).not.toHaveBeenCalled()

      fetcher.trigger()

      expect(fetchImplementation).toHaveBeenCalledOnce()

      fetcher.trigger()

      expect(fetchImplementation).toHaveBeenCalledOnce()

      fetcher.dispose()
      fetcher.trigger()

      expect(fetchImplementation).toHaveBeenCalledTimes(2)
    })

    it('should not call fetchImplementation when there is no target', () => {
      const fetcher = new TestFetcher(undefined, onFetchMock)

      fetcher.trigger()

      expect(fetchImplementation).not.toHaveBeenCalled()
    })
  })

  describe('updateTarget', () => {
    describe('force', () => {
      it('does nothing if targets are the same and force is false', () => {
        const listener = vi.fn()

        const fetcher = new TestFetcher(target, onFetchMock)

        fetcher.onUpdateTarget(listener)

        fetcher.updateTarget(target)

        expect(listener).not.toHaveBeenCalled()
      })

      it('executes even if targets are the same when force is true', () => {
        const listener = vi.fn()

        const fetcher = new TestFetcher(target, onFetchMock)

        fetcher.onUpdateTarget(listener)

        fetcher.updateTarget(target, { force: true })

        expect(listener).toHaveBeenCalledOnce()
      })
    })

    it('changes target to new target', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.updateTarget(newTarget)

      expect(fetcher.getTarget()).toBe(newTarget)
    })

    it('disposes the internal cleanup manager', () => {
      const cleanup = setupCleanupManagerMock()

      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.updateTarget(newTarget)

      expect(cleanup.dispose).toHaveBeenCalledOnce()
    })

    describe('preserves state', () => {
      it('ready-to-fetch', () => {
        const fetcher = new TestFetcher(target, onFetchMock)

        expect(fetcher.fetchState).toBe('ready-to-fetch')

        fetcher.updateTarget(newTarget)

        expect(fetcher.fetchState).toBe('ready-to-fetch')
      })

      it('fetched', () => {
        const listener = vi.fn()

        const fetcher = new TestFetcher(target, onFetchMock)

        fetcher.trigger()

        expect(fetcher.fetchState).toBe('fetched')

        fetcher.onBeforeFetchTrigger(listener)

        fetcher.updateTarget(newTarget)

        expect(fetcher.fetchState).toBe('fetched')
        expect(listener).toHaveBeenCalledOnce()
      })

      it('disposed', () => {
        const fetcher = new TestFetcher(target, onFetchMock)

        fetcher.dispose()

        expect(fetcher.fetchState).toBe('disposed')

        fetcher.updateTarget(newTarget)

        expect(fetcher.fetchState).toBe('disposed')
      })
    })

    it('triggers listeners', () => {
      const listener = vi.fn()

      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.onUpdateTarget(listener)

      fetcher.updateTarget(newTarget)

      expect(listener).toHaveBeenCalledOnce()
    })
  })

  describe('reset', () => {
    it('also calls dispose', () => {
      const listener = vi.fn()

      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.onDispose(listener)

      fetcher.reset()

      expect(listener).toHaveBeenCalledOnce()
    })

    it('notifies reset listeners', () => {
      const listener = vi.fn()

      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.onReset(listener)

      fetcher.reset()

      expect(listener).toHaveBeenCalledOnce()
    })

    it('sets target to undefined', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.reset()

      expect(fetcher.getTarget()).toBeUndefined()
    })

    it('resets loaded flag', () => {
      const fetcher = new TestFetcher(target, onFetchMock)

      fetcher.reset()

      expect(fetcher.hasLoaded).toBeFalsy()
    })
  })
})
