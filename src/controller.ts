import express, { RequestHandler, Request, Response, NextFunction } from "express";
import { STATUS_CODES, sendJson } from "./modules/util";
import { throwError } from "./modules/errorUtil";

// ルーティングする
const router = express.Router();

// 非同期メソッドをラップする関数
interface PromiseRequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<unknown>;
}
export const wrapAsyncMiddleware = (
  fn: PromiseRequestHandler
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
};

// ルーティング
router.get('/', (req, res) => {
  res.status(STATUS_CODES.OK)
  sendJson(res, 'HelloWorld!', {});
});
router.get('/libraries/fetch', wrapAsyncMiddleware(async (req, res) => {
  res.status(STATUS_CODES.OK)
  sendJson(res, 'OK', {libraries: ['北区図書館']});
}));

//routerをモジュールとして扱う準備
module.exports = router;