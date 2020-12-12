import morgan from 'morgan';
import compression from 'compression';
import bodyParser from "body-parser";
import helmet from 'helmet';
import { TedisPool } from "tedis";
import throng from 'throng';
import cors from 'cors';
import App from "./app";
import HomeController from "./controllers/home";
import ContractController from './controllers/contract';

const regex = /\/\/([^:]+):([^@]+)@([^:]+):([^/]+)/gm;
const str = process.env.REDIS_URL;

const resArr = regex.exec(str);

const tedispool = new TedisPool({
  password: resArr[2],
  host: resArr[3],
  port: +resArr[4]
});

const worker = () => {
  console.log(`Started worker ${process.pid}`);

  const app = new App({
    port: 5000,
    controllers: [
      new HomeController(),
      new ContractController(tedispool)
    ],
    middleWares: [
      morgan('tiny'),
      bodyParser.json(),
      bodyParser.urlencoded({extended: true}),
      compression(),
      helmet(),
      cors()
    ]
  });

  app.listen();

 
  process.on('SIGTERM', () => {
    console.log(`Worker ${process.pid} exiting (cleanup here)`);
    tedispool.release();
  });
};

const WORKERS = +(process.env.WEB_CONCURRENCY || 1);
throng({
  count: WORKERS,
  lifetime: Infinity,
  worker
});
