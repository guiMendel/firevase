import { CleanupManager } from '@/classes/CleanupManager'
import { WithDisposeFlag } from '@/relations'
import { makeResource } from '@/resources/functions/makeResource'
import { DocumentReference, Query } from 'firebase/firestore'
import { Ref, ref, toRaw } from 'vue'
import { FirevaseClient } from '../../..'
import { HalfResource, Resource } from '../../../resources'
import {
  ConstrainRelationSettings,
  ManyToManyFrom,
  PathsFrom,
  PropertiesFrom,
} from '../../../firevase/types'
import { Syncable } from '../Syncable'

// ===========================
// IMPLEMENTATION
// ===========================

export type SyncableRef<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  M extends Query | DocumentReference
> = Ref<M extends Query ? Resource<C, P>[] : Resource<C, P> | undefined> &
  (M extends Query
    ? {
        fetcher: Syncable<M>
        filter?: (docs: HalfResource<C, P>) => boolean
      }
    : {
        fetcher: Syncable<M>
      })

export const isQueryTarget = (
  target: Query | DocumentReference | 'empty-document' | 'empty-query'
): target is Query | 'empty-query' =>
  target === 'empty-query' ||
  (typeof target === 'object' && target.type === 'query')

/** Cria um ref que automaticamente faz sync com o target
 * @param target O alvo com o qual realizar o sync
 * @param parentCleanupManager Um cleanup manager que, quando ativar o dispose, deve ativar o dispose desse ref tambem
 */
export const syncableRef = <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  M extends Query | DocumentReference
>(
  client: C,
  resourcePath: P,
  target: M | 'empty-document' | 'empty-query',
  parentCleanupManager: CleanupManager,
  options = { resourceLayersLimit: 1 }
): SyncableRef<C, P, M> => {
  const emptyValue = isQueryTarget(target)
    ? ([] as Resource<C, P>[])
    : undefined

  const valueRef = ref(emptyValue) as M extends Query
    ? Ref<Resource<C, P>[]>
    : Ref<Resource<C, P> | undefined>

  const initialTarget =
    target === 'empty-document' || target === 'empty-query' ? undefined : target

  /** O Syncable deste recurso */
  const syncable = new Syncable<M>(
    initialTarget,
    (snapshot, ownCleanupManager) => {
      let previousValues: Resource<C, P>[]

      // Se forem varios docs
      if ('docs' in snapshot) {
        previousValues = valueRef.value as Resource<C, P>[]

        valueRef.value = makeResource(
          client,
          snapshot,
          resourcePath,
          options.resourceLayersLimit,
          ownCleanupManager,
          previousValues,
          'filter' in syncedRef ? syncedRef.filter : undefined
        ) as Resource<C, P>[]
      }

      // Se for so um
      else {
        previousValues =
          valueRef.value == undefined ? [] : [valueRef.value as Resource<C, P>]

        valueRef.value = makeResource(
          client,
          snapshot,
          resourcePath,
          options.resourceLayersLimit,
          ownCleanupManager,
          previousValues
        )[0]
      }

      // Nao precisa dar dispose em relaitons se elas nao sao construidas
      if (options.resourceLayersLimit == 0) return

      // Chama dispose em todos os valores de previousValues que nao foram reutilizados
      for (const previousValue of previousValues as WithDisposeFlag<
        Resource<C, P>
      >[]) {
        if (previousValue.dontDispose) continue

        // Passa pelas relacoes
        const relations = client.relationSettings?.[
          previousValue.resourcePath
        ] as
          | undefined
          | ConstrainRelationSettings<PropertiesFrom<C>, ManyToManyFrom<C>>[P]

        if (relations == undefined) continue

        // Need to use vue's toRaw due to their ref.value unpacking antics
        for (const relation in relations) {
          if (relation in previousValue) {
            toRaw(previousValue)[relation].fetcher.dispose()
          }
        }
      }
    }
  )

  /** O SyncableRef deste recurso */
  const syncedRef = Object.assign(valueRef, {
    fetcher: syncable,
  }) as unknown as SyncableRef<C, P, M>

  syncedRef.fetcher.onReset(() => (valueRef.value = emptyValue))

  // Associa o cleanup manager
  parentCleanupManager.link(
    'propagate-to',
    syncedRef.fetcher.getCleanupManager()
  )

  // Quando limpar o target do sync, limpa o valor do ref
  syncedRef.fetcher.onUpdateTarget((newTarget) => {
    if (newTarget == undefined) syncedRef.value = emptyValue as any
  })

  return new Proxy(syncedRef, {
    get: (currentState, property) => {
      if (property === 'value') {
        currentState.fetcher.trigger()
      }

      return currentState[property as keyof typeof currentState]
    },
  })
}
