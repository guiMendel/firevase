import { applyDateMock, mockFantasyDatabase } from '@/tests/mock/backend'

import * as UpdateResourceNamespace from '@/resources/functions/updateResource'
import {
  fantasyVase,
  mockKing,
  mockKnight,
  mockLand,
} from '@/tests/mock/fantasyVase'
import * as FirestoreNamespace from 'firebase/firestore'
import { setRelation } from '.'
import { getRelation } from '..'

const updateResource = UpdateResourceNamespace.updateResource

const addDoc = FirestoreNamespace.addDoc

describe('setRelation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    applyDateMock()
  })

  describe('for has-one', () => {
    it('should raise if an array is provided', async () => {
      const callback = async () =>
        // @ts-ignore
        setRelation(fantasyVase, mockLand(), 'ruler', [mockKing()])

      await expect(callback).rejects.toThrow(
        'Attempt to assign an array to has-one relation'
      )
    })

    it('should raise if setting undefined to a protected relation', async () => {
      const callback = async () =>
        // @ts-ignore
        setRelation(fantasyVase, mockKnight(), 'king', undefined)

      await expect(callback).rejects.toThrow(
        'Attempt to assign undefined to protected relation'
      )
    })

    it('should properly  update the relation', async () => {
      const mockUpdateResource = vi
        .spyOn(UpdateResourceNamespace, 'updateResource')
        .mockImplementation(updateResource)

      const knightId = '1'
      const kingId = '2'
      const otherKingId = '3'

      const { requireDatabaseValue } = mockFantasyDatabase({
        knights: {
          [knightId]: mockKnight('uploadable', { kingId: otherKingId }),
        },

        kings: {
          [kingId]: mockKing('uploadable'),
          [otherKingId]: mockKing('uploadable'),
        },
      })

      const knight = await requireDatabaseValue('knights', knightId)

      const king = await requireDatabaseValue('kings', kingId)
      const otherKing = await requireDatabaseValue('kings', otherKingId)

      await expect(
        getRelation(fantasyVase, knight, 'king')
      ).resolves.toStrictEqual(otherKing)

      expect(mockUpdateResource).not.toHaveBeenCalled()

      await setRelation(fantasyVase, knight, 'king', king)

      await expect(
        getRelation(
          fantasyVase,
          await requireDatabaseValue('knights', knightId),
          'king'
        )
      ).resolves.toStrictEqual(king)

      expect(mockUpdateResource).toHaveBeenCalledOnce()
    })
  })

  describe('for has-many', () => {
    it('should raise if setting to a relation with a protected opposite relation', async () => {
      const callback = async () =>
        // @ts-ignore
        setRelation(fantasyVase, mockKing(), 'knights', [
          mockKnight(),
          mockKnight(),
        ])

      await expect(callback).rejects.toThrow(
        'which would violate protected relation'
      )
    })

    it('should correctly override the relations', async () => {
      const mockUpdateResource = vi
        .spyOn(UpdateResourceNamespace, 'updateResource')
        .mockImplementation(updateResource)

      const kingId = '2'

      const landIdA = '1'
      const landIdB = '2'
      const landIdC = '3'

      const { requireDatabaseValue, indexDatabaseValues } = mockFantasyDatabase(
        {
          lands: {
            [landIdA]: mockLand('uploadable', { kingId }),
            [landIdB]: mockLand('uploadable', { kingId }),
            [landIdC]: mockLand('uploadable'),
          },

          kings: {
            [kingId]: mockKing('uploadable'),
          },
        }
      )

      const lands = await indexDatabaseValues('lands')

      const king = await requireDatabaseValue('kings', kingId)

      await expect(
        getRelation(fantasyVase, king, 'lands')
      ).resolves.toStrictEqual(lands.slice(0, 2))

      expect(mockUpdateResource).not.toHaveBeenCalled()

      await setRelation(fantasyVase, king, 'lands', lands.slice(1))

      await expect(
        getRelation(fantasyVase, king, 'lands')
      ).resolves.toStrictEqual((await indexDatabaseValues('lands')).slice(1))
    })
  })

  it('for many-to-many, should correctly override the relations', async () => {
    const mockAddDoc = vi
      .spyOn(FirestoreNamespace, 'addDoc')
      .mockImplementation(addDoc)

    const knightId = '2'

    const landIdA = '1'
    const landIdB = '2'
    const landIdC = '3'

    const { requireDatabaseValue, indexDatabaseValues } = mockFantasyDatabase({
      lands: {
        [landIdA]: mockLand('uploadable'),
        [landIdB]: mockLand('uploadable'),
        [landIdC]: mockLand('uploadable'),
      },

      knights: {
        [knightId]: mockKnight('uploadable'),
      },

      knightsLands: {
        [4]: { knights: knightId, lands: landIdA },
        [5]: { knights: knightId, lands: landIdB },
      },
    })

    const lands = await indexDatabaseValues('lands')

    const knight = await requireDatabaseValue('knights', knightId)

    await expect(
      getRelation(fantasyVase, knight, 'supervisedLands')
    ).resolves.toStrictEqual(lands.slice(0, 2))

    expect(mockAddDoc).not.toHaveBeenCalled()

    await setRelation(fantasyVase, knight, 'supervisedLands', lands.slice(1))

    await expect(
      getRelation(fantasyVase, knight, 'supervisedLands')
    ).resolves.toStrictEqual(lands.slice(1))
  })
})
