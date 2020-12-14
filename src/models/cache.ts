import memored from 'memored';

export default class Caching {
  static async get(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      memored.read(key, (err: any, val: string) => {
        if(err) return reject(err);
        resolve(val);
      });
    });
  }

  static async set(key: string, val: string|number): Promise<number> {
    return new Promise((resolve, reject) => {
      memored.store(key, val, (err: any, expTime: number) => {
        if(err) return reject(err);
        resolve(expTime);
      });
    });
  }
}