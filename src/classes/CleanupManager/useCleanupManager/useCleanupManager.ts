import { onBeforeUnmount } from 'vue'
import { CleanupManager } from '..'

export const useCleanupManager = () => {
  const cleanupManager = new CleanupManager()

  onBeforeUnmount(() => cleanupManager.dispose())

  return cleanupManager
}
