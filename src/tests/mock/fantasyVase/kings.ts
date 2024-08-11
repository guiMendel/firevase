import { randomInt } from '@/utils/functions/randomRange'
import { setUpFirebaseMocks } from '../firebase'
import { makeResourceMocker } from '../makeResourceMocker'
import { fantasyVase } from './fantasyVase'

export type King = {
  name: string
  age: number
  hasSuccessor: boolean
}

setUpFirebaseMocks()

export const mockKing = makeResourceMocker(fantasyVase, 'kings', {
  age: () => randomInt(8, 110),
  hasSuccessor: [true, false],
  name: [
    'Chucklebeard the Cheerful',
    'Gigglesnort the Jolly',
    'Wobblebottom the Wise',
    'Snickerdoodle the Sweet',
    'Bumblefoot the Brave',
    'Quirkhelm the Quizzical',
    'Jellybelly the Jovial',
    'Fizzlefist the Fanciful',
    'Doodlecrown the Daring',
    'Guffawgoblet the Great',
  ],
})
