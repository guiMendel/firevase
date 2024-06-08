import { getTargetIds } from '.'

describe('getTargetIds', () => {
  it('returns ids from an array', () => {
    const rawTarget: any = { id: 'scooby' }

    expect(getTargetIds([rawTarget], [])).toStrictEqual([rawTarget.id])
  })

  it('should throw if no currentRelationsIds is provided but first param is "all"', () => {
    expect(() => getTargetIds('all')).toThrow(
      'no currentRelationsIds are provided'
    )
  })

  it('wraps a single object in an array', () => {
    const rawTarget: any = { id: 'scooby' }

    expect(getTargetIds(rawTarget, [])).toStrictEqual([rawTarget.id])
  })

  it('returns second param if first parameter is "all"', () => {
    const secondParam: any = 'scooby'

    expect(getTargetIds('all', secondParam)).toStrictEqual(secondParam)
  })
})
