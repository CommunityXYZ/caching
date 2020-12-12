import express from 'express';
import { run } from 'ar-gql';
import Arweave from 'arweave';
import { TedisPool } from 'tedis';
import { readContract } from 'smartweave';

export default class ContractController {
  path = '/contract';
  router = express.Router();

  private arweave: Arweave;
  private tedisPool: TedisPool;

  constructor(tedispool: TedisPool) {
    this.tedisPool = tedispool;

    this.arweave = Arweave.init({
      host: 'arweave.net',
      protocol: 'https',
      port: 443
    });

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

    if(!contract || !/[a-z0-9_-]{43}/i.test(contract)) {
      return res.redirect('/');
    }

    const cacheKey = `smartweave-${contract}-${height}`;

    const client = await this.tedisPool.getTedis();
    const latest = await this.latestInteraction(contract, height);

    const result = await client.get(cacheKey);
    if(result) {
      const cache = JSON.parse(result.toString());

      if(cache.latest === latest) {
        this.tedisPool.putTedis(client);
        this.tedisPool.release();

        console.log('From cache!');
        return res.json(cache.state);
      }
    }

    const state = await readContract(this.arweave, contract, height);
    await client.set(cacheKey, JSON.stringify({latest, state}));

    this.tedisPool.putTedis(client);
    this.tedisPool.release();

    console.log('Not from cache!');
    return res.json(state);
  }

  async latestInteraction (
    contract: string,
    block: number
  ): Promise<string> {
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
        }
      )
    ).data.transactions.edges[0]?.node.id;
  };
}