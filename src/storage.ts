export default {
    get,
    set,
    remove,
}
  
const storage = Telegram.WebApp.DeviceStorage;
  
function get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      storage.getItem(key, (error, value) => {
          if (error !== null) {
              reject(new Error(error));
          } else {
              resolve(value ? JSON.parse(value) : null);
          }
      });
    });
}
  
function remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      storage.removeItem(key, (error) => {
          if (error) {
              reject(new Error(error));
          } else {
              resolve();
          }
      });
    });
}
  
function set<T>(key: string, v: T): Promise<T> {
    return new Promise((resolve, reject) => {
      storage.setItem(key, JSON.stringify(v), (error) => {
          if (error) {
              reject(new Error(error));
          } else {
              resolve(v);
          }
      });
    });
}
