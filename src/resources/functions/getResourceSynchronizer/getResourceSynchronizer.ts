import { CleanupManager } from '@/classes/CleanupManager'
import { SyncableRef, syncableRef } from '@/classes/Syncable'
import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import {
  DocumentReference,
  Query,
  QueryFieldFilterConstraint,
  collection,
  doc,
  query,
} from 'firebase/firestore'

// ====================================
// TIPOS DO RETURN
// ====================================

export type SyncListMethod<C extends FirevaseClient, P extends PathsFrom<C>> = (
  filters?: QueryFieldFilterConstraint[],
  options?: {
    existingRef?: SyncableRef<C, P, Query>
    resourceLayersLimit?: number
  }
) => SyncableRef<C, P, Query>

export type SyncMethod<C extends FirevaseClient, P extends PathsFrom<C>> = (
  id: string,
  options?: {
    existingRef?: SyncableRef<C, P, DocumentReference>
    resourceLayersLimit?: number
  }
) => SyncableRef<C, P, DocumentReference>

// ====================================
// IMPLEMENTACAO
// ====================================

export const getResourceSynchronizer = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  cleanupManager: CleanupManager
): { sync: SyncMethod<C, P>; syncList: SyncListMethod<C, P> } => {
  /** A collection deste recurso */
  const resourceCollection = collection(client.db, resourcePath as string)

  /** Obtem a referencia de documento para o id fornecido */
  const docWithId = (id?: string) =>
    id != undefined ? doc(resourceCollection, id) : undefined

  /** Gera um sync em doc ou query */
  const makeSync = <M extends DocumentReference | Query>(
    target?: M,
    options?: {
      existingRef?: SyncableRef<C, P, M>
      resourceLayersLimit?: number
    }
  ) => {
    // Se recebemos um ref, basta mudar seu target
    if (options?.existingRef != undefined) {
      options.existingRef.fetcher.updateTarget(target as any)

      return options.existingRef
    }

    // Cria um novo syncable
    return syncableRef<C, P, M>(
      client,
      resourcePath,
      target ?? 'empty-document',
      cleanupManager,
      options?.resourceLayersLimit
        ? { resourceLayersLimit: options?.resourceLayersLimit }
        : undefined
    )
  }

  return {
    /** Obtem um recurso a partir de seu id
     * @param id O id do recurso alvo
     * @param existingRef Um ref para utilizar na sincronizacao
     */
    sync: (id, options) => makeSync(docWithId(id), options),

    /** Obtem uma lista dos recursos, filtrados */
    syncList: (filters = [], options) =>
      makeSync(query(resourceCollection, ...filters), options),
  }
}

// const syncer = getResourceSynchronizer(vase, 'guilds', new CleanupManager())

// syncer.sync('2').value.owner.ownedGuilds
