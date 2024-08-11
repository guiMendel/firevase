import { randomFloat, randomInt } from '@/utils/functions/randomRange'
import { setUpFirebaseMocks } from '../firebase'
import { makeResourceMocker } from '../makeResourceMocker'
import { fantasyVase } from './fantasyVase'

export type Knight = {
  name: string
  gold: number

  kingId: string
}

setUpFirebaseMocks()

export const mockKnight = makeResourceMocker(fantasyVase, 'knights', {
  gold: () => randomFloat(0, 1000),
  name: [
    'Sir Vintage Beard',
    'Dom Quixote',
    'Sir Laughalot the Lighthearted',
    'Lady Chucklesword the Cheerful',
    'Sir Giggleshield the Gallant',
    'Dame Mirthmail the Merry',
    'Sir Jestblade the Jocular',
    'Lady Grinarmor the Gracious',
    'Sir Tickleshield the Tenacious',
    'Dame Froliclance the Fearless',
    'Lady Smirkhelm the Spirited',
    'Sir Japeblade the Joyful',
  ],
  kingId: () => randomInt(1, 500).toString(),
})
