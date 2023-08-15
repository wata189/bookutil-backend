import express, { RequestHandler, Request, Response, NextFunction } from "express";
import * as models from "./modules/models";
import * as util from "./modules/util";
import * as validationUtil from "./modules/validationUtil";
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

  //ログイン済みでも外部連携でもなければログインエラー
  validationUtil.isAuth(res, isAuth);

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

//Toread新規作成
router.post("/toread/create", wrapAsyncMiddleware(async (req, res) => {
  const params:models.BookParams = req.body;

  const isAuth = await authUtil.isAuth(params.accessToken);
  //ログイン済みでも外部連携でもなければログインエラー
  validationUtil.isAuth(res, isAuth, params.isExternalCooperation);
  //パラメータチェック
  validationUtil.isValidBook(res, params);

  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    //ISBN被りチェック
    await validationUtil.isCreateUniqueIsbn(res, params.isbn, fs);
    //DBに格納
    await models.createToreadBook(params, fs);
    return;
  },async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);

}));

//routerをモジュールとして扱う準備
module.exports = router;