import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore'
import { HalfResource, Uploadable } from '../..'

/** Gera um (ou varios) Resources dos dados recebidos como documento ou query
 * @param snapshot Possui dados para popular as propriedades da nova instancia
 */
export const makeHalfResource = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  snapshot: DocumentSnapshot | QuerySnapshot,
  resourcePath: P,
  filter?: (docs: HalfResource<C, P>) => boolean
): Array<HalfResource<C, P> | undefined> => {
  // Lida com um query
  if ('docs' in snapshot) {
    return snapshot.docs
      .map((doc) => documentToResource(doc, resourcePath))
      .filter(filter ?? (() => true))
  }

  return [documentToResource(snapshot, resourcePath)]
}

/** Gera um recurso a partir de um documento */
const documentToResource = <C extends FirevaseClient, P extends PathsFrom<C>>(
  doc: DocumentSnapshot | QueryDocumentSnapshot,
  resourcePath: P
): HalfResource<C, P> | undefined => {
  const data = doc.data() as Uploadable<C, P> | undefined

  if (data == undefined) return undefined

  return {
    // Adiciona as propriedades
    ...data,
    id: doc.id,
    createdAt: new Date(data.createdAt),
    modifiedAt: new Date(data.modifiedAt),
    resourcePath,
  }
}
