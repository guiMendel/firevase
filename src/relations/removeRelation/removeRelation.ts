import { FirevaseClient } from '@/firevase'
import { PathsFrom, PropertiesFrom, RelationsFrom } from '@/firevase/types'
import { HalfResource, updateResource } from '@/resources'
import { collection, deleteDoc, doc } from 'firebase/firestore'
import { HalfResourceRelations, RelationDefinitionFrom } from '..'
import { getManyToManyTargetIds, getRelation } from '../getRelation'
import {
  HasOneRelations,
  NonHasOneRelations,
  OptionalHasOneRelations,
  ValidHasManyTarget,
} from '../internalTypes'
import { detectInvalidRemove, requireDefinition } from '../utils'
import { getTargetIds } from '../utils/getTargetIds'

/** Permite remover qualquer uma relacao has-one
 * @param source De onde remover as relacoes
 * @param relation A relaçao a remover
 * @param target As instancias a serem removidas
 */
export function forceRemoveRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: HasOneRelations<C, P>
): Promise<void>

/** Permite remover instancias de uma relaçao
 * @param source De onde remover as relacoes
 * @param relation A relaçao a remover
 * @param target As instancias a serem removidas
 */
export function forceRemoveRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends NonHasOneRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  target: HalfResourceRelations<C, P>[R] | 'all'
): Promise<void>

export function forceRemoveRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  target?: HalfResourceRelations<C, P>[R] | 'all'
) {
  // @ts-ignore
  return removeRelation(client, source, relation, target, { force: true })
}

/** Permite remover uma relacao has-one que nao seja protegida
 * @param source De onde remover as relacoes
 * @param relation A relaçao a remover
 * @param target As instancias a serem removidas
 */
export function removeRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: OptionalHasOneRelations<C, P>
): Promise<void>

/** Permite remover instancias de uma relaçao
 * @param source De onde remover as relacoes
 * @param relation A relaçao a remover
 * @param target As instancias a serem removidas
 */
export function removeRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends NonHasOneRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  target: ValidHasManyTarget<C, P, R, HalfResourceRelations<C, P>[R] | 'all'>
): Promise<void>

export function removeRelation<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  target?: HalfResourceRelations<C, P>[R] | 'all',
  options?: { force: boolean }
) {
  const definition = requireDefinition(client, source.resourcePath, relation)

  if (definition.type === 'has-one')
    return removeHasOneRelation(
      client,
      source,
      relation as unknown as OptionalHasOneRelations<C, P>,
      options?.force
    )

  if (target == undefined)
    throw new Error(
      `Attempt to remove relation ${relation as string} of type ${
        definition.type
      }, in path ${source.resourcePath}, without providing a target`
    )

  switch (definition.type) {
    case 'has-many':
      return removeHasManyRelation(
        client,
        source,
        relation,
        target,
        options?.force
      )

    case 'many-to-many':
      return removeManyToManyRelation(client, source, relation, target)

    // Exhaustiveness checking: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
    default:
      const exhaustiveCheck: never = definition.type
      return exhaustiveCheck
  }
}

const removeHasOneRelation = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  relation: OptionalHasOneRelations<C, P>,
  force?: boolean
) => {
  const definition = requireDefinition(
    client,
    source.resourcePath,
    relation,
    'has-one'
  )

  // Rejeita se for protected e undefined
  if (!force && definition.protected)
    throw new Error(
      `Attempt to remove protected relation ${relation as string}`
    )

  if (source[definition.relationKey] == undefined) return

  return updateResource(client, source.resourcePath, source.id, {
    [definition.relationKey]: undefined,
  } as Partial<PropertiesFrom<C>[P]>)
}

export const internalRemoveHasManyRelations = <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  definition: RelationDefinitionFrom<C, P, keyof PropertiesFrom<C>, 'has-many'>,
  targetIds: string[],
  currentRelations: HalfResource<
    C,
    RelationsFrom<C>[P][R]['targetResourcePath']
  >[]
) =>
  currentRelations
    // Pega as que estao na lista de remocao
    .filter((currentRelation) =>
      targetIds.some(
        (targetInstanceId) => targetInstanceId === currentRelation.id
      )
    )
    // Troca a relation key para undefined, quebrando a relacao
    .map((currentRelation) =>
      updateResource(
        client,
        definition.targetResourcePath,
        currentRelation.id,
        {
          [definition.relationKey]: undefined,
        } as Partial<PropertiesFrom<C>[keyof PropertiesFrom<C>]>
      )
    )

const removeHasManyRelation = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  rawTarget: HalfResourceRelations<C, P>[R] | 'all',
  force?: boolean
) => {
  const definition = requireDefinition(
    client,
    source.resourcePath,
    relation,
    'has-many'
  )

  if (!force) detectInvalidRemove(client, source.resourcePath, relation)

  const currentRelations = (await getRelation(
    client,
    source,
    relation
  )) as HalfResource<C, RelationsFrom<C>[P][R]['targetResourcePath']>[]

  const targetIds = getTargetIds(
    rawTarget,
    currentRelations.map((current) => current.id)
  )

  return Promise.all(
    internalRemoveHasManyRelations(
      client,
      definition,
      targetIds,
      currentRelations
    )
  )
}

export const internalRemoveManyToManyRelations = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  definition: RelationDefinitionFrom<
    C,
    P,
    keyof C['_tsAnchor'],
    'many-to-many'
  >,
  targetIds: string[],
  currentRelatedIds: {
    targetId: string
    bridgeId: string
  }[]
) =>
  currentRelatedIds
    // Pega as que estao na lista de remover
    .filter(({ targetId: currentRelatedId }) =>
      targetIds.some(
        (targetInstanceId) => targetInstanceId === currentRelatedId
      )
    )
    // Destroi o doc que estabelece essa relacao
    .map(({ bridgeId }) =>
      deleteDoc(
        doc(
          collection(client.db, definition.manyToManyTable as string),
          bridgeId
        )
      )
    )

const removeManyToManyRelation = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  rawTarget: HalfResourceRelations<C, P>[R] | 'all'
) => {
  const definition = requireDefinition(
    client,
    source.resourcePath,
    relation,
    'many-to-many'
  )

  // Essa query encontra os ids das instancias atualmente mapeados a esse source
  const currentRelatedIds = await getManyToManyTargetIds(
    client,
    source,
    definition
  )

  const targetIds = getTargetIds(
    rawTarget,
    currentRelatedIds.map((current) => current.targetId)
  )

  // Remove as relacoes atuais que nao estao na nova lista
  return Promise.all(
    internalRemoveManyToManyRelations(
      client,
      definition,
      targetIds,
      currentRelatedIds
    )
  )
}

// declare const player: HalfResource<Vase, 'players'>
// declare const guild: HalfResource<Vase, 'guilds'>

// removeRelation(vase, player, 'ownedGuilds', [guild])
// removeRelation(vase, player, 'guilds', [guild])
// removeRelation(vase, guild, 'owner')
// removeRelation(vase, guild, 'players', [player])
