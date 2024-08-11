import {
  FantasyVase,
  mockKing,
  mockKnight,
  mockLand,
  mockMission,
} from './fantasyVase'

export const mocksTable = {
  kings: mockKing,
  knights: mockKnight,
  lands: mockLand,
  missions: mockMission,
} satisfies Partial<
  Record<keyof FantasyVase['_tsAnchor'], (level?: any, overrides?: any) => any>
>

export type MocksTable = typeof mocksTable
