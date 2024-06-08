# Firevase 🚀🌸

Welcome to Firevase, the coolest way to make Vue and Firebase get along like peanut butter and jelly! 🍞+🍓

## What the Heck is Firevase?

Firevase is your new best friend for integrating Vue and Firebase without all the boring setup. Here's the awesome stuff you can do:

- 📁 **Firestore and Storage Integration**: Because juggling databases shouldn't be a circus act.
- 🔄 **Automatic Relation Management**: Set up your data relationships once and let Firevase handle the rest. No more micromanaging!
- ✨ **Easy Peasy Syncing**: Sync your Vue variables with Firestore entries with a single line of code. Yes, it's that simple.
- 🏗️ **Object-Oriented Firestore**: Forget the Firebase jargon. Firevase speaks Vue so you can focus on building.
- 📦 **Storage Associations**: Link Firestore entries with storage entries like a pro.

## The Secret Sauce: Resources

In Firevase, a "resource" is an entry in your Firestore. When you create your Firevase client using the `fillFirevase` method, you define your resource names and types. You can also set up one-to-many and many-to-many relationships and associate resources with storage entries. It's like playing matchmaker for your data!

## How to Set Up Your Firevase Client

Check out this example to get started:

```typescript
import { fillFirevase } from '@/firevase'
import { firebaseApp } from './firebase'
import { Guild } from './guilds'
import { Notification } from './notifications'
import { Player } from './players'
import { Adventure } from './adventures'
import { Feedback } from './feedback'

/** Firevase client for your project */
export const vase = fillFirevase<{
  guilds: Guild
  players: Player
  notifications: Notification
  adventures: Adventure
  feedback: Feedback
}>(firebaseApp, [
  'guilds',
  'players',
  'notifications',
  'adventures',
  'feedback',
])
  /** Adds the banner property to adventures, automatically associating it to a storage entry */
  .configureFiles({ adventures: ['banner'] as ['banner'] })

  /** Define many-to-many tables for relations */
  .configureManyToMany({
    playersGuilds: ['guilds', 'players'],
    guildAdmissionRequests: ['guilds', 'players'],
    playersAdventures: ['adventures', 'players'],
    narratorsAdventures: ['adventures', 'players'],
    adventureAdmissionRequests: ['adventures', 'players'],
  })

  .configureRelations(({ hasMany, hasOne }) => ({
    guilds: {
      // When we use hasMany with the "relationKey" associator, it sets up a one-to-many relation
      adventures: hasMany('adventures', { relationKey: 'guildId' }),
      owner: hasOne('players', { relationKey: 'ownerUid' }, 'protected'),
      // When we use hasMany with the "manyToManyTable" associator, it sets up a many-to-many relation
      players: hasMany('players', { manyToManyTable: 'playersGuilds' }),
      admissionRequests: hasMany('players', {
        manyToManyTable: 'guildAdmissionRequests',
      }),
    },

    players: {
      notifications: hasMany('notifications', { relationKey: 'playerId' }),
      ownedGuilds: hasMany('guilds', { relationKey: 'ownerUid' }),
      guilds: hasMany('guilds', { manyToManyTable: 'playersGuilds' }),
      guildAdmissionRequests: hasMany('guilds', {
        manyToManyTable: 'guildAdmissionRequests',
      }),
      narratorAdventures: hasMany('adventures', {
        manyToManyTable: 'narratorsAdventures',
      }),
      playerAdventures: hasMany('adventures', {
        manyToManyTable: 'playersAdventures',
      }),
      adventureAdmissionRequests: hasMany('adventures', {
        manyToManyTable: 'adventureAdmissionRequests',
      }),
    },

    adventures: {
      guild: hasOne('guilds', { relationKey: 'guildId' }, 'protected'),
      players: hasMany('players', { manyToManyTable: 'playersAdventures' }),
      narrators: hasMany('players', { manyToManyTable: 'narratorsAdventures' }),
      admissionRequests: hasMany('players', {
        manyToManyTable: 'adventureAdmissionRequests',
      }),
    },
  }))

/** Firevase client type */
export type Vase = typeof vase
```

## Dependencies and Contributions

Firevase is open source and runs on Firebase and Vue. It's maintained whenever inspiration strikes. 🧠💡

Got problems? Got solutions? Feel free to open issues or even better, pull requests. Your contributions make the world a better place! 🌍✨

Now go forth and build amazing things with Firevase! 🎉
