import { expose } from 'threads/worker';
import { run } from 'ar-gql';
import Arweave from 'arweave';
import { readContract } from 'smartweave';

expose({
  latestInteraction: async (contract: string, block: number): Promise<string> => {
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
  },
  getContractState: async (arweaveConfig: {host: string, port: number, protocol: string}, contractId: string, height: number) => {
    const {host, port, protocol} = arweaveConfig;
    const arweave = Arweave.init({
      host,
      port,
      protocol
    });
    return readContract(arweave, contractId, height);
  }
});