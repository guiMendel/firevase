import { mockDocumentSnapshot, mockQuerySnapshot } from '@/tests/mock/firebase'
import { makeHalfResource } from '.'
import { applyDateMock } from '@/tests/mock/backend'

describe('makeHalfResource', () => {
  beforeEach(applyDateMock)

  describe('query snapshot', () => {
    it('adds the necessary fields to make a valid half resource', () => {
      const date = new Date()

      const path = 'test'

      const data = {
        name: 'Arbitrus',
        count: 2,
        createdAt: date.toString(),
        modifiedAt: date.toString(),
      }

      const id = '10'

      expect(
        makeHalfResource(mockQuerySnapshot([{ data, id }]), path)
      ).toStrictEqual([
        {
          ...data,
          id,
          createdAt: date,
          modifiedAt: date,
          resourcePath: path,
        },
      ])
    })

    it('should return each document in the snapshot', () => {
      const snapshot = mockQuerySnapshot([
        { data: {}, id: '1' },
        { data: {}, id: '2' },
        { data: {}, id: '3' },
        { data: {}, id: '4' },
      ])

      expect(makeHalfResource(snapshot, 'test')).toHaveLength(snapshot.size)
    })
  })

  describe('document snapshot', () => {
    it('handles undefined data', () => {
      expect(
        makeHalfResource(
          mockDocumentSnapshot({ data: () => undefined }),
          'test'
        )
      ).toStrictEqual([undefined])
    })

    it('adds the necessary fields to make a valid half resource', () => {
      const date = new Date()

      const path = 'test'

      const data = {
        name: 'Arbitrus',
        count: 2,
        createdAt: date.toString(),
        modifiedAt: date.toString(),
      }

      const id = '10'

      expect(
        makeHalfResource(mockDocumentSnapshot({ data: () => data, id }), path)
      ).toStrictEqual([
        {
          ...data,
          id,
          createdAt: date,
          modifiedAt: date,
          resourcePath: path,
        },
      ])
    })
  })
})
