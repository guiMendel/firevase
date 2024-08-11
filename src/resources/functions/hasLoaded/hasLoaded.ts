import { SyncableRef } from '@/classes/Syncable'
import { FirevaseClient } from '@/firevase'
import { FilesFrom, PathsFrom } from '@/firevase/types'
import { Relations } from '@/relations'
import { toRaw, toValue } from 'vue'
import { Resource } from '../..'

type RefWithLoadable<C extends FirevaseClient> = {
  [P in PathsFrom<C>]: [
    SyncableRef<C, P, any> | Resource<C, P>,
    keyof Relations<C, P> | FilesFrom<C>[P][number]
  ]
}[PathsFrom<C>]

type Argument<C extends FirevaseClient> =
  | SyncableRef<C, PathsFrom<C>, any>
  | RefWithLoadable<C>
  | undefined

export const hasLoaded = <C extends FirevaseClient>(...args: Argument<C>[]) => {
  // We don't want to return early since that would keep the function from generating vue
  // dependencies for all variables and relations
  let result = true

  for (const arg of args) {
    if (!arg) continue

    // Address no relation
    if (!Array.isArray(arg)) {
      // Generate vue dependency
      toValue(arg)

      if (arg.fetcher.hasLoaded === false) result = false
      continue
    }

    const [ref, loadable] = arg

    if ('fetcher' in ref && ref.fetcher.hasLoaded === false) result = false

    const value = toValue(ref)

    if (value == undefined) continue

    // Address document ref
    if (!Array.isArray(value)) {
      // Access loadable to generate vue dependency
      toValue(value[loadable as keyof typeof value])

      const loadableSync = toRaw(value)[loadable as keyof typeof value].fetcher

      if (loadableSync.hasLoaded === false) result = false
      continue
    }

    // Access loadables to generate vue dependencies
    value.forEach((instance) => toValue(instance[loadable]))

    if (!value.every((instance) => toRaw(instance)[loadable].fetcher.hasLoaded))
      result = false
  }

  return result
}
