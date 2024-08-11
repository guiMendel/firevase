import { FirevaseClient } from '@/firevase'
import { PathsFrom, RelationsFrom } from '@/firevase/types'
import { HalfResource, updateResource } from '@/resources'
import { addDoc, collection } from 'firebase/firestore'
import { HalfResourceRelations, RelationDefinitionFrom } from '..'
import { getManyToManyTargetIds, getRelation } from '../getRelation'
import { requireDefinition } from '../utils'
import { getTargetIds } from '../utils/getTargetIds'

/** Permite adicionar um novo valor para uma relaçao
 * @param source A instancia que vai receber uma nova instancia a relacao
 * @param relation A relaçao a adicionar (nao pode ser has-one)
 * @param target O novo valor para essa relaçao
 */
export const addRelation = <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  target: RelationsFrom<C>[P][R]['type'] extends 'has-one'
    ? never
    : HalfResourceRelations<C, P>[R]
) => {
  const definition = requireDefinition(client, source.resourcePath, relation)

  switch (definition.type) {
    case 'has-one':
      throw new Error(
        `Attempt to add to relation of type has-one ${
          relation as string
        }, from path ${source.resourcePath}`
      )

    case 'has-many':
      return addHasManyRelation(client, source, relation, target)

    case 'many-to-many':
      return addManyToManyRelation(client, source, relation, target)

    // Exhaustiveness checking: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
    default:
      const exhaustiveCheck: never = definition.type
      return exhaustiveCheck
  }
}

export const internalAddHasManyRelations = <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-many'>,
  tagetIds: string[],
  currentRelations: HalfResource<
    C,
    RelationsFrom<C>[P][R]['targetResourcePath']
  >[]
) =>
  tagetIds
    // Pega as que nao estao na lista existente
    .filter((targetInstanceId) =>
      currentRelations && Array.isArray(currentRelations)
        ? currentRelations.every(
            (currentRelation) => currentRelation.id !== targetInstanceId
          )
        : true
    )
    // Troca a relation key para a id do source, criando a relacao
    .map((targetInstanceId) =>
      updateResource(client, definition.targetResourcePath, targetInstanceId, {
        [definition.relationKey]: source.id,
      } as any)
    )

const addHasManyRelation = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  rawTarget: HalfResourceRelations<C, P>[R]
) => {
  const definition = requireDefinition(
    client,
    source.resourcePath,
    relation,
    'has-many'
  )

  const tagetIds = getTargetIds(rawTarget)

  const currentRelations = (await getRelation(
    client,
    source,
    relation
  )) as HalfResource<C, RelationsFrom<C>[P][R]['targetResourcePath']>[]

  // Adiciona as novas
  return Promise.all(
    internalAddHasManyRelations(
      client,
      source,
      definition,
      tagetIds,
      currentRelations
    )
  )
}

export const internalAddManyToManyRelations = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'many-to-many'>,
  targetIds: string[],
  currentRelatedIds: {
    targetId: string
    bridgeId: string
  }[]
) =>
  targetIds
    // Pega as que nao estao na lista existente
    .filter((targetInstanceId) =>
      currentRelatedIds.every(
        ({ targetId: currentRelatedId }) =>
          currentRelatedId !== targetInstanceId
      )
    )
    // Adiciona um doc para estabeler a relacao. Tem o formato de: o resourcePath eh a chave, o id da instancia relacionada eh o valor.
    .map((targetInstanceId) =>
      addDoc(collection(client.db, definition.manyToManyTable as string), {
        [source.resourcePath]: source.id,
        [definition.targetResourcePath]: targetInstanceId,
      })
    )

const addManyToManyRelation = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  client: C,
  source: HalfResource<C, P>,
  relation: R,
  rawTarget: HalfResourceRelations<C, P>[R]
) => {
  const definition = requireDefinition(
    client,
    source.resourcePath,
    relation,
    'many-to-many'
  )

  const targetIds = getTargetIds(rawTarget)

  // Essa query encontra os ids das instancias atualmente mapeados a esse source
  const currentRelatedIds = await getManyToManyTargetIds(
    client,
    source,
    definition
  )

  // Adiciona as novas
  return Promise.all(
    internalAddManyToManyRelations(
      client,
      source,
      definition,
      targetIds,
      currentRelatedIds
    )
  )
}

// declare const player: HalfResource<Vase, 'players'>
// declare const guild: HalfResource<Vase, 'guilds'>

// addRelation(vase, guild, 'players', [])
