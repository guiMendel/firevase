import { mockFantasyDatabase } from '@/tests/mock/backend'

import { CleanupManager } from '@/classes/CleanupManager'
import { fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'
import { where } from 'firebase/firestore'
import { getResourceGetter } from '.'
import * as MakeResourceNamespace from '../makeResource'

describe('getResourceGetter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('should get the appropriate value', async () => {
      const id = '1'

      const { requireDatabaseValue } = mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const { get } = getResourceGetter(fantasyVase, 'knights')

      await expect(get(id)).resolves.toStrictEqual(
        await requireDatabaseValue('knights', id)
      )
    })

    it('passes the correct params to make full resource', async () => {
      const mockMakeResource = vi.fn().mockReturnValue([])

      vi.spyOn(MakeResourceNamespace, 'makeResource').mockImplementation(
        mockMakeResource
      )

      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const cleanupManager = new CleanupManager()

      const resourceLayersLimit = 1

      const { get } = getResourceGetter(fantasyVase, 'knights', {
        cleanupManager,
        resourceLayersLimit,
      })

      await get(id)

      expect(mockMakeResource).toHaveBeenCalledWith(
        fantasyVase,
        expect.objectContaining({ id }),
        'knights',
        resourceLayersLimit,
        cleanupManager,
        []
      )
    })
  })

  describe('getList', () => {
    it('with no filters should get all the docs', async () => {
      const { indexDatabaseValues } = mockFantasyDatabase({
        knights: {
          '1': mockKnight('uploadable'),
          '2': mockKnight('uploadable'),
        },
      })

      const { getList } = getResourceGetter(fantasyVase, 'knights')

      await expect(getList()).resolves.toStrictEqual(
        await indexDatabaseValues('knights')
      )
    })

    it('should appropriately filter the docs', async () => {
      const { indexDatabaseValues } = mockFantasyDatabase({
        knights: {
          '1': mockKnight('uploadable', { name: 'Lancelot' }),
          '2': mockKnight('uploadable'),
        },
      })

      const { getList } = getResourceGetter(fantasyVase, 'knights')

      const expectedResult = (await indexDatabaseValues('knights')).filter(
        ({ name }) => name === 'Lancelot'
      )

      const list = await getList({ query: [where('name', '==', 'Lancelot')] })

      expect(list).toStrictEqual(expectedResult)
      expect(list).not.toStrictEqual(await indexDatabaseValues('knights'))
    })

    it('passes the correct params to make full instance', async () => {
      const mockMakeResource = vi.fn().mockReturnValue([])

      vi.spyOn(MakeResourceNamespace, 'makeResource').mockImplementation(
        mockMakeResource
      )

      const id = '1'

      mockFantasyDatabase({
        knights: { [id]: mockKnight('uploadable') },
      })

      const cleanupManager = new CleanupManager()

      const resourceLayersLimit = 1

      const { getList } = getResourceGetter(fantasyVase, 'knights', {
        cleanupManager,
        resourceLayersLimit,
      })

      await getList()

      expect(mockMakeResource).toHaveBeenCalledWith(
        fantasyVase,
        { docs: [expect.objectContaining({ id })] },
        'knights',
        resourceLayersLimit,
        cleanupManager,
        []
      )
    })
  })
})
