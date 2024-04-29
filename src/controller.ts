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
router.post('/libraries/fetch', wrapAsyncMiddleware(async (req, res) => {
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    const isAuth = await authUtil.isAuth(req.body.idToken?.toString(), fs);
  
    //ログイン済みでも外部連携でもなければログインエラー
    validationUtil.isAuth(res, isAuth);

    const libraries = await models.fetchLibraries(fs)
    return {libraries};
  }]);
  res.status(util.STATUS_CODES.OK)
  util.sendJson(res, 'OK', data);
}));

//Toread初期処理
router.post("/toread/init", wrapAsyncMiddleware(async (req, res) => {
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    const isAuth = await authUtil.isAuth(req.body.idToken?.toString(), fs);
  
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));

//Toread新規作成
router.post("/toread/create", wrapAsyncMiddleware(async (req, res) => {
  const params:models.BookParams = req.body;
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {

    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでも外部連携でもなければログインエラー
    validationUtil.isAuth(res, isAuth, params.isExternalCooperation);
    //パラメータチェック
    validationUtil.isValidBook(res, params);
  
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

//Toread更新
router.post("/toread/update", wrapAsyncMiddleware(async (req, res) => {
  const params:models.BookParams = req.body;
  const documentId = params.documentId || "";
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {

    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでなければログインエラー
    validationUtil.isAuth(res, isAuth);
    //パラメータチェック
    validationUtil.isValidBook(res, params);
    //form情報以外のパラメータチェック
    validationUtil.isValidUpdateBook(res, params);
    //ID存在チェック
    await validationUtil.isExistBookId(res, documentId, fs);
    //ISBN被りチェック
    await validationUtil.isUpdateUniqueIsbn(res, documentId, params.isbn, fs);
    //コンフリクトチェック
    await validationUtil.isNotConflictBook(res, documentId, params.updateAt, fs);

    //DB更新
    await models.updateToreadBook(documentId, params, fs);
    return;
  }, async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));

//Toread削除
router.post("/toread/delete", wrapAsyncMiddleware(async (req, res) => {
  const params:models.SimpleBooksParams = req.body;
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {

    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでなければログインエラー
    validationUtil.isAuth(res, isAuth);
    //パラメータチェック
    validationUtil.isValidBooks(res, params);
    //ID存在チェック
    await validationUtil.isExistBooksId(res, params.books, fs);
    //コンフリクトチェック
    await validationUtil.isNotConflictBooks(res, params.books, fs);

    //DBで削除
    await models.deleteToreadBooks(params.books, fs);

    return;
  }, async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));

//Toreadタグ追加
router.post("/toread/tag/add", wrapAsyncMiddleware(async (req, res) => {
  const params:models.SimpleBooksParams = req.body;
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでなければログインエラー
    validationUtil.isAuth(res, isAuth);
    //パラメータチェック
    validationUtil.isValidBooks(res, params);
    //タグのパラメータチェック
    validationUtil.isValidTag(res, params);
    //ID存在チェック
    await validationUtil.isExistBooksId(res, params.books, fs);
    //コンフリクトチェック
    await validationUtil.isNotConflictBooks(res, params.books, fs);

    //DBに格納
    await models.addToreadTag(params, fs);

    return;
  }, async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));

// よみたいタグ追加
router.post("/toread/tag/want/add", wrapAsyncMiddleware(async (req, res) => {
  const params:models.SimpleBookParams = req.body;
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでなければログインエラー
    validationUtil.isAuth(res, isAuth);
    //パラメータチェック
    validationUtil.isValidSimpleBook(res, params);
    //ID存在チェック
    await validationUtil.isExistBookId(res, params.book.documentId, fs);
    //コンフリクトチェック
    await validationUtil.isNotConflictBook(res, params.book.documentId, params.book.updateAt, fs);

    await models.addWantTag(res, params, fs);
    return;
  }, async (fs:firestoreUtil.FirestoreTransaction) => {
    return await models.initToread(isAuth, fs);
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));
// よみたいタグ検索
router.post("/toread/tag/want/get", wrapAsyncMiddleware(async (req, res) => {
  const params:models.GetWantTagParams = req.body;
  let isAuth = false;
  const data:Object = await firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
    isAuth = await authUtil.isAuth(params.idToken, fs);
    //ログイン済みでなければログインエラー
    validationUtil.isAuth(res, isAuth);
    //パラメータチェック
    validationUtil.isValidGetWantTagParams(res, params);

    // タグ取得
    const wantTags = [];
    const libraryTag = await models.findLibraryTag(params.isbn, fs);
    
    return {libraryTag};
  }]);
  res.status(util.STATUS_CODES.OK);
  util.sendJson(res, 'OK', data);
}));


//routerをモジュールとして扱う準備
module.exports = router;