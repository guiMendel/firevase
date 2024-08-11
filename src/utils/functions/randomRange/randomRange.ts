/** Returns a random number between min and max */
export const randomFloat = (min: number, max: number): number =>
  min + Math.random() * (max - min)

export const randomInt = (min: number, max: number): number =>
  Math.floor(randomFloat(min, max))
