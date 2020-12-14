import morgan from 'morgan';
import compression from 'compression';
import bodyParser from "body-parser";
import helmet from 'helmet';
import throng from 'throng';
import cors from 'cors';
import App from "./app";
import HomeController from "./controllers/home";
import ContractController from './controllers/contract';

const worker = (id: string, disconnect: any) => {
  console.log(`Started worker ${id}`);

  const app = new App({
    port: 5000,
    controllers: [
      new HomeController(),
      new ContractController()
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
    console.log(`Worker ${id} exiting (cleanup here)`);
    disconnect();
  });
};

const WORKERS = +(process.env.WEB_CONCURRENCY || 1);

throng({
  count: WORKERS,
  lifetime: Infinity,
  // @ts-ignore
  worker
});
