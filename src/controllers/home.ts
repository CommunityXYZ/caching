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
    const users = [
      {
          id: 1,
          name: 'Ali'
      },
      {
          id: 2,
          name: 'Can'
      },
      {
          id: 3,
          name: 'Ahmet'
      }
  ]

    res.send({ users });
  }
}