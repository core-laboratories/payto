import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Helper class for interacting with Cloudflare's KV (Key-Value) storage.
 * Provides methods to get and manage data in the KV namespace.
 */
export class KV {
	private static kvNamespace: KVNamespace | null = null;

	/**
	 * Initialize the KV namespace from platform environment.
	 * Should be called once per request with the KV binding from platform.env.
	 * @param kv - The KV namespace from platform.env (e.g., platform.env.KV)
	 */
	static init(kv: KVNamespace): void {
		this.kvNamespace = kv;
	}

	/**
	 * Retrieves the KV client instance.
	 * @throws {Error} If the KV namespace is not initialized.
	 * @returns {KVNamespace} The KV client instance.
	 */
	private static getClient(): KVNamespace {
		if (!this.kvNamespace) {
			throw new Error('KV namespace not initialized. Call KV.init(platform.env.KV) first.');
		}
		return this.kvNamespace;
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
