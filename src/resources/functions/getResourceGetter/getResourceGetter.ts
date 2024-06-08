import { FirevaseClient } from '@/'
import { CleanupManager } from '@/classes/CleanupManager'
import { PathsFrom } from '@/types'
import {
  QueryFieldFilterConstraint,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
} from 'firebase/firestore'
import { makeHalfResource } from '../../functions/makeHalfResource'
import { makeResource } from '../../functions/makeResource'
import { HalfResource, Resource } from '../../types'

// ====================================
// TIPOS DO RETURN
// ====================================

export type GetListMethod<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  L extends Resource<C, P>[] | HalfResource<C, P>[]
> = (props?: {
  query?: QueryFieldFilterConstraint[]
  filter?: (docs: HalfResource<C, P>) => boolean
}) => Promise<L>

export type GetMethod<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  L extends Resource<C, P> | HalfResource<C, P>
> = (id: string) => Promise<L | undefined>

// ====================================
// IMPLEMENTACAO
// ====================================

type GetResourceGetterOptions = {
  cleanupManager: CleanupManager
  resourceLayersLimit?: number
}

/** Permite acesso a um recurso, sem injetar relacoes */
export function getResourceGetter<
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P
): {
  get: GetMethod<C, P, HalfResource<C, P>>
  getList: GetListMethod<C, P, HalfResource<C, P>[]>
}

/** Permite acesso a um recurso e injeta relacoes */
export function getResourceGetter<
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  options: GetResourceGetterOptions
): {
  get: GetMethod<C, P, Resource<C, P>>
  getList: GetListMethod<C, P, Resource<C, P>[]>
}

export function getResourceGetter<
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  options?: GetResourceGetterOptions
): {
  get: GetMethod<C, P, HalfResource<C, P> | Resource<C, P>>
  getList: GetListMethod<C, P, HalfResource<C, P>[] | Resource<C, P>[]>
} {
  /** A collection deste recurso */
  const resourceCollection = collection(client.db, resourcePath as string)

  const { cleanupManager, resourceLayersLimit = 1 } = options ?? {}

  return {
    /** Pega uma instancia do recurso */
    get: (id: string) =>
      getDoc(doc(resourceCollection, id)).then((doc) =>
        cleanupManager != undefined
          ? makeResource<C, P>(
              client,
              doc,
              resourcePath,
              resourceLayersLimit,
              cleanupManager,
              []
            )[0]
          : makeHalfResource<C, P>(doc, resourcePath)[0]
      ),

    /** Pega uma lista filtrada do recurso */
    getList: (props) =>
      getDocs(query(resourceCollection, ...(props?.query ?? []))).then((docs) =>
        cleanupManager != undefined
          ? (makeResource<C, P>(
              client,
              docs,
              resourcePath,
              resourceLayersLimit,
              cleanupManager,
              [],
              props?.filter
            ) as Resource<C, P>[])
          : (makeHalfResource<C, P>(
              docs,
              resourcePath,
              props?.filter
            ) as HalfResource<C, P>[])
      ),
  }
}

// const getter = getResourceGetter(vase, 'players')

// getter.get('2').then((player) => player.)
