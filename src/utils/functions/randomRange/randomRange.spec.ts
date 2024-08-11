import { randomFloat, randomInt } from './randomRange'

const testRandomInputs = [0, 0.3, 1]

describe('randomRange', () => {
  describe.each(testRandomInputs)(
    'when Math.random() returns %s',
    (randomInput) => {
      beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(randomInput)
      })

      describe('randomFloat', () => {
        const ranges: [number, number][] = [
          [0, 1],
          [5, 10],
          [-5.1621, -2.878342],
          [-4123, 6627],
        ]

        it.each(ranges)(
          'should respect the float range: [%s ... %s]',
          (min, max) => {
            const result = randomFloat(min, max)

            expect(result).greaterThanOrEqual(min)
            expect(result).lessThanOrEqual(max)
          }
        )
      })

      describe('randomInt', () => {
        const ranges: [number, number][] = [
          [0, 1],
          [5, 10],
          [-5, -2],
          [-4123, 6627],
        ]

        it.each(ranges)(
          'should respect the int range: [%s ... %s]',
          (min, max) => {
            const result = randomInt(min, max)

            expect(result).greaterThanOrEqual(min)
            expect(result).lessThanOrEqual(max)
            expect(Number.isInteger(result)).toBeTruthy()
          }
        )
      })
    }
  )
})
