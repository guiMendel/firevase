import { randomInt } from '../randomRange'

export const sample = <T>(container: Array<T>) =>
  container.at(randomInt(0, container.length))
