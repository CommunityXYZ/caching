import express from 'express';
import Arweave from 'arweave';
import { readContract } from 'smartweave';
import Caching from '../models/cache';
import Contracts from '../controllers/contracts';
import {spawn, Thread, Worker} from 'threads';

const cache = new Caching();
const contracts = new Contracts();

export default class ContractController {
  path = '/contract';
  router = express.Router();

  private workers;

  private arweave: Arweave;
  private height: number;

  constructor(arweaveInstance: Arweave) {
    this.arweave = arweaveInstance;
    this.initWorkers();
    this.initRoutes();
    this.updateHeight();
  }

  private async initWorkers() {
    this.workers = await spawn(new Worker('../workers/contract'));
  }

  private initRoutes() {
    this.router.get(`${this.path}/:contractId?/:height?`, (req, res) => {
      this.index(req, res);
    });
  }

  private async index(req: express.Request, res: express.Response) {
    let height = +(req.params.height || this.height);
    if (!height || height < 0) {
      this.updateHeight(false);
      height = this.height;
    }
    const contractId = req.params.contractId;

    if (!contractId || !/[a-z0-9_-]{43}/i.test(contractId)) {
      return res.redirect('/');
    }

    if ((await contracts.isValid(contractId)) === false) {
      return res.json({ error: true, errorMessage: "This contract doesn't use the source from Community" });
    }

    const latest = await this.workers.latestInteraction(contractId, height);

    const cacheKey = `smartweave-${contractId}-${latest}`;

    let result: string = null;
    try {
      result = await cache.get(cacheKey);
    } catch (e) {
      console.log(e);
    }

    if (result) {
      const cache = JSON.parse(result.toString());

      if (cache.latest === latest) {
        console.log('From cache!');
        return res.json(cache.state);
      }
    }

    const state = await this.workers.getContractState({
      host: this.arweave.getConfig().api.host,
      port: this.arweave.getConfig().api.port,
      protocol: this.arweave.getConfig().api.protocol
    },contractId, height);
    cache.set(cacheKey, JSON.stringify({ latest, state })).catch((e) => console.log(e));

    console.log('Not from cache!');
    return res.json(state);
  }

  async updateHeight(sync = true) {
    try {
      this.height = +(await this.arweave.network.getInfo()).height;
    } catch (e) {
      console.log(e);
    }

    if (sync) setTimeout(() => this.updateHeight(), 2 * 60000);
  }
}
