import { FirevaseClient } from '@/'
import { CleanupManager } from '@/classes/CleanupManager'
import { syncableRef } from '@/classes/Syncable'
import { Syncable } from '@/classes/Syncable/Syncable'
import type { HalfResource, Resource } from '@/resources/types'
import { PathsFrom } from '@/types'
import {
  DocumentReference,
  Query,
  collection,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { toRaw } from 'vue'
import { RelationDefinitionFrom, RelationsRefs } from '..'

/** Adiciona a um objeto uma flag que indica se ele nao deve ser descartado */
export type WithDisposeFlag<T> = T & {
  dontDispose?: boolean
}

type BuildRelationsParams<C extends FirevaseClient, P extends PathsFrom<C>> = {
  /** Client where to get relation definitions */
  client: C
  /** O item para o qual gerar as relacoes */
  source: HalfResource<C, P>
  /** Um mapa dos ids para os antigos valores de itens do mesmo tipo de source.
   * Utilizado para evitar reconstruir syncs desnecessarios */
  previousValues: Record<string, WithDisposeFlag<Resource<C, P>>>
  /** Permite associar qualquer sync criado a um cleanup */
  cleanupManager: CleanupManager
  /** Quantas camadas de relacoes construir. Veja a definicao completa em makeResource */
  resourceLayersLimit: number
}

/** Constroi um objeto de relacoes para a instancia fornecida */
export const buildRelations = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>({
  cleanupManager,
  previousValues,
  source,
  client,
  resourceLayersLimit,
}: BuildRelationsParams<C, P>): RelationsRefs<C, P> => {
  if (resourceLayersLimit === 0)
    throw new Error(
      `Impossible to build relations for ${source.resourcePath} — resourceLayersLimit is 0`
    )

  if (client.relationSettings?.[source.resourcePath] == undefined)
    return {} as RelationsRefs<C, P>

  // Se essa source estiver em previous values, reutiliza as relacoes do previous value
  if (source.id in previousValues) {
    // Marca para nao descartar esses valores
    previousValues[source.id].dontDispose = true

    return extractRelations(client, toRaw(previousValues[source.id]))
  }

  return createRelations(
    client,
    source,
    resourceLayersLimit - 1,
    cleanupManager
  )
}

const createRelations = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  newResourceLayersLimit: number,
  cleanupManager: CleanupManager
): RelationsRefs<C, P> =>
  Object.entries(client.relationSettings[source.resourcePath]).reduce(
    (otherRelations, [relationName, relation]: [string, any]) => ({
      ...otherRelations,
      [relationName]: createRelation(
        client,
        source,
        relation,
        newResourceLayersLimit,
        cleanupManager
      ),
    }),
    {} as RelationsRefs<C, P>
  )

const extractRelations = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  instance: Resource<C, P>
): RelationsRefs<C, P> =>
  Object.keys(client.relationSettings[instance.resourcePath]).reduce(
    (relations, relationName) => {
      if (relationName in instance == false)
        throw new Error(
          `Falha ao extrair a relacao "${relationName}" de um objeto de path "${instance.resourcePath}"`
        )

      return {
        ...relations,
        [relationName]: instance[relationName as keyof Resource<C, P>],
      }
    },
    {} as RelationsRefs<C, P>
  )

const createRelation = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>>,
  newResourceLayersLimit: number,
  cleanupManager: CleanupManager
) => {
  switch (definition.type) {
    case 'has-one':
      return createHasOneRelation(
        client,
        source,
        definition as RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-one'>,
        newResourceLayersLimit,
        cleanupManager
      )

    case 'has-many':
      return createHasManyRelation(
        client,
        source,
        definition as RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-many'>,
        newResourceLayersLimit,
        cleanupManager
      )

    case 'many-to-many':
      return createManyToManyRelation(
        client,
        source,
        definition as RelationDefinitionFrom<
          C,
          P,
          PathsFrom<C>,
          'many-to-many'
        >,
        newResourceLayersLimit,
        cleanupManager
      )

    // Exhaustiveness checking: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
    default:
      const exhaustiveCheck: never = definition.type
      return exhaustiveCheck
  }
}

