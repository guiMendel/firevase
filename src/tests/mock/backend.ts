import { setUpFirebaseMocks } from './firebase'

import { fantasyVase } from './fantasyVase'

import { FirevaseClient } from '@/firevase'
import { ManyToManyFrom, PathsFrom } from '@/firevase/types'
import {
  HalfResource as OriginalHalfResource,
  Uploadable as OriginalUploadable,
} from '@/resources'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { Mock } from 'vitest'

export const mockGetDocs = getDocs as Mock
export const mockGetDoc = getDoc as Mock
export const mockSetDoc = setDoc as Mock
export const mockDeleteDoc = deleteDoc as Mock
export const mockUpdateDoc = updateDoc as Mock
export const mockAddDoc = addDoc as Mock
export const mockDoc = doc as Mock
export const mockOnSnapshot = onSnapshot as Mock
export const mockCollection = collection as Mock
export const mockQuery = query as Mock
export const mockWhere = where as Mock
export const mockDocumentId = documentId as Mock

setUpFirebaseMocks()

export const createDatabase = <C extends FirevaseClient>(client: C) => {
  // ======================================================
  // BASIC TYPES
  // ======================================================

  type ResourcePath = PathsFrom<C>

  type ManyToManySettings = ManyToManyFrom<C>

  type DatabaseTable = ResourcePath | keyof ManyToManySettings

  type ManyToManyEntry<P extends keyof ManyToManySettings> = {
    [key in ManyToManySettings[P][number]]: string
  }

  type Uploadable<P extends ResourcePath> = OriginalUploadable<C, P>

  type HalfResource<P extends ResourcePath> = OriginalHalfResource<C, P>

  // ======================================================
  // DATABASE TYPES
  // ======================================================

  type EntryFor<P extends DatabaseTable> = P extends ResourcePath
    ? Uploadable<P>
    : P extends keyof ManyToManySettings
    ? ManyToManyEntry<P>
    : never

  type ExternalEntryFor<P extends DatabaseTable> = P extends ResourcePath
    ? HalfResource<P>
    : P extends keyof ManyToManySettings
    ? ManyToManyEntry<P>
    : never

  type Snapshot<P extends DatabaseTable> = {
    data: () => EntryFor<P> | undefined
    id: string
  }

  type QuerySnapshot<P extends DatabaseTable> = {
    docs: Snapshot<P>[]
    empty: boolean
  }

  type Database = Partial<{
    [P in DatabaseTable]: Record<string, EntryFor<P>>
  }>

  type Listener<T> = (newValue: T | undefined) => void

  // ======================================================
  // IMPLEMENTATION
  // ======================================================

  return {
    init: (values: Database) => {
      /** Identifies if a path is from a resource */
      const isResourcePath = (path: DatabaseTable): path is ResourcePath =>
        client.paths.includes(path)

      // Mock dates
      applyDateMock()

      /** The actual place where values are stored */
      const database: Database = { ...values }

      /** Listeners of DocumentReference */
      const docListeners: Partial<{
        [P in ResourcePath]: { listener: Listener<Snapshot<P>>; id: string }[]
      }> = {}

      /** Listeners of Query */
      const queryListeners: Partial<{
        [P in DatabaseTable]: {
          listener: Listener<QuerySnapshot<P>>
          query: MockedQuery
        }[]
      }> = {}

      /** Used to generate a new id */
      let nextId = 0

      const parseTestSnapshot = <P extends ResourcePath>(
        path: P,
        id: string,
        data: Uploadable<P>
      ): HalfResource<P> =>
        data && {
          ...data,
          id,
          resourcePath: path,
          createdAt: new Date(data.createdAt),
          modifiedAt: new Date(data.modifiedAt),
        }

      const lookupDatabase = <P extends DatabaseTable>(
        path: P,
        id: string
      ): EntryFor<P> | undefined => {
        const pathDatabase = database[path]

        return pathDatabase ? pathDatabase[id] : undefined
      }

      const toSnapshot = <P extends DatabaseTable>(
        path: P,
        id: string
      ): Snapshot<P> => ({
        data: () => lookupDatabase(path, id),
        id,
      })

      const allSnapshots = <P extends DatabaseTable>(path: P): Snapshot<P>[] =>
        Object.keys(database[path] ?? {}).map((id) => toSnapshot(path, id))

      /** Pega os database listeners que se importam com esse id */
      const getRelevantDatabaseListeners = <P extends DatabaseTable>(
        path: P,
        targetId: string
      ) => {
        const databasePathListeners = queryListeners[path]

        if (databasePathListeners == undefined) return []

        return databasePathListeners.filter(({ query }) => {
          const queriedSnapshots = query.filterer.filter(allSnapshots(path))

          // If the query has this doc, it's relevant
          return queriedSnapshots.some(({ id }) => id === targetId)
        })
      }

      const alertListeners = <P extends ResourcePath>(
        path: P,
        modifiedId: string,
        extraDatabaseListeners: ReturnType<
          typeof getRelevantDatabaseListeners
        > = []
      ) => {
        // Update all listeners
        const docPathListeners = docListeners[path]

        if (docPathListeners) {
          const snapshot = toSnapshot(path, modifiedId)

          for (const { id, listener } of docPathListeners) {
            if (id === modifiedId) listener(snapshot)
          }
        }

        const alertedListenersIds = new Set<string>()

        for (const { listener, query } of [
          ...getRelevantDatabaseListeners(path, modifiedId),
          ...extraDatabaseListeners,
        ]) {
          if (alertedListenersIds.has(query.filterer.id)) continue

          alertedListenersIds.add(query.filterer.id)

          const queriedSnapshots = query.filterer
            .filter(allSnapshots(path))
            .filter((snapshot) => snapshot.data() != undefined)

          listener({
            docs: queriedSnapshots,
            empty: queriedSnapshots.length === 0,
          })
        }
      }

      const deleteDatabaseValue = async <P extends DatabaseTable>(
        path: P,
        id: string
      ) => {
        const pathDatabase = database[path]

        if (pathDatabase == undefined) return

        // Guarda os database listeners relevantes para esse doc antes de remove-lo
        const relevantListeners = getRelevantDatabaseListeners(path, id)

        delete pathDatabase[id]

        alertListeners(path, id, relevantListeners)
      }

      const updateDatabaseValue = async <P extends DatabaseTable>(
        path: P,
        id: string,
        newValue: Partial<EntryFor<P>>
      ) => {
        if (database[path] == undefined) database[path] = {}

        const pathDatabase = database[path]

        if (pathDatabase == undefined) throw new Error('wtf just happened')

        const extraDatabaseListeners = getRelevantDatabaseListeners(path, id)

        pathDatabase[id] = {
          ...pathDatabase[id],
          ...newValue,
        }

        alertListeners(path, id, extraDatabaseListeners)
      }

      const addDatabaseValue = async <P extends DatabaseTable>(
        path: P,
        value: EntryFor<P>
      ) => {
        let id = (nextId++).toString()

        if (database[path] != undefined)
          while (id in database[path]!) id = (nextId++).toString()

        await updateDatabaseValue(path, id, value)

        return toSnapshot(path, id)
      }

      const getDatabaseValue = async <P extends ResourcePath>(
        path: P,
        id: string
      ) => {
        const value = lookupDatabase(path, id)

        return value == undefined
          ? undefined
          : parseTestSnapshot(path, id, value as Uploadable<P>)
      }

      const requireDatabaseValue = async <P extends ResourcePath>(
        path: P,
        id: string
      ) => {
        const value = await getDatabaseValue<P>(path, id)

        if (value == undefined)
          throw new Error(
            `Mocked database error — required item of id ${id} in path ${
              path as string
            } was undefined`
          )

        return value
      }

      async function indexDatabaseValues<P extends ResourcePath>(
        path: P
      ): Promise<HalfResource<P>[]>

      async function indexDatabaseValues<P extends keyof ManyToManySettings>(
        path: P
      ): Promise<ManyToManyEntry<P>[]>

      async function indexDatabaseValues<P extends DatabaseTable>(
        path: P
      ): Promise<ExternalEntryFor<P>[]> {
        const pathDatabase = database[path]

        if (pathDatabase == undefined) return []

        if (isResourcePath(path))
          return Object.entries(pathDatabase).map(
            ([id, data]) => parseTestSnapshot(path, id, data as any) as any
          )

        return Object.values(pathDatabase).map((data) => data as any)
      }

      const hasListener = <P extends ResourcePath>(path: P, id: string) => {
        const pathListeners = docListeners[path]

        return pathListeners != undefined && id in pathListeners
      }

      const hasListListener = <P extends ResourcePath>(path: P) => {
        const pathListeners = queryListeners[path]

        return pathListeners != undefined && pathListeners.length > 0
      }

      type DocumentIdSentinel = { sentinel: 'documentId' }

      mockDocumentId.mockReturnValue({
        sentinel: 'documentId',
      } as DocumentIdSentinel)

      mockCollection.mockImplementation((_, path) => path)

      // Simplifica os docs
      type MockedDoc = { path: ResourcePath; id: string }

      mockDoc.mockImplementation((path, id): MockedDoc => ({ path, id }))

      type MockedWhere = {
        filter: (
          snapshots: Snapshot<ResourcePath>[]
        ) => Snapshot<ResourcePath>[]
        id: string
      }

      mockWhere.mockImplementation(
        (
          property: keyof Uploadable<ResourcePath> | DocumentIdSentinel,
          operation: '==' | 'in',
          value: string | boolean | number | any[]
        ): MockedWhere => {
          const withId = <T>(filter: T) => ({
            filter,
            id: `${JSON.stringify(property)} ${operation} ${JSON.stringify(
              value
            )}`,
          })

          const getTarget = (snapshot: Snapshot<ResourcePath>) =>
            typeof property === 'string'
              ? snapshot.data()?.[property]
              : snapshot.id

          switch (operation) {
            case '==':
              return withId((snapshots) =>
                snapshots.filter((snapshot) => getTarget(snapshot) === value)
              )

            case 'in':
              return withId((snapshots) =>
                snapshots.filter((snapshot) =>
                  (value as any[]).includes(getTarget(snapshot))
                )
              )

            default:
              const exhaustiveCheck: never = operation
              return exhaustiveCheck
          }
        }
      )

      type MockedQuery = {
        type: 'query'
        path: ResourcePath
        filterer: MockedWhere
      }

      mockQuery.mockImplementation(
        (path: ResourcePath, ...filters: MockedWhere[]): MockedQuery => ({
          type: 'query',
          path,
          filterer: {
            filter: (snapshots: Snapshot<ResourcePath>[]) =>
              filters.reduce(
                (filteredSnapshots, { filter }) => filter(filteredSnapshots),
                snapshots
              ),

            id: filters.reduce(
              (id, filter) =>
                id.length > 0 ? `${filter.id} AND ${id}` : filter.id,
              ''
            ),
          },
        })
      )

      // Sobrescreve snapshots
      mockOnSnapshot.mockImplementation(
        (
          query: MockedDoc | MockedQuery,
          rawListener:
            | Listener<Snapshot<ResourcePath>>
            | Listener<QuerySnapshot<ResourcePath>>
        ) => {
          // TODO: ensure this log is only called as many times as necessary
          // console.log('adding listener', query)

          // Se for de um doc so
          if ('id' in query) {
            const { id, path } = query

            const listener = rawListener as Listener<Snapshot<ResourcePath>>

            // Adiciona o listener
            if (docListeners[path] == undefined) docListeners[path] = []

            const pathListeners = docListeners[path]

            if (pathListeners == undefined)
              throw new Error('Impossible! How can this be??')

            pathListeners.push({ id, listener })

            // Ja inicializa ele
            listener(toSnapshot(path, id))

            return vi.fn().mockImplementation(() => {
              if (docListeners[path] == undefined) return

              const pathListeners = docListeners[path]

              if (pathListeners == undefined)
                throw new Error('Impossible! How can this be??')

              const targetIndex = pathListeners.findIndex(
                ({ listener: storedListener }) => storedListener === listener
              )

              pathListeners.splice(targetIndex, 1)
            })
          }

          const { filterer, path } = query

          // Se for do database inteiro
          const listener = rawListener as Listener<QuerySnapshot<ResourcePath>>

          // Adiciona o listener
          if (queryListeners[path] == undefined) queryListeners[path] = []

          const pathListeners = queryListeners[path]

          if (pathListeners == undefined)
            throw new Error('Impossible (with query)! How can this be??')

          pathListeners.push({ listener, query })

          // Ja inicializa ele
          const initialValue = filterer.filter(allSnapshots(path))

          listener({ docs: initialValue, empty: initialValue.length === 0 })

          return vi.fn().mockImplementation(() => {
            if (queryListeners[path] == undefined) return

            const pathListeners = queryListeners[path]

            if (pathListeners == undefined)
              throw new Error('Impossible (with query)! How can this be??')

            const targetIndex = pathListeners.findIndex(
              ({ listener: storedListener }) => storedListener === listener
            )

            pathListeners.splice(targetIndex, 1)
          })
        }
      )

      mockAddDoc.mockImplementation(addDatabaseValue)

      mockUpdateDoc.mockImplementation(async ({ id, path }: MockedDoc, data) =>
        updateDatabaseValue(path, id, data)
      )

      mockDeleteDoc.mockImplementation(async ({ id, path }: MockedDoc) => {
        if (database[path] != undefined) delete database[path]![id]
      })

      mockSetDoc.mockImplementation(async ({ id, path }: MockedDoc, data) => {
        if (database[path] == undefined) database[path] = {}

        const pathDatabase = database[path]

        if (pathDatabase == undefined) throw new Error('wtf just happened')

        pathDatabase[id] = {
          ...data,
          createdAt: data[id]?.createdAt ?? new Date().toJSON(),
          modifiedAt: new Date().toJSON(),
        }

        alertListeners(path, id)
      })

      mockGetDoc.mockImplementation(async ({ id, path }: MockedDoc) =>
        toSnapshot(path, id)
      )

      mockGetDocs.mockImplementation(
        async ({ filterer, path }: MockedQuery) => ({
          docs: filterer.filter(allSnapshots(path)),
        })
      )

      return {
        getDatabaseValue,
        requireDatabaseValue,
        indexDatabaseValues,
        updateDatabaseValue,
        deleteDatabaseValue,
        addDatabaseValue,
        hasListener,
        hasListListener,
        toSnapshot,
        allSnapshots,
      }
    },
  }
}

export const mockDate = '2019-04-22T10:20:30Z'
export const RealDate = Date

export const applyDateMock = () =>
  (global.Date = vi
    .fn()
    .mockReturnValue(new Date(mockDate)) as unknown as DateConstructor)

afterEach(() => {
  global.Date = RealDate
})

export const mockFantasyDatabase = createDatabase(fantasyVase).init
