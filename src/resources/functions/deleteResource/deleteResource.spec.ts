import { mockFantasyDatabase } from '@/tests/mock/backend'

import { deleteResourceRelations } from '@/events/listeners/deleteResourceRelations'
import { fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'
import { Mock } from 'vitest'
import { deleteResource } from '.'

vi.mock('@/events/listeners/deleteResourceRelations')

const mockDeleteResourceRelations = deleteResourceRelations as Mock

describe('deleteResource', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should erase the resource', async () => {
    const id = '1'

    const { getDatabaseValue, indexDatabaseValues } = mockFantasyDatabase({
      knights: {
        [id]: mockKnight('uploadable'),
      },
    })

    await expect(getDatabaseValue('knights', id)).resolves.toBeDefined()
    await expect(indexDatabaseValues('knights')).resolves.toHaveLength(1)

    await deleteResource(fantasyVase, 'knights', id)

    await expect(getDatabaseValue('knights', id)).resolves.not.toBeDefined()
    await expect(indexDatabaseValues('knights')).resolves.toHaveLength(0)
  })

  it('should make a call to remove all relations from the deleted resource', async () => {
    const knightId = '1'

    await deleteResource(fantasyVase, 'knights', knightId)

    expect(mockDeleteResourceRelations).toHaveBeenCalledWith(
      fantasyVase,
      'knights',
      knightId
    )
  })
})
