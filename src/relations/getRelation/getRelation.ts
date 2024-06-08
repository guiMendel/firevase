import { FirevaseClient } from '@/'
import { CleanupManager } from '@/classes/CleanupManager'
import type { HalfResource, Resource } from '@/resources'
import { getResourceGetter } from '@/resources/functions/getResourceGetter'
import { PathsFrom, RelationsFrom } from '@/types'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { RelationDefinitionFrom, Relations } from '..'
import { requireDefinition } from '../utils'

/** Retorna a(s) instancia(s) associada a relacao de um recurso, como Resource */
export function getRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  cleanupManager: CleanupManager
): Promise<
  RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? Resource<C, RelationsFrom<C>[P][R]['targetResourcePath']> | undefined
    : Resource<C, RelationsFrom<C>[P][R]['targetResourcePath']>[]
>

/** Retorna a(s) instancia(s) associada a relacao de um recurso, como HalfResource */
export function getRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R
): Promise<
  RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? HalfResource<C, RelationsFrom<C>[P][R]['targetResourcePath']> | undefined
    : HalfResource<C, RelationsFrom<C>[P][R]['targetResourcePath']>[]
>

export function getRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  cleanupManager?: CleanupManager
) {
  const definition = requireDefinition(client, source.resourcePath, relation)

  switch (definition.type) {
    case 'has-one':
      return getHasOneRelation(
        client,
        source,
        definition as RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-one'>,
        cleanupManager
      )

    case 'has-many':
      return getHasManyRelation(
        client,
        source,
        definition as RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-many'>,
        cleanupManager
      )

    case 'many-to-many':
      return getManyToManyRelation(
        client,
        source,
        definition as RelationDefinitionFrom<
          C,
          P,
          PathsFrom<C>,
          'many-to-many'
        >,
        cleanupManager
      )

    // Exhaustiveness checking: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
    default:
      const exhaustiveCheck: never = definition.type
      return exhaustiveCheck
  }
}

const getHasOneRelation = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-one'>,
  cleanupManager?: CleanupManager
) => {
  const { get } = cleanupManager
    ? getResourceGetter(client, definition.targetResourcePath, {
        cleanupManager,
      })
    : getResourceGetter(client, definition.targetResourcePath)

  const targetId = source[definition.relationKey] as string

  return get(targetId)
}

const getHasManyRelation = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-many'>,
  cleanupManager?: CleanupManager
) => {
  const { getList } = cleanupManager
    ? getResourceGetter(client, definition.targetResourcePath, {
        cleanupManager,
      })
    : getResourceGetter(client, definition.targetResourcePath)

  const targetFilters = [
    where(definition.relationKey as string, '==', source.id),
  ]

  return getList({ query: targetFilters })
}

/** Retorna os ids do target path associados a este source de uma relacao many-to-many */
export const getManyToManyTargetIds = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'many-to-many'>
) => {
  const bridgeQuery = query(
    collection(client.db, definition.manyToManyTable as string),
    where(source.resourcePath as string, '==', source.id)
  )

  const bridgeSnapshot = await getDocs(bridgeQuery)

  if (bridgeSnapshot.empty) return []

  return bridgeSnapshot.docs.map((doc) => ({
    targetId: doc.data()[definition.targetResourcePath as string] as string,
    bridgeId: doc.id,
  }))
}

const getManyToManyRelation = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'many-to-many'>,
  cleanupManager?: CleanupManager
) => {
  const { getList } = cleanupManager
    ? getResourceGetter(client, definition.targetResourcePath, {
        cleanupManager,
      })
    : getResourceGetter(client, definition.targetResourcePath)

  // Essa query encontra os ids dos alvos mapeados a esse source
  const targetIds = (
    await getManyToManyTargetIds(client, source, definition)
  ).map(({ targetId }) => targetId)

  if (targetIds.length === 0) return []

  return getList({
    filter: (halfResource) => targetIds.includes(halfResource.id),
  })
}
