import { getSdk } from './sdk';

export default {
    get,
    set,
    remove,
};

async function getStorage() {
    return await getSdk().getStorage();
}

async function get<T>(k: string): Promise<T | null> {
    try {
        const storage = await getStorage();
        const item = storage.getItem(k);
        return item ? (JSON.parse(item) as T) : null;
    } catch {
        return null;
    }
}

async function remove(k: string): Promise<void> {
    const storage = await getStorage();
    storage.removeItem(k);
}

async function set<T>(k: string, v: T): Promise<T> {
    const storage = await getStorage();
    storage.setItem(k, JSON.stringify(v));
    return v;
}
