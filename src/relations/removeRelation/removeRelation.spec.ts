import { mockFantasyDatabase } from '@/tests/mock/backend'
import {
  fantasyVase,
  mockKing,
  mockKnight,
  mockLand,
} from '@/tests/mock/fantasyVase'
import { forceRemoveRelation, removeRelation } from '.'
import { getRelation } from '..'
import * as UpdateResourceNamespace from '@/resources/functions/updateResource'
import * as FirebaseNamespace from 'firebase/firestore'

const deleteDoc = FirebaseNamespace.deleteDoc

const updateResource = UpdateResourceNamespace.updateResource

describe('removeRelation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should raise if trying to remove has-many or many-to-many without a target', () => {
    mockFantasyDatabase({})

    const callback = () =>
      // @ts-ignore
      removeRelation(fantasyVase, mockKing(), 'lands')

    expect(callback).toThrow('without providing a target')
  })

  describe('for has-one', () => {
    it('when not force, should raise if trying to remove a protected relation', async () => {
      mockFantasyDatabase({})

      const callback = async () =>
        // @ts-ignore
        removeRelation(fantasyVase, mockKnight(), 'king')

      await expect(callback).rejects.toThrow(
        'Attempt to remove protected relation'
      )
    })

    it('when force, should successfully remove even protected relations', async () => {
      const kingId = '1'
      const knightId = '2'

      const { requireDatabaseValue } = mockFantasyDatabase({
        kings: { [kingId]: mockKing('uploadable') },

        knights: {
          [knightId]: mockKnight('uploadable', { kingId }),
        },
      })

      const knight = await requireDatabaseValue('knights', knightId)

      await expect(
        getRelation(fantasyVase, knight, 'king')
      ).resolves.toBeDefined()

      await forceRemoveRelation(fantasyVase, knight, 'king')

      await expect(
        getRelation(
          fantasyVase,
          await requireDatabaseValue('knights', knightId),
          'king'
        )
      ).resolves.toBeUndefined()
    })

    it("should ignore relations that don't exist", async () => {
      const mockUpdateResource = vi
        .spyOn(UpdateResourceNamespace, 'updateResource')
        .mockImplementation(updateResource)

      const kingId = '1'
      const landId = '2'

      const { requireDatabaseValue } = mockFantasyDatabase({
        kings: { [kingId]: mockKing('uploadable') },

        lands: { [landId]: mockLand('uploadable', { kingId: undefined }) },
      })

      const land = await requireDatabaseValue('lands', landId)

      await expect(
        getRelation(fantasyVase, land, 'ruler')
      ).resolves.toBeUndefined()

      await removeRelation(fantasyVase, land, 'ruler')

      expect(mockUpdateResource).not.toHaveBeenCalled()
    })
  })

  describe('for has-many', () => {
    it('when not force, should raise if trying to remove a relation with an opposite protected relation', async () => {
      mockFantasyDatabase({})

      const callback = async () =>
        // @ts-ignore
        removeRelation(fantasyVase, mockKing(), 'knights', [mockKnight()])

      await expect(callback).rejects.toThrow(
        'which would violate protected relation'
      )
    })

    it('when force, should successfully remove a relation event if it has an opposite protected relation', async () => {
      const kingId = '1'
      const knightId = '2'

      const { requireDatabaseValue } = mockFantasyDatabase({
        kings: { [kingId]: mockKing('uploadable') },

        knights: {
          [knightId]: mockKnight('uploadable', { kingId }),
        },
      })

      const king = await requireDatabaseValue('kings', kingId)

      await expect(
        getRelation(fantasyVase, king, 'knights')
      ).resolves.toHaveLength(1)

      await forceRemoveRelation(fantasyVase, king, 'knights', [
        await requireDatabaseValue('knights', knightId),
      ])

      await expect(
        getRelation(
          fantasyVase,
          await requireDatabaseValue('kings', kingId),
          'knights'
        )
      ).resolves.toHaveLength(0)
    })

    it("should ignore relations that don't exist", async () => {
      const mockUpdateResource = vi
        .spyOn(UpdateResourceNamespace, 'updateResource')
        .mockImplementation(updateResource)

      const kingId = '1'
      const landId = '2'

      const { requireDatabaseValue } = mockFantasyDatabase({
        kings: { [kingId]: mockKing('uploadable') },

        lands: { [landId]: mockLand('uploadable', { kingId: undefined }) },
      })

      const king = await requireDatabaseValue('kings', kingId)

      await expect(
        getRelation(fantasyVase, king, 'lands')
      ).resolves.toHaveLength(0)

      await removeRelation(fantasyVase, king, 'lands', 'all')

      expect(mockUpdateResource).not.toHaveBeenCalled()
    })

    it('should remove all relations when target is "all"', async () => {
      const kingId = '1'
      const landIdA = '2'
      const landIdB = '3'

      const { requireDatabaseValue } = mockFantasyDatabase({
        kings: { [kingId]: mockKing('uploadable') },

        lands: {
          [landIdA]: mockLand('uploadable', { kingId }),
          [landIdB]: mockLand('uploadable', { kingId }),
        },
      })

      const king = await requireDatabaseValue('kings', kingId)

      await expect(
        getRelation(fantasyVase, king, 'lands')
      ).resolves.toHaveLength(2)

      await removeRelation(fantasyVase, king, 'lands', 'all')

      await expect(
        getRelation(fantasyVase, king, 'lands')
      ).resolves.toHaveLength(0)
    })
  })

  describe('for many-to-many', () => {
    it("should remove relations but ignore relations that don't exist", async () => {
      const mockDeleteDoc = vi
        .spyOn(FirebaseNamespace, 'deleteDoc')
        .mockImplementation(deleteDoc)

      const knightId = '1'
      const landId = '2'
      const otherLandId = '3'

      const relationId = '4'

      const { requireDatabaseValue, indexDatabaseValues } = mockFantasyDatabase(
        {
          knights: { [knightId]: mockKnight('uploadable') },

          lands: {
            [landId]: mockLand('uploadable'),
            [otherLandId]: mockLand('uploadable'),
          },

          knightsLands: {
            [relationId]: { knights: knightId, lands: landId },
          },
        }
      )

      const knight = await requireDatabaseValue('knights', knightId)

      await expect(
        getRelation(fantasyVase, knight, 'supervisedLands')
      ).resolves.toHaveLength(1)

      const lands = await indexDatabaseValues('lands')

      expect(lands).toHaveLength(2)

      expect(mockDeleteDoc).not.toHaveBeenCalled()

      await removeRelation(fantasyVase, knight, 'supervisedLands', lands)

      await expect(
        getRelation(fantasyVase, knight, 'supervisedLands')
      ).resolves.toHaveLength(0)

      expect(mockDeleteDoc).toHaveBeenCalledOnce()

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        FirebaseNamespace.doc(
          FirebaseNamespace.collection(fantasyVase.db, 'knightsLands'),
          relationId
        )
      )
    })

    it('should remove all relations when target is "all"', async () => {
      const knightId = '1'
      const landIdA = '2'
      const landIdB = '3'

      const { requireDatabaseValue } = mockFantasyDatabase({
        knights: { [knightId]: mockKnight('uploadable') },

        lands: {
          [landIdA]: mockLand('uploadable'),
          [landIdB]: mockLand('uploadable'),
        },

        knightsLands: {
          [4]: { knights: knightId, lands: landIdA },
          [5]: { knights: knightId, lands: landIdB },
        },
      })

      const knight = await requireDatabaseValue('knights', knightId)

      await expect(
        getRelation(fantasyVase, knight, 'supervisedLands')
      ).resolves.toHaveLength(2)

      await removeRelation(fantasyVase, knight, 'supervisedLands', 'all')

      await expect(
        getRelation(fantasyVase, knight, 'supervisedLands')
      ).resolves.toHaveLength(0)
    })
  })
})
