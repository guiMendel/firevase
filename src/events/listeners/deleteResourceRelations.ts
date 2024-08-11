import { FirevaseClient } from '@/firevase'
import {
  ConstrainRelationSettings,
  ManyToManyFrom,
  PathsFrom,
  PropertiesFrom,
} from '@/firevase/types'
import { forceRemoveRelation } from '@/relations'
import { NonHasOneRelations } from '@/relations/internalTypes'
import { HalfResource } from '@/resources'

export const deleteResourceRelations = async <
  C extends FirevaseClient,
  P extends PathsFrom<C>
>(
  client: C,
  resourcePath: P,
  id: string
) => {
  // Delete relation references
  const resourceRelations = client.relationSettings?.[resourcePath] as
    | undefined
    | ConstrainRelationSettings<PropertiesFrom<C>, ManyToManyFrom<C>>[P]

  if (resourceRelations == undefined) return

  return Promise.all(
    Object.entries(resourceRelations).map(async ([relation, definition]) => {
      // Lil' ninja hack
      const source = { id, resourcePath } as HalfResource<C, P>

      // Nothing to do about has-one
      if (definition.type !== 'has-one')
        return forceRemoveRelation(
          client,
          source,
          relation as NonHasOneRelations<C, P>,
          'all'
        )
    })
  )
}
