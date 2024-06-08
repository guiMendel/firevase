import { FirevaseClient } from '@/'
import { HalfResource } from '@/resources'
import { FilesFrom, PathsFrom } from '@/types'
import { getBlob } from 'firebase/storage'
import { getFileRef } from '../getFileRef'

export const downloadFile = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  source: HalfResource<C, P>,
  fileName: FilesFrom<C>[P][number]
) => {
  const storageRef = getFileRef({
    fileName,
    resourceId: source.id,
    resourcePath: source.resourcePath,
  })

  try {
    const blob = await getBlob(storageRef)

    return new File([blob], fileName)
  } catch {
    return undefined
  }
}
