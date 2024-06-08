import { DocumentReference, onSnapshot } from 'firebase/firestore'
import { Syncable } from '.'
import { Mock } from 'vitest'

vi.mock('firebase/firestore', async () => ({
  ...(await vi.importActual<{}>('firebase/firestore')),
  onSnapshot: vi.fn(),
}))

const mockOnSnapshot = onSnapshot as Mock

const docTarget = 'target' as unknown as DocumentReference

describe('Syncable', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mockOnSnapshot.mockReturnValue(vi.fn())
  })

  describe('disposal', () => {
    it('should dispose its cleanup manager', () => {
      const disposeCallback = vi.fn()

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.getCleanupManager().add(disposeCallback)

      syncable.dispose()

      expect(disposeCallback).toHaveBeenCalledOnce()
    })

    it('should update state to disposed after calling dispose', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      expect(syncable.fetchState).toBe('ready-to-fetch')

      syncable.dispose()

      expect(syncable.fetchState).toBe('disposed')
    })

    it('should trigger listeners', () => {
      const disposeCallback = vi.fn()

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.onDispose(disposeCallback)

      syncable.dispose()

      expect(disposeCallback).toHaveBeenCalledOnce()
    })
  })

  describe('updating target', () => {
    it('updates the target successfully', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      expect(syncable.getTarget()).toBe(docTarget)

      const newTarget = 'new-target' as unknown as DocumentReference

      syncable.updateTarget(newTarget)

      expect(syncable.getTarget()).toBe(newTarget)
    })

    it('disposes previous sync', () => {
      const disposeCallback = vi.fn()

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.getCleanupManager().add(disposeCallback)

      syncable.updateTarget('new-target' as unknown as DocumentReference)

      expect(disposeCallback).toHaveBeenCalledOnce()
    })

    it.each(['ready-to-fetch', 'fetched', 'disposed'] as const)(
      'preserves %s state',
      (state) => {
        const syncable = new Syncable(docTarget, vi.fn())

        if (state === 'fetched') syncable.trigger()
        else if (state === 'disposed') syncable.dispose()

        expect(syncable.fetchState).toBe(state)

        syncable.updateTarget('new-target' as unknown as DocumentReference)

        expect(syncable.fetchState).toBe(state)
      }
    )

    it('triggers update listeners', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      const updateCallback = vi.fn()

      syncable.onUpdateTarget(updateCallback)

      expect(updateCallback).not.toHaveBeenCalled()

      syncable.updateTarget('bob' as any)

      expect(updateCallback).toHaveBeenCalledOnce()

      syncable.updateTarget('lisa' as any)

      expect(updateCallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('syncing', () => {
    it('gives empty state when there is no target', () => {
      const syncable = new Syncable(undefined, () => {})

      expect(syncable.fetchState).toBe('empty')
    })

    it('ignores trigger when there is no target', () => {
      const syncable = new Syncable(undefined, () => {})

      syncable.trigger()

      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('starts a snapshot listener for the given target', () => {
      const listenerArgument = 'snapshot'

      const mockOnNext = vi.fn()

      mockOnSnapshot.mockImplementation((_, listener) => {
        listener(listenerArgument)
        return vi.fn()
      })

      const syncable = new Syncable(docTarget, mockOnNext)

      syncable.trigger()

      expect(mockOnSnapshot).toHaveBeenCalledWith(docTarget, expect.anything())
      expect(mockOnNext).toHaveBeenCalledWith(
        listenerArgument,
        syncable.getCleanupManager()
      )
    })

    it('updates hasLoaded flag', () => {
      mockOnSnapshot.mockImplementation((_, listener) => {
        listener()
        return vi.fn()
      })

      const syncable = new Syncable(docTarget, vi.fn())

      expect(syncable).toHaveProperty('hasLoaded', false)

      syncable.trigger()

      expect(syncable).toHaveProperty('hasLoaded', true)
    })

    it('updates state to fetched', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      syncable.trigger()

      expect(syncable.fetchState).toBe('fetched')
    })

    it('ignores trigger when already fetched', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      syncable.trigger()

      expect(mockOnSnapshot).toHaveBeenCalledOnce()

      syncable.trigger()

      expect(mockOnSnapshot).toHaveBeenCalledOnce()
    })

    it('stores the snapshot listener cleanup', () => {
      const mockCleanup = vi.fn()

      mockOnSnapshot.mockReturnValue(mockCleanup)

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.trigger()

      expect(mockCleanup).not.toHaveBeenCalled()

      syncable.dispose()

      expect(mockCleanup).toHaveBeenCalledOnce()
    })

    it('triggers listeners', () => {
      const listener = vi.fn()

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.onBeforeFetchTrigger(listener)

      expect(listener).not.toHaveBeenCalled()

      syncable.trigger()

      expect(listener).toHaveBeenCalledOnce()
    })
  })

  describe('resetting', () => {
    it('disposes the sync', () => {
      const disposeCallback = vi.fn()

      const syncable = new Syncable(docTarget, vi.fn())

      syncable.getCleanupManager().add(disposeCallback)

      syncable.reset()

      expect(disposeCallback).toHaveBeenCalledOnce()
    })

    it('discards the target', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      expect(syncable.getTarget()).toBe(docTarget)

      syncable.reset()

      expect(syncable.getTarget()).toBeUndefined()
    })

    it('triggers reset listeners', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      const resetCallback = vi.fn()

      syncable.onReset(resetCallback)

      syncable.reset()

      expect(resetCallback).toHaveBeenCalledOnce()

      syncable.reset()

      expect(resetCallback).toHaveBeenCalledTimes(2)
    })

    it('updates hasLoaded flag', () => {
      const syncable = new Syncable(docTarget, vi.fn())

      ;(syncable as any)._hasLoaded = true

      expect(syncable).toHaveProperty('hasLoaded', true)

      syncable.reset()

      expect(syncable).toHaveProperty('hasLoaded', false)
    })
  })
})
