import { all } from "ar-gql";
import memored from 'memored';

export default class Contracts{
    private contractIDs:Set<string>=new Set();
    
      async update():Promise<number>{
        setTimeout(()=>this.update() , 30 * 60000);
        this.contractIDs=await this.getAllFromSources();
        return new Promise((resolve, reject) => {  
          memored.store('trustedContracts',this.contractIDs, (err: any, expTime: number) => {
            if (err) return reject(err);
            resolve(expTime);
          });
        });
    }

    async isValid(contractId:string):Promise<boolean>{
      return this.contractIDs.has(contractId);
    }

    async getAllFromSources(): Promise<Set<string>> {
         
        const res = await all(
          `
        query($cursor: String, $sources: [String!]!) {
          transactions(
            tags: [
              { name: "Contract-Src", values: $sources },
              { name: "App-Name", values: "SmartWeaveContract"},
              { name: "Content-Type", values: "application/json"}
            ]
            after: $cursor
            first: 100
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
              }
            }
          }
        }`,
        {
          sources: ['ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI'],
        },
        );
        return new Set(res.map((r) => (
          r.node.id
        )));
      };
}