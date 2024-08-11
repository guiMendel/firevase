import { CleanupManager } from '@/classes/CleanupManager'
import { FirevaseClient } from '@/firevase'
import { PathsFrom, PropertiesFrom } from '@/firevase/types'
import {
  createResource,
  deleteResource,
  getResourceGetter,
  getResourceSynchronizer,
  updateResource,
} from '@/resources/functions'
import { collection, doc } from 'firebase/firestore'
import { onBeforeUnmount } from 'vue'

/** Fornece uma interface para ler e escrever dados de um recurso no firestore, com sync.
 * @param resourcePath O caminho do recurso no firestore
 */
export const useResource = <C extends FirevaseClient, P extends PathsFrom<C>>(
  client: C,
  resourcePath: P
) => {
  type Properties = PropertiesFrom<C>

  // ========================================
  // UTILIDADES
  // ========================================

  /** A collection deste recurso */
  const resourceCollection = collection(client.db, resourcePath as string)

  /** Gerenciador de cleanups desta instancia */
  const cleanupManager = new CleanupManager()

  /** Obtem a referencia de documento para o id fornecido */
  const docWithId = (id: string) => doc(resourceCollection, id)

  // ========================================
  // WRITE
  // ========================================

  /** Cria um novo recurso */
  const create = (properties: Properties[P], useId?: string) =>
    createResource(client, resourcePath, properties, useId)

  /** Cria um novo recurso */
  const update = (
    id: string,
    properties: Partial<Properties[P]>,
    options = { overwrite: false }
  ) => updateResource(client, resourcePath, id, properties, options)

  /** Destroi o recurso permanentemente */
  const deleteForever = (id: string) => deleteResource(client, resourcePath, id)

  // ========================================
  // READ
  // ========================================

  /** Pega os getters */
  const { get, getList } = getResourceGetter(client, resourcePath, {
    cleanupManager,
  })

  // ========================================
  // SYNC
  // ========================================

  /** Pega os metodos de sync */
  const { sync, syncList } = getResourceSynchronizer(
    client,
    resourcePath,
    cleanupManager
  )

  // ========================================
  // CLEAN UP
  // ========================================

  // Desinscreve tudo
  onBeforeUnmount(() => cleanupManager.dispose())

  return {
    // Utilidades
    resourceCollection,
    docWithId,
    cleanupManager,

    // Write
    create,
    update,
    deleteForever,

    // Read & Sync
    get,
    getList,
    sync,
    syncList,
  }
}