/** Relation key refers to a property of source */
const createHasOneRelation = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-one'>,
  newResourceLayersLimit: number,
  cleanupManager: CleanupManager
) => {
  // Watches changes to the relation key
  const bridgeSync = new Syncable(
    doc(collection(client.db, source.resourcePath), source.id),
    (snapshot) => {
      const targetId = snapshot.data()?.[
        definition.relationKey as string
      ] as string

      const targetDoc = doc(
        collection(client.db, definition.targetResourcePath as string),
        targetId
      )

      // Atualiza o query dos targets
      target.fetcher.updateTarget(targetDoc)
    }
  )

  // Associamos o cleanup pai ao bridgeSync
  cleanupManager.link('propagate-to', bridgeSync.getCleanupManager())

  const target = syncableRef<
    C,
    typeof definition.targetResourcePath,
    DocumentReference
  >(
    client,
    definition.targetResourcePath,
    'empty-document',
    bridgeSync.getCleanupManager(),
    { resourceLayersLimit: newResourceLayersLimit }
  )

  // Ligamos sync e dispose do syncable ref ao sync bridge
  target.fetcher.onBeforeFetchTrigger(() => bridgeSync.trigger())
  target.fetcher.onDispose(() => bridgeSync.dispose())

  return target
}

/** Relation key refers to a property of target */
const createHasManyRelation = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'has-many'>,
  newResourceLayersLimit: number,
  cleanupManager: CleanupManager
) => {
  const targetQuery = query(
    collection(client.db, definition.targetResourcePath as string),
    where(definition.relationKey as string, '==', source.id)
  )

  return syncableRef(
    client,
    definition.targetResourcePath,
    targetQuery,
    cleanupManager,
    { resourceLayersLimit: newResourceLayersLimit }
  )
}

/** Relation key refers to a property of target */
const createManyToManyRelation = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  source: HalfResource<C, P>,
  definition: RelationDefinitionFrom<C, P, PathsFrom<C>, 'many-to-many'>,
  newResourceLayersLimit: number,
  cleanupManager: CleanupManager
) => {
  // Essa query encontra os ids dos alvos mapeados a esse source
  const bridgeQuery = query(
    collection(client.db, definition.manyToManyTable as string),
    where(source.resourcePath, '==', source.id)
  )

  // Syncamos a essa query
  const bridgeSync = new Syncable(bridgeQuery, (snapshot) => {
    if (snapshot.empty) {
      // Remove o target
      targets.fetcher.updateTarget(undefined)

      // Set the loaded flag to true
      ;(targets.fetcher as any)._hasLoaded = true

      // Trigger vue
      targets.value = []

      return
    }

    const targetIds = snapshot.docs.map(
      (doc) => doc.data()[definition.targetResourcePath as string]
    ) as string[]

    // Filtra para conter somente os targets
    targets.filter = (halfResource) => targetIds.includes(halfResource.id)

    // A query que retorna os alvos de fato
    const targetsQuery = query(
      collection(client.db, definition.targetResourcePath as string)
    )

    // Atualiza o query dos targets
    targets.fetcher.updateTarget(targetsQuery)
  })

  // Associamos o cleanup pai ao bridgeSync
  cleanupManager.link('propagate-to', bridgeSync.getCleanupManager())

  // Criamos o syncable ref com a query dos alvos
  const targets = syncableRef<C, typeof definition.targetResourcePath, Query>(
    client,
    definition.targetResourcePath,
    'empty-query',
    bridgeSync.getCleanupManager(),
    { resourceLayersLimit: newResourceLayersLimit }
  )

  // Ligamos sync e dispose do syncable ref ao sync bridge
  targets.fetcher.onBeforeFetchTrigger(() => bridgeSync.trigger())
  targets.fetcher.onDispose(() => bridgeSync.dispose())

  return targets
}

// const playerRelations = buildRelations({
//   cleanupManager: new CleanupManager(),
//   client: vase,
//   previousValues: {},
//   source: syncableRef<Vase, 'players', DocumentReference>(
//     'players',
//     'empty-document',
//     new CleanupManager()
//   ).value,
// })

// playerRelations.guilds.value.at(0)?.owner
