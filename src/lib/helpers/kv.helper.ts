import type { KVNamespace } from '@cloudflare/workers-types';

declare global {
    var __KV__: KVNamespace;
}

export class KV {
    private static getClient(): KVNamespace {
        if (!globalThis.__KV__) {
            throw new Error('KV namespace not initialized');
        }
        return globalThis.__KV__;
    }

    static async get(key: string): Promise<any> {
        const client = this.getClient();
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    }
}
