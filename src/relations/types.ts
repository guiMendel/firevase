import { DocumentReference, Query } from 'firebase/firestore'
import { SyncableRef } from '../classes/Syncable'
import { FirevaseClient } from '../firevase'
import { HalfResource, Resource } from '../resources'
import {
  ConstrainManyToManySettings,
  ConstrainProperties,
  ManyToManyFrom,
  PathsFrom,
  PropertiesFrom,
  RelationsFrom,
} from '../firevase/types'

// ======================================================================
// FIREVASE INITIALIZATION
// ======================================================================

/** Valid relation types */
export type RelationType = 'has-one' | 'has-many' | 'many-to-many'

/** Defines a relation between path S and Path T */
export type RelationDefinition<
  Properties extends ConstrainProperties,
  ManyToManySettings extends
    | ConstrainManyToManySettings<Properties>
    | undefined,
  S extends keyof Properties,
  T extends keyof Properties,
  TY extends ManyToManySettings extends undefined
    ? Omit<RelationType, 'many-to-many'>
    : RelationType = RelationType,
  R extends boolean = false
> = {
  targetResourcePath: T
  type: TY
  protected: R
} & (TY extends 'many-to-many'
  ? ManyToManySettings extends undefined
    ? never
    : { manyToManyTable: keyof ManyToManySettings }
  : {
      relationKey: keyof Properties[TY extends 'has-one'
        ? S
        : TY extends 'has-many'
        ? T
        : S | T]
    })

/** Given 2 paths P and Q, returns the many-to-many tables that include both  */
export type ResourceManyToManyTables<
  Properties extends ConstrainProperties,
  ManyToManySettings extends
    | ConstrainManyToManySettings<Properties>
    | undefined,
  P extends keyof Properties,
  Q extends keyof Properties
> = ManyToManySettings extends undefined
  ? never
  : {
      [T in keyof ManyToManySettings]: ManyToManySettings[T] extends [P, Q]
        ? T
        : ManyToManySettings[T] extends [Q, P]
        ? T
        : never
    }[keyof ManyToManySettings]

// ======================================================================
// FIREVASE USE
// ======================================================================

export type RelationDefinitionFrom<
  C extends FirevaseClient,
  S extends keyof PropertiesFrom<C>,
  T extends keyof PropertiesFrom<C>,
  TY extends ManyToManyFrom<C> extends undefined
    ? Omit<RelationType, 'many-to-many'>
    : RelationType = RelationType,
  R extends boolean = false
> = RelationDefinition<PropertiesFrom<C>, ManyToManyFrom<C>, S, T, TY, R>

/** Dado um path P, retorna suas relacoes (sem um ref) */
export type Relations<C extends FirevaseClient, P extends PathsFrom<C>> = {
  [relation in keyof RelationsFrom<C>[P]]: RelationsFrom<C>[P][relation]['type'] extends 'has-one'
    ?
        | Resource<C, RelationsFrom<C>[P][relation]['targetResourcePath']>
        | undefined
    : Resource<C, RelationsFrom<C>[P][relation]['targetResourcePath']>[]
}

/** Dado um path P, retorna suas relacoes (sem um ref) */
export type HalfResourceRelations<
  C extends FirevaseClient,
  P extends PathsFrom<C>
> = {
  [relation in keyof RelationsFrom<C>[P]]: RelationsFrom<C>[P][relation]['type'] extends 'has-one'
    ?
        | HalfResource<C, RelationsFrom<C>[P][relation]['targetResourcePath']>
        | undefined
    : HalfResource<C, RelationsFrom<C>[P][relation]['targetResourcePath']>[]
}

/** Dado um path P, retorna suas relacoes */
export type RelationsRefs<C extends FirevaseClient, P extends PathsFrom<C>> = {
  [relation in keyof RelationsFrom<C>[P]]: SyncableRef<
    C,
    RelationsFrom<C>[P][relation]['targetResourcePath'],
    RelationsFrom<C>[P][relation]['type'] extends 'has-one'
      ? DocumentReference
      : Query
  >
}

// declare const test: RelationsRefs<Vase, 'guilds'>
// test.
