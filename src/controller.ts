import express, { RequestHandler, Request, Response, NextFunction } from "express";
import * as models from "./modules/models";
import * as util from "./modules/util";
import * as errorUtil from "./modules/errorUtil";
import * as authUtil from "./modules/authUtil";
import * as firestoreUtil from "./modules/firestoreUtil";

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

//////////// ルーティング
//図書館リスト取得
router.get('/libraries/fetch', wrapAsyncMiddleware(async (req, res) => {
  const isAuth = await authUtil.isAuth(req.query.accessToken?.toString());

  //ログイン済みでなければログインエラー
  if(!isAuth) errorUtil.throwError(res, "ログインをしてください", util.STATUS_CODES.UNAUTHORIZED)

  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    const libraries = await models.fetchLibraries(fs)
    return {libraries};
  }]);
  res.status(util.STATUS_CODES.OK)
  util.sendJson(res, 'OK', data);
}));

//Toread初期処理
router.get("/toread/init", wrapAsyncMiddleware(async (req, res) => {
  const isAuth = await authUtil.isAuth(req.query.accessToken?.toString());

  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));

//routerをモジュールとして扱う準備
module.exports = router;