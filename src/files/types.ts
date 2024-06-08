import { FirevaseClient } from '..'
import { FileRef } from '../classes/FileFetcher/FileRef'
import { FilesFrom, PathsFrom } from '../firevase/types'

export type FilesRefs<C extends FirevaseClient, P extends PathsFrom<C>> = {
  [file in FilesFrom<C>[P][number]]: FileRef
}
