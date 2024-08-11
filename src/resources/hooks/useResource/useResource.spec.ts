import { mockCollection, mockFantasyDatabase } from '@/tests/mock/backend'

import { CleanupManager } from '@/classes/CleanupManager'
import { FirevaseClient } from '@/firevase'
import { mockDb } from '@/tests/mock/firebase'
import { collection, doc } from 'firebase/firestore'
import { Mock } from 'vitest'
import { onBeforeUnmount } from 'vue'
import { useResource } from '.'
import {
  createResource,
  deleteResource,
  getResourceGetter,
  getResourceSynchronizer,
  updateResource,
} from '../../functions'

vi.mock('vue')
vi.mock('../../functions')
vi.mock('@/classes/CleanupManager')

const mockClient = { db: mockDb } as FirevaseClient

const path = 'test-path'

const mockOnBeforeUnmount = onBeforeUnmount as Mock
const mockCleanupManager = CleanupManager as unknown as Mock
const mockGetResourceGetter = getResourceGetter as Mock
const mockGetResourceSynchronizer = getResourceSynchronizer as Mock

const mockCleanupDispose = vi.fn()
const mockCleanupAdd = vi.fn()

const mockGet = vi.fn()
const mockGetList = vi.fn()

const mockSync = vi.fn()
const mockSyncList = vi.fn()

describe('useResource', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    mockCleanupManager.mockReturnValue({
      dispose: mockCleanupDispose,
      add: mockCleanupAdd,
    })

    mockGetResourceGetter.mockReturnValue({
      get: mockGet,
      getList: mockGetList,
    })

    mockGetResourceSynchronizer.mockReturnValue({
      sync: mockSync,
      syncList: mockSyncList,
    })
  })

  it('returns the correct collection', () => {
    mockFantasyDatabase({})

    mockCollection.mockImplementation((db, path) => ({ db, path }))

    const { resourceCollection } = useResource(mockClient, path)

    expect(resourceCollection).toEqual(collection(mockClient.db, path))
  })

  it('returns a docWithId method that returns a doc given its id', () => {
    const { docWithId } = useResource(mockClient, path)

    const id = '2'

    expect(docWithId(id)).toBe(doc(collection(mockClient.db, path), id))
  })

  describe('cleanup manager', () => {
    it('disposes on unmount', async () => {
      const unmountPromise = new Promise<void>((resolve) => {
        mockOnBeforeUnmount.mockImplementation((callback) =>
          setTimeout(() => {
            callback()
            resolve()
          }, 50)
        )
      })

      useResource(mockClient, path)

      expect(mockCleanupDispose).not.toHaveBeenCalled()

      await unmountPromise

      expect(mockCleanupDispose).toHaveBeenCalledOnce()
    })

    it('is returned', () => {
      const cleanupManager = { value: 'scooby-doo' }

      mockCleanupManager.mockReturnValue(cleanupManager)

      const { cleanupManager: returnedValue } = useResource(mockClient, path)

      expect(returnedValue).toBe(cleanupManager)
    })

    it.todo('is properly passed to all methods that require it', () => {
      const cleanupManager = { value: 'scooby-doo' }

      mockCleanupManager.mockReturnValue(cleanupManager)

      useResource(mockClient, path)

      expect(mockGetResourceGetter).toHaveBeenCalledWith()
    })
  })

  describe('write methods', () => {
    it('returns create generated from createResource method', () => {
      const { create } = useResource(mockClient, path)

      expect(createResource).not.toHaveBeenCalled()

      const properties = { name: 'Alucard', count: 2 }

      const id = '6'

      create(properties, id)

      expect(createResource).toHaveBeenCalledOnce()

      expect(createResource).toHaveBeenCalledWith(
        mockClient,
        path,
        properties,
        id
      )
    })

    it('returns update generated from updateResource method', () => {
      const { update } = useResource(mockClient, path)

      expect(updateResource).not.toHaveBeenCalled()

      const properties = { name: 'Alucard', count: 2 }

      const id = '6'

      const options = { wassup: 'toaster' }

      update(id, properties, options as any)

      expect(updateResource).toHaveBeenCalledOnce()

      expect(updateResource).toHaveBeenCalledWith(
        mockClient,
        path,
        id,
        properties,
        options
      )
    })

    it('returns deleteForever generated from deleteResource method', () => {
      const { deleteForever } = useResource(mockClient, path)

      expect(deleteResource).not.toHaveBeenCalled()

      const id = '6'

      deleteForever(id)

      expect(deleteResource).toHaveBeenCalledOnce()

      expect(deleteResource).toHaveBeenCalledWith(mockClient, path, id)
    })
  })

  it('passes correct params and returns from getResourceGetter', () => {
    const cleanupManager = { value: 'scooby-doo' }

    mockCleanupManager.mockReturnValue(cleanupManager)

    const { get, getList } = useResource(mockClient, path)

    expect(getResourceGetter).toHaveBeenCalledOnce()

    expect(getResourceGetter).toHaveBeenCalledWith(mockClient, path, {
      cleanupManager,
    })

    expect(get).toBe(mockGet)
    expect(getList).toBe(mockGetList)
  })

  it('passes correct params and returns from getResourceSynchronizer', () => {
    const cleanupManager = { value: 'scooby-doo' }

    mockCleanupManager.mockReturnValue(cleanupManager)

    const { sync, syncList } = useResource(mockClient, path)

    expect(getResourceSynchronizer).toHaveBeenCalledOnce()

    expect(getResourceSynchronizer).toHaveBeenCalledWith(
      mockClient,
      path,
      cleanupManager
    )

    expect(sync).toBe(mockSync)
    expect(syncList).toBe(mockSyncList)
  })
})
