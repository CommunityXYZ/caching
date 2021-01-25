import express from 'express';
import { run } from 'ar-gql';
import Arweave from 'arweave';
import { readContract } from 'smartweave';
import Caching from '../models/cache';

const cache = new Caching();

export default class ContractController {
  path = '/contract';
  router = express.Router();

  private arweave: Arweave;

  constructor(arweaveInstance: Arweave) {
    this.arweave = arweaveInstance;
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get(`${this.path}/:contractId?/:height?`, (req, res) => {
      this.index(req, res);
    });
  }

  private async index(req: express.Request, res: express.Response) {
    const contract = req.params.contractId;
    const height = +(req.params.height || (await this.arweave.network.getInfo()).height);

    if (!contract || !/[a-z0-9_-]{43}/i.test(contract)) {
      return res.redirect('/');
    }

    const latest = await this.latestInteraction(contract, height);

    const cacheKey = `smartweave-${contract}-${latest}`;

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

    const state = await readContract(this.arweave, contract, height);

    cache.set(cacheKey, JSON.stringify({ latest, state })).catch((e) => console.log(e));

    console.log('Not from cache!');
    return res.json(state);
  }

  async latestInteraction(contract: string, block: number): Promise<string> {
    return (
      await run(
        `
          query($contract: [String!]!, $block: Int) {
            transactions(
              tags: [
                { name: "App-Name", values: "SmartWeaveAction" }
                { name: "Contract", values: $contract }
              ]
              first: 1
              block: { max: $block }
            ) {
              edges {
                node {
                  id
                }
              }
            }
          }    
        `,
        {
          contract,
          block,
        },
      )
    ).data.transactions.edges[0]?.node.id;
  }
}
