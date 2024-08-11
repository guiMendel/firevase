import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import type { RelationDefinitionFrom, Relations } from '../..'
import { requireDefinition } from '../requireDefinition'

/** Se a relacao for has-many, e a relacao respectiva do target path for protected e has-one, rejeita */
export const detectInvalidRemove = <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  path: P,
  relation: keyof Relations<C, P>
) => {
  const definition = requireDefinition(client, path, relation, 'has-many')

  const targetRelations = client.relationSettings?.[
    definition.targetResourcePath
  ] as
    | undefined
    | Record<
        string,
        RelationDefinitionFrom<
          C,
          typeof definition.targetResourcePath,
          PathsFrom<C>
        >
      >

  if (targetRelations == undefined) return

  const oppositeRelation = Object.entries(targetRelations).filter(
    ([_, oppDefinition]) =>
      oppDefinition.type === 'has-one' &&
      oppDefinition.protected &&
      (oppDefinition as any).relationKey === definition.relationKey
  )

  if (oppositeRelation.length > 0) {
    const [oppRelation] = oppositeRelation[0]

    throw new Error(
      `Attempt to remove from relation ${relation as string} of path ${
        path as string
      }, which would violate protected relation ${oppRelation} of path ${
        definition.targetResourcePath as string
      }`
    )
  }
}
