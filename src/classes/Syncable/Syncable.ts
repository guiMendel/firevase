import {
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  onSnapshot,
} from 'firebase/firestore'
import { Fetcher } from '../Fetcher'

export class Syncable<T extends DocumentReference | Query> extends Fetcher<
  T,
  T extends Query ? QuerySnapshot : DocumentSnapshot
> {
  protected fetchImplementation = async () => {
    const cleanupListener = onSnapshot(
      this._target as any,
      (snapshot: QuerySnapshot | DocumentSnapshot) => {
        this._hasLoaded = true

        this.emitFetch(
          snapshot as T extends Query ? QuerySnapshot : DocumentSnapshot,
          this.cleanup
        )
      }
    )

    this.cleanup.add(cleanupListener)
  }
}
