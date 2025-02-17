import type { KVNamespace } from '@cloudflare/workers-types';

declare global {
    var __KV__: KVNamespace;
}

/**
 * Helper class for interacting with Cloudflare's KV (Key-Value) storage.
 * Provides methods to get and manage data in the KV namespace.
 */
export class KV {
    /**
     * Retrieves the KV client instance.
     * @throws {Error} If the KV namespace is not initialized.
     * @returns {KVNamespace} The KV client instance.
     */
    private static getClient(): KVNamespace {
        if (!globalThis.__KV__) {
            throw new Error('KV namespace not initialized');
        }
        return globalThis.__KV__;
    }

    /**
     * Retrieves a value from the KV storage by its key.
     * @param {string} key - The key to retrieve the value for.
     * @returns {Promise<any>} The parsed value if found, or `null` if the key does not exist.
     */
    static async get(key: string): Promise<any> {
        const client = this.getClient();
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    }
}
