import { CleanupManager } from '@/classes/CleanupManager'

const ogCleanupManager = CleanupManager

export type CleanupManagerInterceptor = { value: CleanupManager | undefined }

export const cleanupManagerInterceptor = (): CleanupManagerInterceptor => ({
  value: undefined,
})

/** Returns a mock. If you assign this mock to a CleanupManager spy, it will
 * assign each creation of cleanup manager to a variable you provided,
 * progressively, and throw if there are more calls than variables.
 */
export const interceptCleanupManagers = (
  ...variables: CleanupManagerInterceptor[]
) => {
  let callCount = 0

  return vi.fn().mockImplementation(() => {
    const cleanup = new ogCleanupManager()

    const variable = variables[callCount]

    if (variable == undefined)
      throw new Error('Unexpected cleanup manager construction')

    variable.value = cleanup

    callCount++

    return cleanup
  })
}
