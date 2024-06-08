import { FirevaseClient } from '@/'
import { HalfResource } from '@/resources'
import { FilesFrom, PathsFrom } from '@/types'
import { deleteObject } from 'firebase/storage'
import { getFileRef } from '../getFileRef'
import { firevaseEvents } from '@/events'

export const deleteFile = <C extends FirevaseClient, P extends PathsFrom<C>>(
  source: HalfResource<C, P>,
  fileName: FilesFrom<C>[P][number]
) => {
  const storageRef = getFileRef({
    fileName,
    resourceId: source.id,
    resourcePath: source.resourcePath,
  })

  const promise = deleteObject(storageRef)

  promise.then(() => firevaseEvents.emit('fileUploaded', storageRef, undefined))

  return promise
}
