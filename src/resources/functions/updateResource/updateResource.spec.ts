import {
  RealDate,
  applyDateMock,
  mockFantasyDatabase,
} from '@/tests/mock/backend'

import { db } from '@/api/firebase'
import { collection, updateDoc } from 'firebase/firestore'
import { updateResource } from '.'
import { Knight, fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'

describe('updateResource', () => {
  beforeEach(applyDateMock)

  it('should not upload password, createdAt or id, and correctly update the modifiedAt property', async () => {
    mockFantasyDatabase({})

    const properties = {
      count: 10,
      id: '25',
      name: 'shaggy',
      password: '123',
      createdAt: new RealDate(1999, 6),
      modifiedAt: new RealDate(1999, 6),
    }

    const realId = '1'

    await updateResource(fantasyVase, 'knights', realId, properties)

    expect(updateDoc).toHaveBeenCalledWith(
      { id: realId, path: collection(db, 'knights') },
      {
        count: properties.count,
        name: properties.name,
        modifiedAt: new Date().toJSON(),
      }
    )
  })

  it('should update the doc with the provided properties', async () => {
    const originalProperties = {
      gold: 1,
      name: 'Scooby',
    }

    const newProperties = {
      gold: 10,
      name: 'Shaggy',
    }

    const id = '1'

    const { requireDatabaseValue } = mockFantasyDatabase({
      knights: { [id]: mockKnight('uploadable', originalProperties) },
    })

    await updateResource(fantasyVase, 'knights', id, newProperties)

    await expect(requireDatabaseValue('knights', id)).resolves.toStrictEqual(
      expect.objectContaining(newProperties)
    )
  })

  it('should set the properties when overwrite is true', async () => {
    const originalProperties = {
      name: 'Scooby',
      gold: 20,
    }

    const newProperties = {
      gold: 5,
    } as unknown as Knight

    const id = '1'

    const { requireDatabaseValue } = mockFantasyDatabase({
      knights: { [id]: mockKnight('uploadable', originalProperties) },
    })

    await updateResource(fantasyVase, 'knights', id, newProperties, {
      overwrite: true,
    })

    const result = await requireDatabaseValue('knights', id)

    expect(result).toStrictEqual(expect.objectContaining(newProperties))

    expect(result!.name).not.toBeDefined()
  })
})
