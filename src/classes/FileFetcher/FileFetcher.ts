import { firevaseEvents } from '@/events'
import { StorageReference, getDownloadURL } from 'firebase/storage'
import { Fetcher } from '../Fetcher'

export class FileFetcher extends Fetcher<StorageReference, string> {
  protected fetchImplementation = async () => {
    const fetchFile = async () => {
      if (this._target == undefined) return

      try {
        const url = await getDownloadURL(this._target)

        this._hasLoaded = true

        this.emitFetch(url, this.cleanup)
      } catch (error) {
        this._hasLoaded = true

        this.emitFetch('', this.cleanup)

        this.handleError(error as any)
      }
    }

    const handleFileUploaded = (storageRef: StorageReference) => {
      // Ignore if it's not the same file
      if (this._target && storageRef.fullPath === this._target.fullPath)
        fetchFile()
    }

    // Subscribe to file submit events
    firevaseEvents.addListener('fileUploaded', handleFileUploaded)

    // Cleanup
    this.getCleanupManager().add(() =>
      firevaseEvents.removeListener('fileUploaded', handleFileUploaded)
    )

    // Already do a fetch
    return fetchFile()
  }

  private handleError = (error: { code: string }) => {
    if (error.code === 'storage/object-not-found') return

    console.error(error)
  }
}
