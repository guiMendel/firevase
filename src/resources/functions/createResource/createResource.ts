import { FirevaseClient } from '@/firevase'
import { PathsFrom, PropertiesFrom } from '@/firevase/types'
import { addDoc, collection, doc, setDoc } from 'firebase/firestore'
import { Uploadable } from '../..'
import { secureData } from '../secureData'

/** Cria um novo recurso */
export const createResource = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  properties: PropertiesFrom<C>[P],
  useId?: string
) => {
  /** A collection deste recurso */
  const resourceCollection = collection(client.db, resourcePath as string)

  const securedData = {
    ...secureData(properties),
    createdAt: new Date().toJSON(),
    modifiedAt: new Date().toJSON(),
  } as Uploadable<C, P>

  // Overwrite
  if (useId != undefined) {
    const document = doc(resourceCollection, useId)

    await setDoc(document, securedData)

    return document
  }

  return addDoc(resourceCollection, securedData)
}

// createResource(vase, 'players', {})
