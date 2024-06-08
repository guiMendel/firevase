import { FirevaseClient } from './firevase'
import { RelationDefinition, RelationType } from '../relations'

// ======================================================
// CONSTRAINTS
// ======================================================

/** Valid data structure for properties definition */
export type ConstrainProperties = Record<string, Record<any, any>>

/** Valid data structure for definition of many to many settings */
export type ConstrainManyToManySettings<
  Properties extends ConstrainProperties
> = Record<string, [keyof Properties, keyof Properties]>

/** Valid data structure for definition of relations */
export type ConstrainRelationSettings<
  Properties extends ConstrainProperties,
  ManyToManySettings extends ConstrainManyToManySettings<Properties> | undefined
> = Partial<{
  [path in keyof Properties]: Record<
    string,
    RelationDefinition<
      Properties,
      ManyToManySettings,
      path,
      any,
      RelationType,
      boolean
    >
  >
}>

/** Valid data structure for definition of files per resource */
export type ConstrainFileSettings<Properties extends ConstrainProperties> =
  Partial<Record<keyof Properties, string[]>>

// ======================================================
// ACCESSORS
// ======================================================

/** Gets the resource paths from a client */
export type PathsFrom<C extends FirevaseClient> = keyof C['_tsAnchor']

/** Gets the resource properties from a client */
export type PropertiesFrom<C extends FirevaseClient> = C['_tsAnchor']

/** Gets the many to many settings from a client */
export type ManyToManyFrom<C extends FirevaseClient> = C['manyToManySettings']

/** Gets the relation settings from a client */
export type RelationsFrom<C extends FirevaseClient> = C['relationSettings']

/** Gets the file settings from a client */
export type FilesFrom<C extends FirevaseClient> = C['fileSettings']
