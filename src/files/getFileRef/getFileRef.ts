import { getStorage, ref } from 'firebase/storage'

const storage = getStorage()

type GetFileRefParams = {
  resourcePath: string
  resourceId: string
  fileName: string
}

export const getFileRef = ({
  fileName,
  resourceId,
  resourcePath,
}: GetFileRefParams) =>
  ref(storage, `${resourcePath}/${resourceId}/${fileName}`)
