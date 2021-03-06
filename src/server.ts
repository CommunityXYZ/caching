import morgan from 'morgan';
import compression from 'compression';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import throng from 'throng';
import cors from 'cors';
import memored from 'memored';
import App from './app';
import HomeController from './controllers/home';
import ContractController from './controllers/contract';
import Arweave from 'arweave';

const worker = (id: string, disconnect: any) => {
  console.log(`Started worker ${id}`);

  const arweaveInstance = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443,
    timeout: 100000,
  });

  const app = new App({
    port: 5000,
    controllers: [new HomeController(), new ContractController(arweaveInstance)],
    middleWares: [
      morgan('tiny'),
      bodyParser.json(),
      bodyParser.urlencoded({ extended: true }),
      compression(),
      helmet(),
      cors(),
    ],
  });

  app.listen();

  process.on('SIGTERM', () => {
    console.log(`Worker ${id} exiting (cleanup here)`);
    disconnect();
  });
};

memored.setup({
  purgeInterval: 2147483647, // 24.8 days (max value for int)
});

const WORKERS = +(process.env.WEB_CONCURRENCY || 1);
throng({
  count: WORKERS,
  lifetime: Infinity,
  // @ts-ignore
  worker,
});
