const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Distributed Counter for High-Scale Applications
 * Solves the "1 write/second" limit of single Firestore documents by using shards.
 */
class DistributedCounter {
    constructor(counterRef, numShards = 10) {
        this.counterRef = counterRef;
        this.numShards = numShards; // Increase this for higher throughput
    }

    /**
     * createCounter - Initialize a distributed counter
     */
    async createCounter() {
        const batch = db.batch();

        // Initialize master doc
        batch.set(this.counterRef, { num_shards: this.numShards });

        // Initialize shards
        for (let i = 0; i < this.numShards; i++) {
            const shardRef = this.counterRef.collection('shards').doc(i.toString());
            batch.set(shardRef, { count: 0 });
        }

        await batch.commit();
    }

    /**
     * incrementBy - Increment the counter randomly choosing a shard
     * This distributes the write load.
     */
    async incrementBy(val = 1) {
        const shardId = Math.floor(Math.random() * this.numShards).toString();
        const shardRef = this.counterRef.collection('shards').doc(shardId);

        await shardRef.update('count', admin.firestore.FieldValue.increment(val));
    }

    /**
     * getCount - Aggregate all shards to get the total count
     * Note: Creates N reads where N is number of shards. Use sparingly or cache.
     */
    async getCount() {
        const querySnapshot = await this.counterRef.collection('shards').get();
        let total = 0;
        querySnapshot.forEach(doc => {
            total += doc.data().count || 0;
        });
        return total;
    }
}

module.exports = DistributedCounter;
