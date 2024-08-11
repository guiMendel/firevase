import { sample } from '.'

describe('sample', () => {
  it('should return a value from the array', () => {
    const arrayA = [1, 2, 3]
    const arrayB = [true, false]
    const arrayC = [{ sup: 1 }, { scooby: 2 }]
    const arrayD = [['a'], [{ na: true }], 5]

    expect(arrayA).toContain(sample(arrayA))
    expect(arrayB).toContain(sample(arrayB))
    expect(arrayC).toContain(sample(arrayC))
    expect(arrayD).toContain(sample(arrayD))
  })
})
