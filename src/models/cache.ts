import memored from 'memored';
import { CronJob } from 'cron';

export default class Caching {
  private _data: Map<string, string> = new Map();

  constructor() {
    memored.setup({
      purgeInterval: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    new CronJob('0 */12 * * *', () => this.clearLocal(), null, true, 'America/New_York');
  }

  async get(key: string): Promise<string> {
    if (this._data.has(key)) {
      return this._data.get(key);
    }

    return new Promise((resolve, reject) => {
      memored.read(key, (err: any, val: string) => {
        if (err) return reject(err);
        resolve(val);
      });
    });
  }

  async set(key: string, val: string): Promise<number> {
    return new Promise((resolve, reject) => {
      memored.store(key, val, (err: any, expTime: number) => {
        if (err) return reject(err);
        resolve(expTime);

        this._data.set(key, val);
      });
    });
  }

  private async clearLocal() {
    const size = +this._data.size.toString();
    this._data.clear();

    console.log(`Map cleared, before: ${size} items, now: ${this._data.size} items.`);
  }
}
