import { mockFantasyDatabase } from '@/tests/mock/backend'

import { CleanupManager } from '@/classes/CleanupManager'
import { syncableRef } from '@/classes/Syncable'
import { fantasyVase, mockKnight } from '@/tests/mock/fantasyVase'
import { mockDb } from '@/tests/mock/firebase'
import { collection, doc, query } from 'firebase/firestore'
import { toRaw } from 'vue'
import { hasLoaded } from '.'

describe('hasLoaded', () => {
  it('only returns true when all refs are loaded', () => {
    const ref1 = syncableRef(
      fantasyVase,
      'knights',
      'empty-document',
      new CleanupManager()
    )

    const ref2 = syncableRef(
      fantasyVase,
      'kings',
      'empty-document',
      new CleanupManager()
    )

    expect(hasLoaded(ref1, ref2)).toBe(false)
    ;(ref2.fetcher as any)._hasLoaded = true

    expect(hasLoaded(ref1, ref2)).toBe(false)
    ;(ref1.fetcher as any)._hasLoaded = true

    expect(hasLoaded(ref1, ref2)).toBe(true)
  })

  it('is able to check if a doc ref has a loaded relation', () => {
    const knightId = '1'

    mockFantasyDatabase({
      knights: {
        [knightId]: mockKnight('uploadable'),
      },
    })

    const knight = syncableRef(
      fantasyVase,
      'knights',
      doc(collection(mockDb, 'knights'), knightId),
      new CleanupManager()
    )

    expect(hasLoaded([knight, 'king'])).toBe(false)

    if (!knight.value) throw new Error('Database error')

    toRaw(knight.value).king.fetcher.trigger()

    expect(hasLoaded([knight, 'king'])).toBe(true)
  })

  it('is able to check if a query ref has a loaded relation for each instance', () => {
    const knightId1 = '1'
    const knightId2 = '2'

    mockFantasyDatabase({
      knights: {
        [knightId1]: mockKnight('uploadable'),
        [knightId2]: mockKnight('uploadable'),
      },
    })

    const knights = syncableRef(
      fantasyVase,
      'knights',
      query(collection(mockDb, 'knights')),
      new CleanupManager()
    )

    expect(hasLoaded([knights, 'king'])).toBe(false)

    knights.fetcher.trigger()
    knights.value.forEach((knight) => toRaw(knight).king.fetcher.trigger())

    expect(hasLoaded([knights, 'king'])).toBe(true)
  })
})
