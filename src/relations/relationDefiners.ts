import { RelationDefinition, ResourceManyToManyTables } from '.'
import { ConstrainManyToManySettings, ConstrainProperties } from '../firevase/types'

/** Creates the hasMany helper for definition relations */
export const makeHasMany = <
  Properties extends ConstrainProperties,
  ManyToManySettings extends ConstrainManyToManySettings<Properties> | undefined
>() => {
  function isMany<S extends keyof Properties, T extends keyof Properties>(
    targetResourcePath: T,
    { relationKey }: { relationKey: keyof Properties[T] }
  ): RelationDefinition<Properties, ManyToManySettings, S, T, 'has-many'>

  /** Constroi uma definicao de relacao n:n */
  function isMany<S extends keyof Properties, T extends keyof Properties>(
    targetResourcePath: T,
    {
      manyToManyTable,
    }: {
      manyToManyTable: ResourceManyToManyTables<
        Properties,
        ManyToManySettings,
        S,
        T
      >
    }
  ): RelationDefinition<Properties, ManyToManySettings, S, T, 'many-to-many'>

  function isMany<S extends keyof Properties, T extends keyof Properties>(
    targetResourcePath: T,
    key:
      | {
          manyToManyTable: ResourceManyToManyTables<
            Properties,
            ManyToManySettings,
            S,
            T
          >
        }
      | { relationKey: keyof Properties[T] }
  ): RelationDefinition<
    Properties,
    ManyToManySettings,
    S,
    T,
    'many-to-many' | 'has-many'
  > {
    return 'relationKey' in key
      ? {
          relationKey: key.relationKey,
          targetResourcePath,
          type: 'has-many',
          protected: false,
        }
      : {
          // @ts-ignore
          manyToManyTable: key.manyToManyTable,
          targetResourcePath,
          type: 'many-to-many',
          protected: false,
        }
  }

  return isMany
}

/** Creates the hasOne helper for definition relations */
export const makeHasOne =
  <Properties extends ConstrainProperties>() =>
  <
    S extends keyof Properties,
    T extends keyof Properties,
    R extends 'protected' | 'optional' = 'optional'
  >(
    targetResourcePath: T,
    { relationKey }: { relationKey: keyof Properties[S] },
    isProtected: R = 'optional' as R
  ): RelationDefinition<
    Properties,
    undefined,
    S,
    T,
    'has-one',
    R extends 'protected' ? true : false
  > => ({
    protected: (isProtected === 'protected') as R extends 'protected'
      ? true
      : false,
    relationKey,
    targetResourcePath,
    type: 'has-one',
  })
