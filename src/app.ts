import express, { Application, RequestHandler, Request, Response, NextFunction } from "express";

import {STATUS_CODES, sendJson} from './modules/util';
import {catchError, catchNotFound} from './modules/errorUtil';

const app: Application = express();

//TODO:corsの設定

//body-parserの設定
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// TODO:accessログ
// app.use(connectAccessLogger);

// ルーティング
const router = require("./controller.ts");
app.use("/", router);

app.use(catchNotFound); // いずれのルーティングにもマッチしない(=NOT FOUND)をキャッチ
app.use(catchError); // すべてのエラーをキャッチ

const port = process.env.PORT || 8080;
try {
  app.listen(port, () => {
    // TODO: ロガーのログ使う
    console.log(`Running at Port ${port}...`);
  });
} catch (e) {
  if (e instanceof Error) {
    // TODO: ロガーのログ使う
    console.error(e.message);
  }
}