import cluster from 'cluster';
import morgan from 'morgan';
import os from 'os';
import compression from 'compression';
import bodyParser from "body-parser";
import helmet from 'helmet';
import App from "./app";
import HomeController from "./controllers/home";
import { TedisPool } from "tedis";
import ContractController from './controllers/contract';

const regex = /\/\/([^:]+):([^@]+)@([^:]+):([^/]+)/gm;
const str = process.env.REDIS_URL;

const resArr = regex.exec(str);

const tedispool = new TedisPool({
  password: resArr[2],
  host: resArr[3],
  port: +resArr[4]
});

const workers = [];

const setupWorkerProcesses = () => {
  const numCores = os.cpus().length;
  console.log(`Master cluster setting up ${numCores} workers.`);

  for(let i = 0; i < numCores; i++) {
    workers.push(cluster.fork());

    workers[i].on('message', (msg: any) => {
      console.log(msg);
    });
  }

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is listening.`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    const index = workers.findIndex((w: cluster.Worker) => {
      return w.process.pid === worker.process.pid;
    });
    if(index >= 0) workers.splice(index, 1);

    console.log(`Starting a new worker...`);
    workers.push(cluster.fork());

    workers[workers.length - 1].on('message', (msg: any) => {
      console.log(msg);
    });
  });
};

const setupExpress = () => {
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
      helmet()
    ]
  });

  app.listen();
};

if(cluster.isMaster) {
  setupWorkerProcesses();
} else {
  setupExpress();
}