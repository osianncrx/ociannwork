const DB_NAME = 'gm-ociann-offline'
const DB_VERSION = 1
const STORE_PENDING = 'pendingMarks'
const STORE_CONFIG = 'offlineConfig'

interface PendingMark {
  id?: number
  tipoMarca: number
  hora: string
  timestamp: number
  synced: boolean
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Save a mark to IndexedDB when offline
 */
export async function savePendingMark(tipoMarca: number, hora: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_PENDING, 'readwrite')
  const store = tx.objectStore(STORE_PENDING)

  const mark: PendingMark = {
    tipoMarca,
    hora,
    timestamp: Date.now(),
    synced: false,
  }

  store.add(mark)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get all unsynced marks
 */
export async function getPendingMarks(): Promise<PendingMark[]> {
  const db = await openDB()
  const tx = db.transaction(STORE_PENDING, 'readonly')
  const store = tx.objectStore(STORE_PENDING)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const marks = (request.result as PendingMark[]).filter(m => !m.synced)
      resolve(marks)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark a pending mark as synced
 */
export async function markAsSynced(id: number): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_PENDING, 'readwrite')
  const store = tx.objectStore(STORE_PENDING)
  const request = store.get(id)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const mark = request.result as PendingMark
      if (mark) {
        mark.synced = true
        store.put(mark)
      }
      tx.oncomplete = () => resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all synced marks (cleanup)
 */
export async function clearSyncedMarks(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_PENDING, 'readwrite')
  const store = tx.objectStore(STORE_PENDING)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const marks = request.result as PendingMark[]
      marks.filter(m => m.synced).forEach(m => {
        if (m.id) store.delete(m.id)
      })
      tx.oncomplete = () => resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Sync pending marks to the server
 */
export async function syncPendingMarks(
  insertMarkFn: (data: { tipoMarca: number; hora: string }) => Promise<any>
): Promise<number> {
  const pending = await getPendingMarks()
  let synced = 0

  for (const mark of pending) {
    try {
      await insertMarkFn({ tipoMarca: mark.tipoMarca, hora: mark.hora })
      if (mark.id) await markAsSynced(mark.id)
      synced++
    } catch {
      // If sync fails, leave mark as pending
      break
    }
  }

  if (synced > 0) {
    await clearSyncedMarks()
  }

  return synced
}

/**
 * Check if online and start auto-sync
 */
export function startAutoSync(
  insertMarkFn: (data: { tipoMarca: number; hora: string }) => Promise<any>,
  interval = 30000
): () => void {
  const timer = setInterval(async () => {
    if (navigator.onLine) {
      const synced = await syncPendingMarks(insertMarkFn)
      if (synced > 0) {
        console.log(`[Offline Sync] ${synced} marks synchronized`)
      }
    }
  }, interval)

  // Also sync when coming back online
  const onlineHandler = async () => {
    const synced = await syncPendingMarks(insertMarkFn)
    if (synced > 0) {
      console.log(`[Offline Sync] ${synced} marks synchronized on reconnect`)
    }
  }
  window.addEventListener('online', onlineHandler)

  return () => {
    clearInterval(timer)
    window.removeEventListener('online', onlineHandler)
  }
}

/**
 * Register the service worker
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw-attendance.js').then(
        (registration) => {
          console.log('[SW] Registered:', registration.scope)
        },
        (error) => {
          console.error('[SW] Registration failed:', error)
        }
      )
    })
  }
}
