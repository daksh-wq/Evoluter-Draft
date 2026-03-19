/**
 * Offline Sync Service
 * MF-3: Queue for operations made while offline
 * 
 * Stores pending operations in localStorage and syncs when
 * the browser comes back online.
 */
import logger from '../utils/logger';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const QUEUE_KEY = 'evoluter_offline_queue';

/**
 * Get the current offline sync queue
 * @returns {Array} Pending operations
 */
function getQueue() {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Save the queue to localStorage
 * @param {Array} queue - Updated queue
 */
function saveQueue(queue) {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        logger.error('Failed to save offline queue:', error);
    }
}

/**
 * Add an operation to the offline sync queue
 * @param {string} type - Operation type (e.g., 'SUBMIT_TEST', 'TRACK_TAB_SWITCH')
 * @param {object} data - Operation data
 */
export function enqueueOperation(type, data) {
    const queue = getQueue();
    queue.push({
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        createdAt: Date.now(),
        status: 'pending'
    });
    saveQueue(queue);
    logger.info(`Queued offline operation: ${type}`);
}

/**
 * Process all pending operations in the queue
 * @returns {Promise<object>} Results of sync attempt
 */
export async function syncQueue() {
    const queue = getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    logger.info(`Syncing ${queue.length} offline operations...`);

    let synced = 0;
    let failed = 0;
    const remainingQueue = [];

    for (const op of queue) {
        try {
            const cloudFn = httpsCallable(functions, op.type);
            await cloudFn(op.data);
            synced++;
        } catch (error) {
            logger.error(`Failed to sync operation ${op.id} (${op.type}):`, error);
            failed++;

            // Retry up to 3 times
            if (!op.retryCount || op.retryCount < 3) {
                remainingQueue.push({
                    ...op,
                    retryCount: (op.retryCount || 0) + 1,
                    lastError: error.message
                });
            }
        }
    }

    saveQueue(remainingQueue);
    logger.info(`Sync complete: ${synced} synced, ${failed} failed, ${remainingQueue.length} queued for retry`);

    return { synced, failed, remaining: remainingQueue.length };
}

/**
 * Get the current queue size
 * @returns {number} Number of pending operations
 */
export function getQueueSize() {
    return getQueue().length;
}

/**
 * Clear the offline queue
 */
export function clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
}

/**
 * Initialize online/offline listeners for auto-sync.
 * Guard ensures listeners are only ever registered once — prevents
 * duplicate syncQueue() runs on hot reload / multiple mounts.
 */
let _offlineSyncInitialized = false;

export function initOfflineSync() {
    if (_offlineSyncInitialized) return;
    _offlineSyncInitialized = true;

    window.addEventListener('online', async () => {
        logger.info('Network online — syncing offline queue...');
        const result = await syncQueue();
        if (result.synced > 0) {
            logger.info(`Auto-synced ${result.synced} offline operations`);
        }
    });

    window.addEventListener('offline', () => {
        logger.warn('Network offline — operations will be queued');
    });
}

export default {
    enqueue: enqueueOperation,
    sync: syncQueue,
    getSize: getQueueSize,
    clear: clearQueue,
    init: initOfflineSync,
};
