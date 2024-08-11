import { mockFantasyDatabase } from '@/tests/mock/backend'

import { CleanupManager } from '@/classes/CleanupManager'
import * as SyncableRefNamespace from '@/classes/Syncable'
import { FantasyVase, fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'
import { mockDb } from '@/tests/mock/firebase'
import {
  DocumentReference,
  Query,
  collection,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { Mock } from 'vitest'
import { getResourceSynchronizer } from '.'
import { makeHalfResource, makeResource } from '..'

vi.mock('../makeResource')

const mockMakeResource = makeResource as Mock

describe('getResourceSynchronizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    mockMakeResource.mockImplementation((_, snapshot, path) =>
      makeHalfResource(snapshot, path)
    )
  })

  describe('sync', () => {
    it('should sync current call', async () => {
      const id = '1'

      const { requireDatabaseValue, updateDatabaseValue } = mockFantasyDatabase(
        {
          knights: {
            [id]: mockKnight('uploadable'),
          },
        }
      )

      const { sync } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        new CleanupManager()
      )

      const instance = sync(id)

      // Ensures it initializes properly
      expect(instance.value).toStrictEqual(
        await requireDatabaseValue('knights', id)
      )

      await updateDatabaseValue('knights', id, { gold: 5000 })

      // Ensures it fetched properly
      expect(instance.value).toStrictEqual(
        await requireDatabaseValue('knights', id)
      )
    })

    it('should also sync the provided ref', async () => {
      const id = '1'

      const { requireDatabaseValue, updateDatabaseValue } = mockFantasyDatabase(
        {
          knights: {
            [id]: mockKnight('uploadable'),
          },
        }
      )

      const { sync } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        new CleanupManager()
      )

      const instanceRef = SyncableRefNamespace.syncableRef<
        FantasyVase,
        'knights',
        DocumentReference
      >(fantasyVase, 'knights', 'empty-document', new CleanupManager())

      sync(id, instanceRef as any)

      // Ensures it initializes properly
      expect(instanceRef.value).toStrictEqual(
        await requireDatabaseValue('knights', id)
      )

      await updateDatabaseValue('knights', id, { gold: 5000 })

      // Ensures it fetched properly
      expect(instanceRef.value).toStrictEqual(
        await requireDatabaseValue('knights', id)
      )
    })

    it('passes the correct params to syncableRef', async () => {
      const mockSyncableRef = vi.fn()

      vi.spyOn(SyncableRefNamespace, 'syncableRef').mockImplementation(
        mockSyncableRef
      )

      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const cleanupManager = new CleanupManager()

      const { sync } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        cleanupManager
      )

      sync(id)

      expect(mockSyncableRef).toHaveBeenCalledWith(
        fantasyVase,
        'knights',
        doc(collection(mockDb, 'knights'), id),
        cleanupManager
      )
    })
  })

  describe('syncing list', () => {
    it('should sync to database content', async () => {
      const { indexDatabaseValues, updateDatabaseValue } = mockFantasyDatabase({
        knights: {
          '1': mockKnight('uploadable', { name: 'Lancelot' }),
          '2': mockKnight('uploadable'),
        },
      })

      const { syncList } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        new CleanupManager()
      )

      const list = syncList()

      // Verifica se inicializa adequadamente
      expect(list.value).toStrictEqual(await indexDatabaseValues('knights'))

      await updateDatabaseValue('knights', '2', { gold: 5000 })

      expect(list.value).toStrictEqual(await indexDatabaseValues('knights'))
    })

    it('should also sync the provided ref', async () => {
      const { indexDatabaseValues, updateDatabaseValue } = mockFantasyDatabase({
        knights: {
          '1': mockKnight('uploadable', { name: 'Lancelot' }),
          '2': mockKnight('uploadable'),
        },
      })

      const { syncList } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        new CleanupManager()
      )

      const listRef = SyncableRefNamespace.syncableRef<
        FantasyVase,
        'knights',
        Query
      >(fantasyVase, 'knights', 'empty-query', new CleanupManager())

      expect(listRef.value).toStrictEqual([])

      syncList([], listRef as any)

      // Verifica se inicializa adequadamente
      expect(listRef.value).toStrictEqual(await indexDatabaseValues('knights'))

      await updateDatabaseValue('knights', '2', { gold: 5000 })

      expect(listRef.value).toStrictEqual(await indexDatabaseValues('knights'))
    })

    it('should filter list to match query and keep filter fetched', async () => {
      const { indexDatabaseValues } = mockFantasyDatabase({
        knights: {
          '1': mockKnight('uploadable', { name: 'Lancelot' }),
          '2': mockKnight('uploadable'),
        },
      })

      const { syncList } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        new CleanupManager()
      )

      const expectedResult = (await indexDatabaseValues('knights')).filter(
        ({ name }) => name === 'Lancelot'
      )

      const list = syncList([where('name', '==', 'Lancelot')])

      expect(list.value).not.toHaveLength(0)
      expect(list.value).toStrictEqual(expectedResult)
      expect(list.value).not.toStrictEqual(await indexDatabaseValues('knights'))
    })

    it('passes the correct params to make full instance', async () => {
      const mockSyncableRef = vi.fn()

      vi.spyOn(SyncableRefNamespace, 'syncableRef').mockImplementation(
        mockSyncableRef
      )

      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const cleanupManager = new CleanupManager()

      const { syncList } = getResourceSynchronizer(
        fantasyVase,
        'knights',
        cleanupManager
      )

      syncList()

      const expectedQuery = query(collection(mockDb, 'knights')) as any

      expect(mockSyncableRef).toHaveBeenCalledWith(
        fantasyVase,
        'knights',
        {
          path: expectedQuery.path,
          type: expectedQuery.type,
          filterer: expect.objectContaining(
            JSON.parse(JSON.stringify(expectedQuery.filterer))
          ),
        },
        cleanupManager
      )
    })
  })
})
