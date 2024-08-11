import { FirevaseClient } from '@/firevase'
import { PathsFrom, PropertiesFrom } from '@/firevase/types'
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { secureData } from '../secureData'

export const updateResource = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  id: string,
  properties: Partial<PropertiesFrom<C>[P]>,
  { overwrite } = { overwrite: false }
) => {
  const securedData = {
    ...secureData(properties, 'id'),
    modifiedAt: new Date().toJSON(),
  }

  const document = doc(collection(client.db, resourcePath as string), id)

  if (overwrite) return setDoc(document, securedData)

  return updateDoc(document, securedData)
}

// updateResource(vase, 'players', '2', {})
