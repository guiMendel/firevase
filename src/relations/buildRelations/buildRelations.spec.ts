import { createDatabase, mockFantasyDatabase } from '@/tests/mock/backend'

import { FirevaseClient } from '@/'
import * as SyncableRefNamespace from '@/classes/Syncable'
import { HalfResource, Resource } from '@/resources'
import {
  cleanupManagerInterceptor,
  interceptCleanupManagers,
} from '@/tests/helpers'
import {
  FantasyVase,
  fantasyVase,
  mockKing,
  mockKnight,
  mockLand,
} from '@/tests/mock/fantasyVase'
import * as CleanupManagerNamespace from '@/classes/CleanupManager'
import { toValue } from 'vue'
import { buildRelations } from '.'

const sorted = (array: HalfResource<FirevaseClient, string>[]) =>
  array.sort((a, b) => parseFloat(a.id) - parseFloat(b.id))

describe('buildRelations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('raises if there are no relation settings', () => {
    const client = {
      relationSettings: undefined,
    } as FirevaseClient

    const callback = () =>
      buildRelations({
        cleanupManager: new CleanupManagerNamespace.CleanupManager(),
        client,
        previousValues: {},
        source: {},
        resourceLayersLimit: 1,
      })

    expect(callback).toThrow('client has no relation settings')
  })

  describe('extracting relations', () => {
    it('should set the dont dispose flag', () => {
      mockFantasyDatabase({})

      const source = mockKnight()

      buildRelations({
        cleanupManager: new CleanupManagerNamespace.CleanupManager(),
        client: fantasyVase,
        previousValues: { [source.id]: source },
        resourceLayersLimit: 1,
        source,
      })

      expect(source).toHaveProperty('dontDispose', true)
    })

    it('should raise if the previous value lacks a relation from the relation settings', () => {
      mockFantasyDatabase({})

      const source = mockKnight()

      // @ts-ignore
      delete source.king

      const callback = () =>
        buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: { [source.id]: source },
          resourceLayersLimit: 1,
          source,
        })

      expect(callback).toThrow('Falha ao extrair a relacao')
    })

    it('should extract the relation values from a previous resource', () => {
      mockFantasyDatabase({})

      const source = mockKnight('half-resource')

      const previous = mockKnight('resource', source)

      const relations = buildRelations({
        cleanupManager: new CleanupManagerNamespace.CleanupManager(),
        client: fantasyVase,
        previousValues: { [previous.id]: previous },
        resourceLayersLimit: 1,
        source,
      })

      expect(relations).toStrictEqual({
        king: previous.king,
        missions: previous.missions,
        supervisedLands: previous.supervisedLands,
      })
    })
  })

  describe('creating relations', () => {
    describe('has-one', () => {
      it('should properly create has-one relation', async () => {
        const kingId = '1'
        const knightId = '2'

        const { requireDatabaseValue } = mockFantasyDatabase({
          knights: { [knightId]: mockKnight('uploadable', { kingId }) },

          kings: { [kingId]: mockKing('uploadable') },
        })

        const source = await requireDatabaseValue('knights', knightId)
        const king = await requireDatabaseValue('kings', kingId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit: 1,
          source,
        })

        expect(relations.king.value).toStrictEqual(king)
      })

      it('should return a has-one ref that updates properly', async () => {
        const landId = '1'
        const rulerIdA = '2'

        // No relation yet
        const {
          requireDatabaseValue,
          updateDatabaseValue,
          addDatabaseValue,
          deleteDatabaseValue,
        } = mockFantasyDatabase({
          lands: { [landId]: mockLand('uploadable', { kingId: undefined }) },
        })

        const source = await requireDatabaseValue('lands', landId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit: 1,
          source,
        })

        expect(relations.ruler.value).toStrictEqual(undefined)

        // Add a relation
        await updateDatabaseValue('lands', landId, { kingId: rulerIdA })

        expect(relations.ruler.value).toStrictEqual(undefined)

        await updateDatabaseValue('kings', rulerIdA, mockKing('uploadable'))

        const kingA = await requireDatabaseValue('kings', rulerIdA)

        expect(relations.ruler.value).toStrictEqual(kingA)

        // Update relation target's properties
        kingA.age = 9999

        expect(relations.ruler.value).not.toStrictEqual(kingA)

        await updateDatabaseValue('kings', rulerIdA, { age: kingA.age })

        expect(relations.ruler.value).toStrictEqual(kingA)

        // Change relation target
        const { id: rulerIdB } = await addDatabaseValue(
          'kings',
          mockKing('uploadable')
        )

        await updateDatabaseValue('lands', landId, { kingId: rulerIdB })

        const kingB = await requireDatabaseValue('kings', rulerIdB)

        expect(relations.ruler.value).toStrictEqual(kingB)

        // Delete relation target
        await deleteDatabaseValue('kings', rulerIdB)

        expect(relations.ruler.value).toBeUndefined()
      })

      it('should pass the correct params to syncable ref', () => {
        const mockSyncableRef = vi.fn().mockReturnValue({
          fetcher: {
            getCleanupManager: () =>
              new CleanupManagerNamespace.CleanupManager(),
            onDispose: vi.fn(),
            onBeforeFetchTrigger: vi.fn(),
          },
        })

        vi.spyOn(SyncableRefNamespace, 'syncableRef').mockImplementation(
          mockSyncableRef
        )

        mockFantasyDatabase({})

        const resourceLayersLimit = 1

        buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit,
          source: mockKnight('half-resource'),
        })

        expect(mockSyncableRef).toHaveBeenCalledTimes(3)
        expect(mockSyncableRef).toHaveBeenCalledWith(
          fantasyVase,
          'kings',
          'empty-document',
          expect.anything(),
          { resourceLayersLimit: resourceLayersLimit - 1 }
        )
      })

      it('should dispose bridge and ref syncs when parent cleanup manager disposes', () => {
        // Removes all relations but the has-one king of a knight for better control
        const vase = fantasyVase.configureRelations(({ hasOne }) => ({
          knights: {
            king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
          },
        }))

        // Store each cleanup manager construction
        const parentCleanupManager = cleanupManagerInterceptor()
        const bridgeCleanup = cleanupManagerInterceptor()
        const refCleanup = cleanupManagerInterceptor()

        vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockImplementation(
          interceptCleanupManagers(
            parentCleanupManager,
            bridgeCleanup,
            refCleanup
          )
        )

        // Create the parent
        new CleanupManagerNamespace.CleanupManager()

        if (parentCleanupManager.value == undefined)
          throw new Error('Failed to store cleanup managers')

        mockFantasyDatabase({})

        buildRelations({
          cleanupManager: parentCleanupManager.value!,
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: mockKnight('half-resource'),
        })

        if (bridgeCleanup.value == undefined || refCleanup.value == undefined)
          throw new Error('Failed to store cleanup managers')

        const countCleanup = vi.fn()

        bridgeCleanup.value.onDispose(countCleanup)
        refCleanup.value.onDispose(countCleanup)

        expect(countCleanup).toHaveBeenCalledTimes(0)

        parentCleanupManager.value.dispose()

        expect(countCleanup).toHaveBeenCalledTimes(2)
      })

      it('should dispose bridge when ref disposes', () => {
        // Removes all relations but the has-one king of a knight for better control
        const vase = fantasyVase.configureRelations(({ hasOne }) => ({
          knights: {
            king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
          },
        }))

        // Store each cleanup manager construction
        const bridgeCleanup = cleanupManagerInterceptor()

        vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockImplementation(
          interceptCleanupManagers(
            cleanupManagerInterceptor(),
            bridgeCleanup,
            cleanupManagerInterceptor()
          )
        )

        mockFantasyDatabase({})

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: mockKnight('half-resource'),
        })

        if (bridgeCleanup.value == undefined)
          throw new Error('Failed to store cleanup managers')

        const bridgeDispose = vi.fn()

        bridgeCleanup.value.onDispose(bridgeDispose)

        expect(bridgeDispose).toHaveBeenCalledTimes(0)

        relations.king.fetcher.dispose()

        expect(bridgeDispose).toHaveBeenCalledOnce()
      })
    })

    describe('has-many', () => {
      it('should properly create relation', async () => {
        const kingId = '1'
        const knightIdA = '2'
        const knightIdB = '3'

        const { requireDatabaseValue, indexDatabaseValues } =
          mockFantasyDatabase({
            knights: {
              [knightIdA]: mockKnight('uploadable', { kingId }),
              [knightIdB]: mockKnight('uploadable', { kingId }),
              [4]: mockKnight('uploadable', {
                kingId: (parseInt(kingId) + 1).toString(),
              }),
            },

            kings: { [kingId]: mockKing('uploadable') },
          })

        const source = await requireDatabaseValue('kings', kingId)
        const allKnights = await indexDatabaseValues('knights')
        const knights = allKnights.filter(
          ({ kingId: currentKingId }) => currentKingId === kingId
        )

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit: 1,
          source,
        })

        expect(relations.knights.value).not.toStrictEqual(
          allKnights.map((knight) => knight)
        )

        expect(relations.knights.value).toStrictEqual(
          knights.map((knight) => knight)
        )
      })

      it('should return a has-many ref that updates properly', async () => {
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          kings: {
            lands: hasMany('lands', { relationKey: 'kingId' }),
          },
        }))

        const kingId = '1'
        const landIdA = '2'

        // No relations
        const {
          requireDatabaseValue,
          updateDatabaseValue,
          addDatabaseValue,
          deleteDatabaseValue,
        } = mockFantasyDatabase({
          lands: {
            [landIdA]: mockLand('uploadable', { kingId: undefined }),
          },

          kings: { [kingId]: mockKing('uploadable') },
        })

        const king = await requireDatabaseValue('kings', kingId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: king,
        })

        expect(relations.lands.value).toStrictEqual([])

        // Add an existing item to the relation
        await updateDatabaseValue('lands', landIdA, { kingId })

        const landA = await requireDatabaseValue('lands', landIdA)

        expect(relations.lands.value).toStrictEqual([landA])

        // Add a new item to the relation
        const { id: landIdB } = await addDatabaseValue(
          'lands',
          mockLand('uploadable', { kingId })
        )

        const landB = await requireDatabaseValue('lands', landIdB)

        expect(sorted(relations.lands.value)).toStrictEqual(
          sorted([landA, landB])
        )

        // Mutate an item of the array
        landA.name = 'Shangri-la'

        await updateDatabaseValue('lands', landIdA, { name: landA.name })

        expect(sorted(relations.lands.value)).toStrictEqual(
          sorted([landA, landB])
        )

        // Remove an item from the relation
        await updateDatabaseValue('lands', landIdA, {
          kingId: (parseInt(kingId) + 1).toString(),
        })

        expect(relations.lands.value).toStrictEqual([landB])

        // Delete an item in the relation
        await deleteDatabaseValue('lands', landIdB)

        expect(relations.lands.value).toStrictEqual([])
      })

      it('should pass the correct params to syncable ref', () => {
        const mockSyncableRef = vi.fn().mockReturnValue({
          fetcher: {
            onDispose: vi.fn(),
            getCleanupManager: () =>
              new CleanupManagerNamespace.CleanupManager(),
            onBeforeFetchTrigger: vi.fn(),
          },
        })

        vi.spyOn(SyncableRefNamespace, 'syncableRef').mockImplementation(
          mockSyncableRef
        )

        mockFantasyDatabase({})

        const resourceLayersLimit = 1

        buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit,
          source: mockKing('half-resource'),
        })

        expect(mockSyncableRef).toHaveBeenCalledTimes(2)
        expect(mockSyncableRef).toHaveBeenCalledWith(
          fantasyVase,
          'lands',
          expect.anything(),
          expect.anything(),
          { resourceLayersLimit: resourceLayersLimit - 1 }
        )
      })

      it('should dispose ref sync when parent cleanup manager disposes', () => {
        // Removes all relations but the has-one king of a knight for better control
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          kings: {
            lands: hasMany('lands', { relationKey: 'kingId' }),
          },
        }))

        // Store each cleanup manager construction
        const parentCleanupManager = cleanupManagerInterceptor()
        const refCleanup = cleanupManagerInterceptor()

        vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockImplementation(
          interceptCleanupManagers(parentCleanupManager, refCleanup)
        )

        // Create the parent
        new CleanupManagerNamespace.CleanupManager()

        if (parentCleanupManager.value == undefined)
          throw new Error('Failed to store cleanup managers')

        mockFantasyDatabase({})

        buildRelations({
          cleanupManager: parentCleanupManager.value!,
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: mockKing('half-resource'),
        })

        if (refCleanup.value == undefined)
          throw new Error('Failed to store cleanup managers')

        const countCleanup = vi.fn()

        refCleanup.value.onDispose(countCleanup)

        expect(countCleanup).toHaveBeenCalledTimes(0)

        parentCleanupManager.value.dispose()

        expect(countCleanup).toHaveBeenCalledTimes(1)
      })
    })

    describe('many-to-many', () => {
      it('should properly create relation', async () => {
        const landId = '1'
        const knightIdA = '2'
        const knightIdB = '3'
        const nonMemberKnightId = '4'

        const { requireDatabaseValue, indexDatabaseValues } =
          mockFantasyDatabase({
            knights: {
              [knightIdA]: mockKnight('uploadable'),
              [knightIdB]: mockKnight('uploadable'),
              [nonMemberKnightId]: mockKnight('uploadable'),
            },

            lands: { [landId]: mockLand('uploadable') },

            knightsLands: {
              [5]: { knights: knightIdA, lands: landId },
              [6]: { knights: knightIdB, lands: landId },
            },
          })

        const source = await requireDatabaseValue('lands', landId)
        const allKnights = await indexDatabaseValues('knights')
        const knights = allKnights.filter(({ id }) => id !== nonMemberKnightId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit: 1,
          source,
        })

        expect(relations.supervisors.value).not.toStrictEqual(
          allKnights.map((knight) => knight)
        )

        expect(relations.supervisors.value).toStrictEqual(
          knights.map((knight) => knight)
        )
      })

      it('should return many-to-many refs that update correctly', async () => {
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          lands: {
            supervisors: hasMany('knights', {
              manyToManyTable: 'knightsLands',
            }),
          },
        }))

        const landId = '1'
        const knightIdA = '2'

        const {
          requireDatabaseValue,
          updateDatabaseValue,
          deleteDatabaseValue,
          addDatabaseValue,
        } = mockFantasyDatabase({
          knights: {
            [knightIdA]: mockKnight('uploadable'),
          },

          lands: { [landId]: mockLand('uploadable') },
        })

        // No relations
        const land = await requireDatabaseValue('lands', landId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: land,
        })

        expect(relations.supervisors.value).toStrictEqual([])

        // Add items to the relation
        const { id: relationToRemoveId } = await addDatabaseValue(
          'knightsLands',
          {
            knights: knightIdA,
            lands: landId,
          }
        )

        const knightA = await requireDatabaseValue('knights', knightIdA)

        expect(relations.supervisors.value).toStrictEqual([knightA])

        const { id: knightIdB } = await addDatabaseValue(
          'knights',
          mockKnight('uploadable')
        )

        await addDatabaseValue('knightsLands', {
          knights: knightIdB,
          lands: landId,
        })

        const knightB = await requireDatabaseValue('knights', knightIdB)

        expect(sorted(relations.supervisors.value)).toStrictEqual(
          sorted([knightA, knightB])
        )

        // Mutate an item of the array
        knightA.name = 'Shakarron Makarron'

        await updateDatabaseValue('knights', knightIdA, { name: knightA.name })

        expect(sorted(relations.supervisors.value)).toStrictEqual(
          sorted([knightA, knightB])
        )

        // Remove an item from the relation
        await deleteDatabaseValue('knightsLands', relationToRemoveId)

        expect(relations.supervisors.value).toStrictEqual([knightB])

        // Delete an item in the relation
        await deleteDatabaseValue('knights', knightIdB)

        expect(relations.supervisors.value).toStrictEqual([])
      })

      it('should pass the correct params to syncable ref', () => {
        const mockSyncableRef = vi.fn().mockReturnValue({
          fetcher: {
            onDispose: vi.fn(),
            getCleanupManager: () =>
              new CleanupManagerNamespace.CleanupManager(),
            onBeforeFetchTrigger: vi.fn(),
          },
        })

        vi.spyOn(SyncableRefNamespace, 'syncableRef').mockImplementation(
          mockSyncableRef
        )

        mockFantasyDatabase({})

        const resourceLayersLimit = 1

        buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit,
          source: mockLand('half-resource'),
        })

        expect(mockSyncableRef).toHaveBeenCalledTimes(2)
        expect(mockSyncableRef).toHaveBeenCalledWith(
          fantasyVase,
          'knights',
          'empty-query',
          expect.anything(),
          { resourceLayersLimit: resourceLayersLimit - 1 }
        )
      })

      it('should dispose bridge and ref syncs when parent cleanup manager disposes', () => {
        // Removes all relations but the has-one king of a knight for better control
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          lands: {
            supervisors: hasMany('knights', {
              manyToManyTable: 'knightsLands',
            }),
          },
        }))

        // Store each cleanup manager construction
        const parentCleanupManager = cleanupManagerInterceptor()
        const bridgeCleanup = cleanupManagerInterceptor()
        const refCleanup = cleanupManagerInterceptor()

        vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockImplementation(
          interceptCleanupManagers(
            parentCleanupManager,
            bridgeCleanup,
            refCleanup
          )
        )

        // Create the parent
        new CleanupManagerNamespace.CleanupManager()

        if (parentCleanupManager.value == undefined)
          throw new Error('Failed to store cleanup managers')

        mockFantasyDatabase({})

        buildRelations({
          cleanupManager: parentCleanupManager.value,
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: mockLand('half-resource'),
        })

        if (bridgeCleanup.value == undefined || refCleanup.value == undefined)
          throw new Error('Failed to store cleanup managers')

        const countCleanup = vi.fn()

        bridgeCleanup.value.onDispose(countCleanup)
        refCleanup.value.onDispose(countCleanup)

        expect(countCleanup).toHaveBeenCalledTimes(0)

        parentCleanupManager.value.dispose()

        expect(countCleanup).toHaveBeenCalledTimes(2)
      })

      it('should dispose bridge when ref disposes', () => {
        // Removes all relations but the has-one king of a knight for better control
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          lands: {
            supervisors: hasMany('knights', {
              manyToManyTable: 'knightsLands',
            }),
          },
        }))

        // Store each cleanup manager construction
        const bridgeCleanup = cleanupManagerInterceptor()

        vi.spyOn(CleanupManagerNamespace, 'CleanupManager').mockImplementation(
          interceptCleanupManagers(
            cleanupManagerInterceptor(),
            bridgeCleanup,
            cleanupManagerInterceptor()
          )
        )

        mockFantasyDatabase({})

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: mockLand('half-resource'),
        })

        if (bridgeCleanup.value == undefined)
          throw new Error('Failed to store cleanup managers')

        const bridgeDispose = vi.fn()

        bridgeCleanup.value.onDispose(bridgeDispose)

        expect(bridgeDispose).toHaveBeenCalledTimes(0)

        relations.supervisors.fetcher.dispose()

        expect(bridgeDispose).toHaveBeenCalledOnce()
      })

      it('should set hasLoaded flag and set value to empty array when bridge gets an empy snapshot', async () => {
        const vase = fantasyVase.configureRelations(({ hasMany }) => ({
          knights: {
            supervisedLands: hasMany('lands', {
              manyToManyTable: 'knightsLands',
            }),
          },
        }))

        const knightId = '1'

        const { requireDatabaseValue } = createDatabase(vase).init({
          knights: {
            [knightId]: mockKnight('uploadable'),
          },
        })

        const knight = await requireDatabaseValue('knights', knightId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: vase,
          previousValues: {},
          resourceLayersLimit: 1,
          source: knight,
        })

        expect(relations.supervisedLands.fetcher).toHaveProperty(
          'hasLoaded',
          false
        )

        relations.supervisedLands.value = [undefined as any]
        relations.supervisedLands.fetcher.trigger()

        expect(relations.supervisedLands.fetcher).toHaveProperty('hasLoaded', true)
        expect(relations.supervisedLands).toHaveProperty('value', [])
      })
    })
  })

  describe('resourceLayersLimit', () => {
    it('raises if resourceLayersLimit is 0', () => {
      const callback = () =>
        buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          source: mockKnight('half-resource'),
          resourceLayersLimit: 0,
        })

      expect(callback).toThrow('resourceLayersLimit is 0')
    })

    it.each([1, 2, 3])(
      'returns correct number of relation layers when resourceLayersLimit is %s',
      async (layers) => {
        const kingId = '1'
        const knightId = '2'

        const { requireDatabaseValue } = mockFantasyDatabase({
          knights: { [knightId]: mockKnight('uploadable', { kingId }) },

          kings: { [kingId]: mockKing('uploadable') },
        })

        const source = await requireDatabaseValue('knights', knightId)

        const relations = buildRelations({
          cleanupManager: new CleanupManagerNamespace.CleanupManager(),
          client: fantasyVase,
          previousValues: {},
          resourceLayersLimit: layers,
          source,
        })

        const check = (
          value: Resource<FantasyVase, 'kings' | 'knights'>,
          remainingLayers: number
        ) => {
          if (value.resourcePath === 'kings') {
            const king = value as Resource<FantasyVase, 'kings'>

            if (remainingLayers === 1) {
              expect(toValue(king.knights)).toBeUndefined()
              return
            }

            expect(toValue(king.knights)).toBeDefined()

            check(toValue(king.knights)[0], remainingLayers - 1)

            return
          }
          const knight = value as Resource<FantasyVase, 'knights'>

          if (remainingLayers === 1) {
            expect(toValue(knight.king)).toBeUndefined()
            return
          }

          const king = toValue(knight.king)

          if (king == undefined) throw new Error('Database error')

          check(king, remainingLayers - 1)
        }

        if (relations.king.value == undefined) throw new Error('Database error')

        check(relations.king.value, layers)
      }
    )
  })
})
