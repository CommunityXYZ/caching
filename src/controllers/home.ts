import * as express from 'express';

export default class HomeController {
  path = '/';
  router = express.Router();

  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get(this.path, this.index);
  }

  private index(req: express.Request, res: express.Response) {
    res.send('hello-world');
  }
}
