import { FirevaseClient } from '@/firevase'
import { PathsFrom } from '@/firevase/types'
import { HalfResourceRelations } from '../..'

export function getTargetIds<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  rawTarget: HalfResourceRelations<C, P>[R] | 'all',
  currentRelationsIds: string[]
): string[]

export function getTargetIds<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(rawTarget: HalfResourceRelations<C, P>[R]): string[]

export function getTargetIds<
  C extends FirevaseClient,
  P extends PathsFrom<C>,
  R extends keyof HalfResourceRelations<C, P>
>(
  rawTarget: HalfResourceRelations<C, P>[R] | 'all',
  currentRelationsIds?: string[]
): string[] {
  if (rawTarget === 'all') {
    if (currentRelationsIds != undefined) return currentRelationsIds

    throw new Error(
      'Can\'t pass "all" when no currentRelationsIds are provided'
    )
  }

  return Array.isArray(rawTarget)
    ? rawTarget.map(({ id }: any) => id)
    : [rawTarget.id]
}
