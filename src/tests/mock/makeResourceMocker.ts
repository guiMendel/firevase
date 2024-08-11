import { CleanupManager } from '@/classes/CleanupManager'
import { syncableRef } from '@/classes/Syncable'
import { FirevaseClient } from '@/firevase'
import {
  ConstrainRelationSettings,
  ManyToManyFrom,
  PathsFrom,
  PropertiesFrom,
} from '@/firevase/types'
import { RelationDefinitionFrom, RelationsRefs } from '@/relations'
import {
  HalfResource,
  Resource,
  UnrefedResource,
  Uploadable,
} from '@/resources'
import { sample } from '@/utils/functions/sample'
import { setUpFirebaseMocks } from './firebase'
import type { MocksTable } from './mocksTable'
import { randomInt } from '@/utils/functions/randomRange'

setUpFirebaseMocks()

/** Allows passing an array of properties instead of a single one, for random sampling */
type DefaultProperties<C extends FirevaseClient, P extends PathsFrom<C>> = {
  [property in keyof PropertiesFrom<C>[P]]:
    | PropertiesFrom<C>[P][property]
    | Array<PropertiesFrom<C>[P][property]>
    | (() => PropertiesFrom<C>[P][property])
}

export type MockLevel =
  | 'properties'
  | 'half-resource'
  | 'resource'
  | 'uploadable'
  | 'unrefed-resource'

export const makeResourceMocker = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  path: P,
  defaultsProperties: DefaultProperties<C, P>
) => {
  /** Mocks in a resource level */
  function mockResource(
    level?: 'resource',
    overrides?: Partial<Resource<C, P>>
  ): Resource<C, P>

  /** Mocks in a half resource level */
  function mockResource(
    level: 'half-resource',
    overrides?: Partial<HalfResource<C, P>>
  ): HalfResource<C, P>

  /** Mocks in an uploadable level */
  function mockResource(
    level: 'uploadable',
    overrides?: Partial<Uploadable<C, P>>
  ): Uploadable<C, P>

  /** Mocks in a properties level */
  function mockResource(
    level: 'properties',
    overrides?: Partial<PropertiesFrom<C>[P]>
  ): PropertiesFrom<C>[P]

  /** Mocks in a properties level */
  // function mockResource(
  //   level: 'unrefed-resource',
  //   overrides: Partial<UnrefedResource<C, P>>,
  //   mocksTable: MocksTable
  // ): UnrefedResource<C, P>

  // Implementation
  function mockResource(
    level?: MockLevel,
    overrides?: Partial<
      Resource<C, P> | Uploadable<C, P> | UnrefedResource<C, P>
    >,
    mocksTable?: MocksTable
  ):
    | Resource<C, P>
    | HalfResource<C, P>
    | PropertiesFrom<C>[P]
    | Uploadable<C, P> {
    const parseProperty = (
      property: DefaultProperties<C, P>[keyof DefaultProperties<C, P>]
    ) => {
      if (typeof property === 'function') return property()

      return Array.isArray(property) ? sample(property) : property
    }

    const properties = Object.entries(defaultsProperties).reduce(
      (properties, [property, definition]) => ({
        ...properties,
        [property]: parseProperty(definition),
      }),
      {} as PropertiesFrom<C>[P]
    )

    if (level === 'properties') return { ...properties, ...overrides }

    if (level === 'uploadable')
      return {
        ...properties,
        createdAt: new Date().toString(),
        modifiedAt: new Date().toString(),
        ...overrides,
      }

    const halfResource: HalfResource<C, P> = {
      ...properties,
      createdAt: new Date(),
      id: randomInt(1, 500).toString(),
      modifiedAt: new Date(),
      resourcePath: path,
    }

    if (level === 'half-resource') return { ...halfResource, ...overrides }

    const makeRelations = <T>(
      relationBuilder: (definition: RelationDefinitionFrom<C, P, any>) => T
    ) =>
      client.relationSettings?.[path] == undefined
        ? ({} as RelationsRefs<C, P>)
        : Object.entries(
            client.relationSettings[path] as ConstrainRelationSettings<
              PropertiesFrom<C>,
              ManyToManyFrom<C>
            >
          ).reduce(
            (relations, [relation, definition]) =>
              ({
                ...relations,
                [relation]: relationBuilder(definition as any),
              } as RelationsRefs<C, P>),
            {} as RelationsRefs<C, P>
          )

    if (level === 'unrefed-resource') {
      const relations = makeRelations((definition) => {
        const relation =
          // @ts-ignore
          mocksTable[definition.targetResourcePath as keyof typeof mocksTable](
            'half-resource'
          )

        return definition.type === 'has-one' ? relation : [relation]
      })

      return {
        ...halfResource,
        ...relations,
        ...overrides,
      }
    }

    const relations = makeRelations((definition) =>
      syncableRef<C, P, any>(
        client,
        definition.targetResourcePath,
        definition.type === 'has-one' ? 'empty-document' : 'empty-query',
        new CleanupManager()
      )
    )

    return {
      ...halfResource,
      ...relations,
      ...overrides,
    }
  }

  return mockResource
}
