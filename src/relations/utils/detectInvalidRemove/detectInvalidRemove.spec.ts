import { Mock } from 'vitest'
import { requireDefinition } from '../requireDefinition'
import { detectInvalidRemove } from '.'
import { FirevaseClient } from '@/'

vi.mock('../requireDefinition')

const mockRequireDefinition = requireDefinition as Mock

const targetPath = 'target'

const relationKey = 'test-key'

const mockDefinition = { targetResourcePath: targetPath, relationKey }

const mockTargetRelations = { value: undefined as any }

const detectInvalidRemoveCallback = () => {
  const mockClient = {
    relationSettings: { [targetPath]: mockTargetRelations.value },
  } as FirevaseClient

  detectInvalidRemove(mockClient, 'path', 'relation')
}

describe('detectInvalidRemove', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    mockRequireDefinition.mockReturnValue(mockDefinition)
  })

  it('should ignore if there are no opposite relations', () => {
    mockTargetRelations.value = undefined

    expect(detectInvalidRemoveCallback).not.toThrow()
  })

  it('should ignore if all opposite relations are valid', () => {
    mockTargetRelations.value = {
      a: { type: 'has-many' },
      b: { type: 'has-one', protected: false },
      c: {
        type: 'has-one',
        protected: true,
        relationKey: relationKey.toUpperCase(),
      },
    }

    expect(detectInvalidRemoveCallback).not.toThrow()
  })

  it('should raise if at least one of the opposite relations is invalid', () => {
    mockTargetRelations.value = {
      a: { type: 'has-many' },
      b: { type: 'has-one', protected: false },
      c: {
        type: 'has-one',
        protected: true,
        relationKey: relationKey.toUpperCase(),
      },
      d: {
        type: 'has-one',
        protected: true,
        relationKey,
      },
    }

    expect(detectInvalidRemoveCallback).toThrow('which would violate protected relation')
  })
})
