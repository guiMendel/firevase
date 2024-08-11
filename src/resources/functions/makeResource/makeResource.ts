import { CleanupManager } from '@/classes/CleanupManager'
import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore'
import { populateFiles } from '../../../files/populateFiles'
import { buildRelations } from '../../../relations/buildRelations'
import { makeHalfResource } from '../../functions/makeHalfResource'
import { HalfResource, Resource } from '../../types'

/** Gera um (ou varios) Resource C, dos dados recebidos como documento ou query
 * @param client O cliente para usar para achar definiçao do recurso
 * @param snapshot Possui dados para popular as propriedades da nova instancia
 * @param resourcePath O path que define o tipo de objeto a ser gerado
 * @param resourceLayersLimit Quantas camadas de relations sao criadas.
 * Passar 0 da no mesmo que chamar makeHalfResource.
 * Passar 1 significa que o recurso tera relacoes injetadas (primeira camada de relacoes),
 * mas os recursos acessados por essas relacoes nao terao relacoes injetadas (que seria a segunda camada).
 * Passar 2 ja teria essas relacoes, mas as relacoes seguintes na teriam. E assim por diante.
 * @param cleanupManager O manager para associar a novos recursos alocados
 * @param previousValues Uma piscina de valores da qual podemos reutilizar recursos para nao ter de recriar eles
 */
export const makeResource = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  snapshot: DocumentSnapshot | QuerySnapshot,
  resourcePath: P,
  resourceLayersLimit: number,
  cleanupManager: CleanupManager,
  previousValues: Resource<C, P>[],
  filter?: (docs: HalfResource<C, P>) => boolean
): Array<Resource<C, P> | undefined> => {
  /** Gera os resources a partir dos snapshots */
  const extractedResources = makeHalfResource<C, P>(
    snapshot,
    resourcePath,
    filter
  )

  if (resourceLayersLimit === 0) return extractedResources

  /** Organiza os valores anteriores para aumentar eficiencia.
   * Em um objeto que mapeia id para dados
   */
  const previousValuesMap = previousValues.reduce(
    (map, properties) => ({ ...map, [properties.id]: properties }),
    {} as Record<string, Resource<C, P>>
  )

  /** Injeta relacoes para tornar os recursos em instancias */
  return extractedResources.map(
    (extractedResource) =>
      extractedResource && {
        ...extractedResource,
        ...buildRelations({
          previousValues: previousValuesMap,
          cleanupManager,
          source: extractedResource,
          client,
          resourceLayersLimit,
        }),
        ...populateFiles({
          client,
          resourcePath,
          cleanupManager,
          resourceId: extractedResource.id,
        }),
      }
  )
}
