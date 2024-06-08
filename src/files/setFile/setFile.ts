import { FirevaseClient } from '@/'
import { HalfResource } from '@/resources'
import { FilesFrom, PathsFrom } from '@/types'
import { uploadBytes } from 'firebase/storage'
import { getFileRef } from '../getFileRef'
import { firevaseEvents } from '@/events'

export const setFile = <C extends FirevaseClient, P extends PathsFrom<C>>(
  source: HalfResource<C, P>,
  fileName: FilesFrom<C>[P][number],
  file: File
) => {
  const storageRef = getFileRef({
    fileName,
    resourceId: source.id,
    resourcePath: source.resourcePath,
  })

  const promise = uploadBytes(storageRef, file)

  promise.then(() => firevaseEvents.emit('fileUploaded', storageRef, file))

  return promise
}
