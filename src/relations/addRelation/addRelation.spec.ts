import { mockFantasyDatabase } from '@/tests/mock/backend'

import * as UpdateResourceNamespace from '@/resources/functions/updateResource'
import {
  fantasyVase,
  mockKing,
  mockKnight,
  mockLand,
} from '@/tests/mock/fantasyVase'
import * as FirestoreNamespace from 'firebase/firestore'
import { addRelation } from '.'
import { getRelation } from '..'

const updateResource = UpdateResourceNamespace.updateResource

const addDoc = FirestoreNamespace.addDoc

describe('addRelation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should raise if trying to add to a has-one', () => {
    mockFantasyDatabase({})

    const callback = () =>
      // @ts-ignore
      addRelation(fantasyVase, mockKnight(), 'king', mockKing())

    expect(callback).toThrow('Attempt to add to relation of type has-one')
  })

  it('for has-many, should only add relations that are not yet there', async () => {
    const mockUpdateResource = vi
      .spyOn(UpdateResourceNamespace, 'updateResource')
      .mockImplementation(updateResource)

    const kingId = '1'
    const knightIdA = '2'
    const knightIdB = '3'

    const { requireDatabaseValue, indexDatabaseValues } = mockFantasyDatabase({
      kings: { [kingId]: mockKing('uploadable') },

      knights: {
        [knightIdA]: mockKnight('uploadable', { kingId }),
        [knightIdB]: mockKnight('uploadable'),
      },
    })

    const king = await requireDatabaseValue('kings', kingId)

    const knights = await indexDatabaseValues('knights')

    expect(knights).toHaveLength(2)

    expect(await getRelation(fantasyVase, king, 'knights')).toHaveLength(1)

    expect(mockUpdateResource).not.toHaveBeenCalled()

    await addRelation(fantasyVase, king, 'knights', knights)

    expect(await getRelation(fantasyVase, king, 'knights')).toHaveLength(2)

    expect(mockUpdateResource).toHaveBeenCalledOnce()

    expect(mockUpdateResource).toHaveBeenCalledWith(
      fantasyVase,
      'knights',
      knightIdB,
      { kingId }
    )
  })

  it('for many-to-many, should only add relations that are not yet there', async () => {
    const mockAddDoc = vi
      .spyOn(FirestoreNamespace, 'addDoc')
      .mockImplementation(addDoc)

    const landId = '1'
    const knightIdA = '2'
    const knightIdB = '3'

    const { requireDatabaseValue, indexDatabaseValues } = mockFantasyDatabase({
      lands: { [landId]: mockLand('uploadable') },

      knights: {
        [knightIdA]: mockKnight('uploadable'),
        [knightIdB]: mockKnight('uploadable'),
      },

      knightsLands: {
        [4]: { knights: knightIdA, lands: landId },
      },
    })

    const land = await requireDatabaseValue('lands', landId)

    const knights = await indexDatabaseValues('knights')

    expect(knights).toHaveLength(2)

    expect(await getRelation(fantasyVase, land, 'supervisors')).toHaveLength(1)

    expect(mockAddDoc).not.toHaveBeenCalled()

    await addRelation(fantasyVase, land, 'supervisors', knights)

    expect(await getRelation(fantasyVase, land, 'supervisors')).toHaveLength(2)

    expect(mockAddDoc).toHaveBeenCalledOnce()

    expect(mockAddDoc).toHaveBeenCalledWith(
      FirestoreNamespace.collection(fantasyVase.db, 'knightsLands'),
      { knights: knightIdB, lands: landId }
    )
  })
})
