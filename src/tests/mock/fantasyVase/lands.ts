import { randomInt } from '@/utils/functions/randomRange'
import { setUpFirebaseMocks } from '../firebase'
import { makeResourceMocker } from '../makeResourceMocker'
import { fantasyVase } from './fantasyVase'

export type Land = {
  name: string
  biome: 'desert' | 'woods' | 'plains' | 'hills' | 'swamp' | 'tundra'

  kingId: string
}

setUpFirebaseMocks()

export const mockLand = makeResourceMocker(fantasyVase, 'lands', {
  biome: ['desert', 'woods', 'plains', 'hills', 'swamp', 'tundra'],
  kingId: () => randomInt(1, 500).toString(),
  name: [
    'The Wormlands',
    'Desert of Whimsical Whirlwinds',
    'Whispering Woods of Wonder',
    'Plains of Perpetual Laughter',
    'Hills of Hilarious Echoes',
    'Swamp of Silly Spirits',
    'Tundra of Ticklish Snowmen',
    'Sands of Snickering Dunes',
    'Forest of Frolicking Fairies',
    'Meadows of Mirthful Melodies',
    'Highlands of Humorous Hares',
    'Eldoria',
    'Mythranor',
    'Auroria',
    'Zephyria',
    'Celestium',
    'Dracoria',
    'Thundarion',
    'Luminara',
    'Shadowmere',
    'Stormhaven',
  ],
})
