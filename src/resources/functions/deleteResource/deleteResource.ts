import { firevaseEvents } from '@/events'
import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
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
