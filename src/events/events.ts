import EventEmitter from 'eventemitter3'
import { FirevaseClient } from '..'
import { PathsFrom } from '../firevase/types'
import { StorageReference } from 'firebase/storage'

/** Maps event names to their listeners */
export type FirevaseEvents = {
  /** Triggered when a resource is removed from the backend */
  resourceRemoved: <C extends FirevaseClient, P extends PathsFrom<C>>(
    client: C,
    resourcePath: P,
    id: string
  ) => void

  /** Triggered when a file is successfully uploaded */
  fileUploaded: (storageRef: StorageReference, file: File | undefined) => void
}

export const firevaseEvents = new EventEmitter<FirevaseEvents>()

export type FirevaseEventEmitter = typeof firevaseEvents
