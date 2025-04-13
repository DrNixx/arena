import { getSdk } from './sdk';

export default {
  get,
  set,
  remove,
}

function get<T>(k: string): Promise<T | null> {
  return getSdk()
    .getStorage()
      .then((storage) => { 
        const item = storage.getItem(k);
        return item ? JSON.parse(item) as T : null
      })
      .catch(() => null)
}

function remove(k: string): Promise<void> {
  return getSdk()
    .getStorage()
        .then((storage) => { 
            storage.removeItem(k);
        });
}

function set<T>(k: string, v: T): Promise<T> {
    return getSdk()
        .getStorage()
            .then((storage) => { 
                storage.setItem(k, JSON.stringify(v));
                return v;
            });
}
