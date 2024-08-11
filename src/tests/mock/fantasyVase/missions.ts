import { setUpFirebaseMocks } from '../firebase'
import { makeResourceMocker } from '../makeResourceMocker'
import { fantasyVase } from './fantasyVase'

export type Mission = {
  priority: 'urgent' | 'high' | 'medium'
  name: string
}

setUpFirebaseMocks()

export const mockMission = makeResourceMocker(fantasyVase, 'missions', {
  priority: ['urgent', 'high', 'medium'],
  name: [
    'Damsel in Stress',
    'Quest for the Crystal Chalice',
    'Journey to the Mystic Peaks',
    'The Enigma of Echoing Cavern',
    'Voyage of the Dawn Treader',
    'The Secret of the Sunken Citadel',
    'Expedition to the Whispering Woods',
    'The Forgotten Ruins of Eldar',
    'Chase Through the Starlit Wilds',
    'Search for the Arcane Amulet',
    'The Legend of the Phantom Island',
    'The Lost City of Shadows',
    'The Hunt for the Phoenix Feather',
    'Trail of the Moonstone Dragon',
    'Escape from the Mystic Labyrinth',
    'Guardians of the Forgotten Orb',
    'The Siege of Silverkeep',
    'Rebellion in the Ruby Empire',
    "The Sorcerer's Last Stand",
    'Odyssey of the Endless Sea',
    'The Awakening of the Ancient Giants',
  ],
})
