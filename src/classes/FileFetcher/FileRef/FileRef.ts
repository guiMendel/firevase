import { CleanupManager } from '@/classes/CleanupManager'
import { StorageReference } from 'firebase/storage'
import { Ref, ref } from 'vue'
import { FileFetcher } from '../FileFetcher'

// ===========================
// IMPLEMENTATION
// ===========================

export type FileRef = Ref<string | undefined> & {
  fetcher: FileFetcher
}

/** Cria um ref que automaticamente faz sync com o target
 * @param target O alvo com o qual realizar o sync
 * @param parentCleanupManager Um cleanup manager que, quando ativar o dispose, deve ativar o dispose desse ref tambem
 */
export const fileRef = (
  target: StorageReference | 'empty-file',
  parentCleanupManager: CleanupManager
): FileRef => {
  const valueRef = ref<string | undefined>(undefined)

  const initialTarget = target === 'empty-file' ? undefined : target

  /** O Fetcher deste recurso */
  const fetcher = new FileFetcher(
    initialTarget,
    (fileUrl) => (valueRef.value = fileUrl)
  )

  /** O FileRef deste recurso */
  const composedRef = Object.assign(valueRef, {
    fetcher,
  }) as FileRef

  composedRef.fetcher.onReset(() => (valueRef.value = undefined))

  // Associa o cleanup manager
  parentCleanupManager.link(
    'propagate-to',
    composedRef.fetcher.getCleanupManager()
  )

  // Quando limpar o target do fetcher, limpa o valor do ref
  composedRef.fetcher.onUpdateTarget((newTarget) => {
    if (newTarget == undefined) composedRef.value = undefined
  })

  return new Proxy(composedRef, {
    get: (currentState, property) => {
      if (property === 'value') {
        currentState.fetcher.trigger()
      }

      return currentState[property as keyof typeof currentState]
    },
  })
}
