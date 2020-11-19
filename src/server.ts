import { TedisPool } from "tedis";
import express from 'express';
import cluster from 'cluster';
import morgan from 'morgan';
import * as os from 'os';
import bodyParser from "body-parser";

const regex = /\/\/([^:]+):([^@]+)@([^:]+):([^/]+)/gm;
const str = process.env.REDIS_URL;

const resArr = regex.exec(str);

const tedispool = new TedisPool({
  password: resArr[2],
  host: resArr[3],
  port: +resArr[4]
});

const app = express();
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
  app.use(morgan('tiny'));
  app.use(bodyParser.json());
  app.disable('x-powered-by');

  app.listen(8080, () => {
    console.log(`Started server on => http://localhost:8080, from process: ${process.pid}`);
  });

  app.on('error', () => {
    console.error('app error', app.stack);
    console.error('on url', app.request.url);
    console.error('with headers', app.request.header);
  });
};

if(cluster.isMaster) {
  setupWorkerProcesses();
} else {
  setupExpress();
}