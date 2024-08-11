import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import { RelationDefinitionFrom, RelationType, Relations } from '../..'

/** Gets the relation definition, and throws if it doesn't exist */
export function requireDefinition<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>
>(client: C, path: P, relation: R): RelationDefinitionFrom<C, P, PathsFrom<C>>

/** Gets the relation definition with type cast, and throws if it doesn't exist */
export function requireDefinition<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>,
  T extends RelationType
>(
  client: C,
  path: P,
  relation: R,
  _: T
): RelationDefinitionFrom<C, P, PathsFrom<C>, T>

export function requireDefinition<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof Relations<C, P>,
  T extends RelationType
>(client: C, path: P, relation: R, _?: T) {
  const definition = client.relationSettings?.[path]?.[relation] as
    | RelationDefinitionFrom<C, P, PathsFrom<C>, T>
    | undefined

  if (definition == undefined) {
    const reason =
      client.relationSettings == undefined
        ? 'firevase client has no relation settings'
        : "couldn't find this relation in client's relation settings"

    throw new Error(
      `Can't access relation settings of ${relation as string} from ${
        path as string
      } — ${reason}`
    )
  }

  return definition
}
