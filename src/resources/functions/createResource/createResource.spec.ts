import {
  RealDate,
  applyDateMock,
  mockFantasyDatabase,
} from '@/tests/mock/backend'

import { db } from '@/api/firebase'
import { Knight, fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'
import { addDoc, collection } from 'firebase/firestore'
import { createResource } from '.'

describe('createResource', () => {
  beforeEach(applyDateMock)

  it('should not upload password or id, and should override modifiedAt and createdAt', () => {
    const properties = {
      count: 1,
      id: '1',
      name: 'scooby',
      password: '123',
      createdAt: new RealDate(1999, 6),
      modifiedAt: new RealDate(1999, 6),
    }

    createResource(fantasyVase, 'knights', properties as unknown as Knight)

    expect(addDoc).toHaveBeenCalledWith(collection(db, 'knights'), {
      count: properties.count,
      name: properties.name,
      createdAt: new Date().toJSON(),
      modifiedAt: new Date().toJSON(),
    })
  })

  it('should add the doc with the provided properties', async () => {
    const properties = {
      name: 'Sir Scooby',
      gold: 5,
    }

    const { requireDatabaseValue } = mockFantasyDatabase({})

    const { id } = await createResource(
      fantasyVase,
      'knights',
      mockKnight('uploadable', properties)
    )

    await expect(requireDatabaseValue('knights', id)).resolves.toStrictEqual(
      expect.objectContaining(properties)
    )
  })

  it('should use the id passed as second argument', async () => {
    const id = 'noice'

    const properties = {
      name: 'Sir Scooby',
      gold: 5,
    }

    const { requireDatabaseValue } = mockFantasyDatabase({})

    createResource(
      fantasyVase,
      'knights',
      mockKnight('uploadable', properties),
      id
    )

    await expect(requireDatabaseValue('knights', id)).resolves.toStrictEqual(
      expect.objectContaining(properties)
    )
  })
})
