import { FirevaseClient } from '@/'
import { firevaseEvents } from '@/events'
import { PathsFrom } from '@/types'
import { collection, deleteDoc, doc } from 'firebase/firestore'

/** Destroi um recurso para sempre */
export const deleteResource = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  id: string
) => {
  // Delete the resource itself
  await deleteDoc(doc(collection(client.db, resourcePath as string), id))

  // Raise event
  firevaseEvents.emit('resourceRemoved', client, resourcePath, id)
}

// deleteResource(vase, 'guilds', '2')
