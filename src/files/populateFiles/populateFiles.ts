import { CleanupManager } from '@/classes/CleanupManager'
import { fileRef } from '@/classes/FileFetcher'
import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import { getFileRef } from '../getFileRef'
import { FilesRefs } from '../types'

type PopulateFilesParams<C extends FirevaseClient, P extends PathsFrom<C>> = {
  client: C
  resourcePath: P
  resourceId: string
  cleanupManager: CleanupManager
}

export const populateFiles = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>({
  client,
  resourcePath,
  resourceId,
  cleanupManager,
}: PopulateFilesParams<C, P>): FilesRefs<C, P> => {
  const fileNames = client.fileSettings?.[resourcePath] as string[] | undefined

  if (!fileNames) return {} as FilesRefs<C, P>

  /** Gets the target for a fiven file name */
  const getFileTarget = (fileName: string) =>
    getFileRef({ fileName, resourceId, resourcePath: resourcePath as string })

  return fileNames.reduce(
    (files, fileName) => ({
      ...files,
      [fileName]: fileRef(getFileTarget(fileName), cleanupManager),
    }),
    {} as FilesRefs<C, P>
  )
}
