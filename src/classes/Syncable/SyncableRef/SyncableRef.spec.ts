import { createDatabase, mockFantasyDatabase } from '@/tests/mock/backend'

import { CleanupManager } from '@/classes/CleanupManager'
import * as BuildRelationNamespace from '@/relations/buildRelations'
import { Resource } from '@/resources'
import {
  FantasyVase,
  fantasyVase,
  mockKing,
  mockKnight,
} from '@/tests/mock/fantasyVase'
import { DocumentReference, collection, doc, query } from 'firebase/firestore'
import { toRaw, toValue } from 'vue'
import * as SyncableRefNamespace from '.'
import * as SyncableNamespace from '../Syncable'

const syncableRef = SyncableRefNamespace.syncableRef
const buildRelations = BuildRelationNamespace.buildRelations

describe('SyncableRef', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('should pass undefined to Syncable when target is empty', () => {
    it.each(['empty-document', 'empty-query'] as const)('for %s', (target) => {
      const MockSyncable = vi.fn().mockReturnValue({
        onReset: vi.fn(),
        onDispose: vi.fn(),
        onUpdateTarget: vi.fn(),
        onBeforeFetchTrigger: vi.fn(),
        getCleanupManager: () => new CleanupManager(),
      })

      vi.spyOn(SyncableNamespace, 'Syncable').mockImplementation(MockSyncable)

      expect(MockSyncable).not.toHaveBeenCalled()

      syncableRef(fantasyVase, 'knights', target, new CleanupManager())

      expect(MockSyncable).toHaveBeenCalledWith(undefined, expect.anything())
    })
  })

  describe('should provide correct initial value', () => {
    it.each([
      ['empty-document', undefined] as const,
      ['empty-query', []] as const,
    ])('for %s', (target, initialValue) => {
      const ogSyncable = SyncableNamespace.Syncable

      vi.spyOn(SyncableNamespace, 'Syncable').mockImplementation(((
        target: any,
        listener: any
      ) => {
        const syncable = new ogSyncable(target, listener)

        return {
          ...syncable,
          trigger: vi.fn(),
        }
      }) as any)

      const sync = syncableRef(
        fantasyVase,
        'knights',
        target,
        new CleanupManager()
      )

      expect(sync.value).toStrictEqual(initialValue)
    })
  })

  describe('disposing', () => {
    it('disposes cleanup manager when parent disposes', () => {
      const parentCleanup = new CleanupManager()

      const ref = syncableRef(
        fantasyVase,
        'knights',
        'empty-document',
        parentCleanup
      )

      const onDispose = vi.fn()

      ref.fetcher.getCleanupManager().onDispose(onDispose)

      expect(onDispose).not.toHaveBeenCalled()

      parentCleanup.dispose()

      expect(onDispose).toHaveBeenCalledOnce()
    })

    it('should dispose relation syncs when disposed', () => {
      const vase = fantasyVase.configureRelations(({ hasOne }) => ({
        knights: {
          king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
        },
      }))

      const id = '1'

      createDatabase(vase).init({
        knights: { [id]: mockKnight('uploadable') },
      })

      const knight = syncableRef(
        vase,
        'knights',
        doc(collection(fantasyVase.db, 'knights'), id),
        new CleanupManager()
      )

      if (knight.value == undefined) throw new Error('Database error')

      const onChildDispose = vi.fn()

      const kingCleanup = toRaw(knight.value).king.fetcher.getCleanupManager()

      kingCleanup.onDispose(onChildDispose)

      expect(onChildDispose).not.toHaveBeenCalled()

      knight.fetcher.dispose()

      expect(onChildDispose).toHaveBeenCalledOnce()
    })
  })

  describe('sets empty value when sync is reset', () => {
    it('for documents', () => {
      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const knight = syncableRef(
        fantasyVase,
        'knights',
        doc(collection(fantasyVase.db, 'knights'), id),
        new CleanupManager()
      )

      expect(knight.value).toBeDefined()

      knight.fetcher.reset()

      expect(knight.value).toBeUndefined()
    })

    it('for queries', () => {
      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const knights = syncableRef(
        fantasyVase,
        'knights',
        query(collection(fantasyVase.db, 'knights')),
        new CleanupManager()
      )

      expect(knights.value).not.toStrictEqual([])

      knights.fetcher.reset()

      expect(knights.value).toStrictEqual([])
    })
  })

  describe('syncing', () => {
    it('should call Syncable with correct target when non empty', () => {
      const MockSyncable = vi.fn().mockReturnValue({
        onReset: vi.fn(),
        onDispose: vi.fn(),
        onUpdateTarget: vi.fn(),
        onBeforeFetchTrigger: vi.fn(),
        getCleanupManager: () => new CleanupManager(),
      })

      const target = { scooby: 'doo' } as unknown as DocumentReference

      vi.spyOn(SyncableNamespace, 'Syncable').mockImplementation(MockSyncable)

      expect(MockSyncable).not.toHaveBeenCalled()

      syncableRef(fantasyVase, 'knights', target, new CleanupManager())

      expect(MockSyncable).toHaveBeenCalledWith(target, expect.anything())
    })

    it('only triggers the sync when you read the value', () => {
      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const knight = syncableRef(
        fantasyVase,
        'knights',
        doc(collection(fantasyVase.db, 'knights'), id),
        new CleanupManager()
      )

      expect(knight.fetcher.fetchState).not.toBe('fetched')

      knight.fetcher.getTarget()

      expect(knight.fetcher.fetchState).not.toBe('fetched')

      knight.value

      expect(knight.fetcher.fetchState).toBe('fetched')
    })

    describe('for documents', () => {
      it('syncs properly', async () => {
        const id = '1'

        const {
          updateDatabaseValue,
          requireDatabaseValue,
          deleteDatabaseValue,
        } = mockFantasyDatabase({})

        // Adding new values
        const knight = syncableRef(
          fantasyVase,
          'knights',
          doc(collection(fantasyVase.db, 'knights'), id),
          new CleanupManager(),
          { resourceLayersLimit: 0 }
        )

        expect(knight.value).toBeUndefined()

        await updateDatabaseValue('knights', id, mockKnight('uploadable'))

        expect(knight.value).toStrictEqual(
          await requireDatabaseValue('knights', id)
        )

        // Modifying values
        await updateDatabaseValue('knights', id, { gold: 9999 })

        expect(knight.value).toStrictEqual(
          await requireDatabaseValue('knights', id)
        )

        // Deleting values
        await deleteDatabaseValue('knights', id)

        expect(knight.value).toBeUndefined()
      })

      it("repurposes the old value's relations, so to avoid having to recreate them", async () => {
        const mockSyncableRef = vi
          .spyOn(SyncableRefNamespace, 'syncableRef')
          .mockImplementation(syncableRef)

        const mockBuildRelations = vi
          .spyOn(BuildRelationNamespace, 'buildRelations')
          .mockImplementation(buildRelations)

        const vase = fantasyVase.configureRelations(({ hasOne }) => ({
          knights: {
            king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
          },
        }))

        const id = '1'
        const kingId = '2'

        const { updateDatabaseValue } = createDatabase(vase).init({
          knights: {
            [id]: mockKnight('uploadable', { kingId }),
          },

          kings: {
            [kingId]: mockKing('uploadable'),
          },
        })

        const knight = syncableRef(
          vase,
          'knights',
          doc(collection(fantasyVase.db, 'knights'), id),
          new CleanupManager()
        )

        expect(mockSyncableRef).not.toHaveBeenCalled()
        expect(mockBuildRelations).not.toHaveBeenCalled()

        if (knight.value == undefined) throw new Error('Database error')

        expect(toValue(knight.value.king)).toBeDefined()

        expect(mockBuildRelations).toHaveBeenCalledOnce()
        expect(mockSyncableRef).toHaveBeenCalledOnce()

        await updateDatabaseValue('knights', id, { gold: 99999 })

        expect(mockBuildRelations).toHaveBeenCalledTimes(2)
        expect(mockSyncableRef).toHaveBeenCalledOnce()
      })
    })

    describe('for queries', () => {
      it('syncs properly', async () => {
        const {
          updateDatabaseValue,
          requireDatabaseValue,
          deleteDatabaseValue,
          addDatabaseValue,
        } = mockFantasyDatabase({})

        // Adding new values
        const knights = syncableRef(
          fantasyVase,
          'knights',
          query(collection(fantasyVase.db, 'knights')),
          new CleanupManager(),
          { resourceLayersLimit: 0 }
        )

        expect(knights.value).toHaveLength(0)

        const { id: knightIdA } = await addDatabaseValue(
          'knights',
          mockKnight('uploadable')
        )

        expect(knights.value).toStrictEqual([
          await requireDatabaseValue('knights', knightIdA),
        ])

        const { id: knightIdB } = await addDatabaseValue(
          'knights',
          mockKnight('uploadable')
        )

        expect(knights.value).toStrictEqual([
          await requireDatabaseValue('knights', knightIdA),
          await requireDatabaseValue('knights', knightIdB),
        ])

        // Modifying values
        await updateDatabaseValue('knights', knightIdB, { gold: 9999 })

        expect(knights.value).toStrictEqual([
          await requireDatabaseValue('knights', knightIdA),
          await requireDatabaseValue('knights', knightIdB),
        ])

        // Deleting values
        await deleteDatabaseValue('knights', knightIdA)

        expect(knights.value).toStrictEqual([
          await requireDatabaseValue('knights', knightIdB),
        ])

        await deleteDatabaseValue('knights', knightIdB)

        expect(knights.value).toStrictEqual([])
      })

      it("repurposes the old value's relations, so to avoid having to recreate them", async () => {
        const mockSyncableRef = vi
          .spyOn(SyncableRefNamespace, 'syncableRef')
          .mockImplementation(syncableRef)

        const mockBuildRelations = vi
          .spyOn(BuildRelationNamespace, 'buildRelations')
          .mockImplementation(buildRelations)

        const vase = fantasyVase.configureRelations(({ hasOne }) => ({
          knights: {
            king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
          },
        }))

        const id = '1'
        const kingId = '2'

        const { updateDatabaseValue } = createDatabase(vase).init({
          knights: {
            [id]: mockKnight('uploadable', { kingId }),
          },

          kings: {
            [kingId]: mockKing('uploadable'),
          },
        })

        const knights = syncableRef(
          vase,
          'knights',
          query(collection(fantasyVase.db, 'knights')),
          new CleanupManager()
        )

        expect(mockSyncableRef).not.toHaveBeenCalled()
        expect(mockBuildRelations).not.toHaveBeenCalled()

        expect(knights.value).toHaveLength(1)
        expect(toValue(knights.value[0].king)).toBeDefined()

        expect(mockBuildRelations).toHaveBeenCalledOnce()
        expect(mockSyncableRef).toHaveBeenCalledOnce()

        await updateDatabaseValue('knights', id, { gold: 99999 })

        expect(mockBuildRelations).toHaveBeenCalledTimes(2)
        expect(mockSyncableRef).toHaveBeenCalledOnce()
      })

      it('disposes of relations from query hits that are no longer present in a new snapshot', async () => {
        const vase = fantasyVase.configureRelations(({ hasOne }) => ({
          knights: {
            king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
          },
        }))

        const idA = '1'
        const idB = '2'
        const kingId = '3'

        const { deleteDatabaseValue } = createDatabase(vase).init({
          knights: {
            [idA]: mockKnight('uploadable', { kingId }),
            [idB]: mockKnight('uploadable', { kingId }),
          },

          kings: {
            [kingId]: mockKing('uploadable'),
          },
        })

        const knights = syncableRef(
          vase,
          'knights',
          query(collection(vase.db, 'knights')),
          new CleanupManager()
        )

        const onDispose = vi.fn()

        toRaw(knights.value)[1].king.fetcher.onDispose(onDispose)

        expect(onDispose).not.toHaveBeenCalled()

        await deleteDatabaseValue('knights', idB)

        expect(onDispose).toHaveBeenCalledOnce()
      })
    })
  })

  describe('returns correct number of relation layers for a given resourceLayersLimit', () => {
    it.each([0, 1, 2, 3])('when resourceLayersLimit is %s', async (layers) => {
      const kingId = '1'
      const knightId = '2'

      mockFantasyDatabase({
        knights: { [knightId]: mockKnight('uploadable', { kingId }) },

        kings: { [kingId]: mockKing('uploadable') },
      })

      const knight = syncableRef(
        fantasyVase,
        'knights',
        doc(collection(fantasyVase.db, 'knights'), knightId),
        new CleanupManager(),
        { resourceLayersLimit: layers }
      )

      if (knight.value == undefined) throw new Error('Database error')

      const check = (
        value: Resource<FantasyVase, 'kings' | 'knights'>,
        remainingLayers: number
      ) => {
        if (value.resourcePath === 'kings') {
          const king = value as Resource<FantasyVase, 'kings'>

          if (remainingLayers === 0) {
            expect(toValue(king.knights)).toBeUndefined()
            return
          }

          expect(toValue(king.knights)).toBeDefined()

          check(toValue(king.knights)[0], remainingLayers - 1)

          return
        }
        const knight = value as Resource<FantasyVase, 'knights'>

        if (remainingLayers === 0) {
          expect(toValue(knight.king)).toBeUndefined()
          return
        }

        const king = toValue(knight.king)

        if (king == undefined) throw new Error('Database error')

        check(king, remainingLayers - 1)
      }

      check(knight.value, layers)
    })
  })
})
