import { fillFirevase } from '@/firevase'
import { mockFirebaseApp } from '../firebase'
import { King, Knight, Land, Mission } from './'

export const fantasyVase = fillFirevase<{
  knights: Knight
  kings: King
  lands: Land
  missions: Mission
}>(mockFirebaseApp, ['kings', 'knights', 'lands', 'missions'])
  .configureManyToMany({
    knightsLands: ['knights', 'lands'],
    knightsMissions: ['knights', 'missions'],
  })
  .configureRelations(({ hasMany, hasOne }) => ({
    kings: {
      knights: hasMany('knights', { relationKey: 'kingId' }),
      lands: hasMany('lands', { relationKey: 'kingId' }),
    },

    knights: {
      king: hasOne('kings', { relationKey: 'kingId' }, 'protected'),
      missions: hasMany('missions', { manyToManyTable: 'knightsMissions' }),
      supervisedLands: hasMany('lands', { manyToManyTable: 'knightsLands' }),
    },

    lands: {
      ruler: hasOne('kings', { relationKey: 'kingId' }),
      supervisors: hasMany('knights', { manyToManyTable: 'knightsLands' }),
    },

    missions: {
      members: hasMany('knights', { manyToManyTable: 'knightsMissions' }),
    },
  }))

export type FantasyVase = typeof fantasyVase
