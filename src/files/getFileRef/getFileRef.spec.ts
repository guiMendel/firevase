import { getStorage, ref } from 'firebase/storage'
import { Mock } from 'vitest'
import { getFileRef } from './getFileRef'

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  getStorage: vi.fn().mockReturnValue('storage'),
}))

const refMock = ref as Mock
const getStorageMock = getStorage as Mock

const fileName = 'fileName'
const resourceId = 'resourceId'
const resourcePath = 'resourcePath'
const fileRef = {}

describe('getFileRef', () => {
  beforeEach(() => {
    vi.resetAllMocks().restoreAllMocks()

    refMock.mockReturnValue(fileRef)
  })

  it('builds a ref with the correct path structure', () => {
    const returned = getFileRef({ fileName, resourceId, resourcePath })

    expect(returned).toBe(fileRef)
    expect(ref).toHaveBeenCalledWith(
      'storage',
      `${resourcePath}/${resourceId}/${fileName}`
    )
  })
})
