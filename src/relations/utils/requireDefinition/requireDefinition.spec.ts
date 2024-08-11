import { FirevaseClient } from '@/firevase'
import { requireDefinition } from '.'

describe('requireDefinition', () => {
  it('should raise if there is no relation settings', () => {
    const client = {
      relationSettings: undefined,
    } as FirevaseClient

    expect(() => requireDefinition(client, 'path', 'relation')).throws(
      'firevase client has no relation settings'
    )
  })

  it("should raise if relation settings doesn't have this relation", () => {
    const path = 'path'

    const client = {
      relationSettings: { [path]: {} },
    } as FirevaseClient

    expect(() => requireDefinition(client, 'path', 'relation')).throws(
      "couldn't find this relation in client's relation settings"
    )
  })

  it('should return the relation settings if it exists', () => {
    const path = 'path'
    const relation = 'relation'

    const definition = 'definition'

    const client = {
      relationSettings: { [path]: { [relation]: definition } },
    } as FirevaseClient

    expect(requireDefinition(client, 'path', 'relation')).toBe(definition)
  })
})
