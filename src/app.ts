import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";

import { systemLogger, connectAccessLogger } from "./modules/logUtil";
import * as errorUtil from "./modules/errorUtil";

const app: Application = express();

//helmetでCSPなどの設定
app.use(helmet());
//corsの設定
const corsOptions = {
  origin: process.env.CLIENT_URL || "",
  allowedHeaders: "*",
  methods: "*",
  credentials: true,
};
app.use(cors(corsOptions));

//body-parserの設定
import bodyParser from "body-parser";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// accessログ
app.use(connectAccessLogger);

// ルーティング
import { router } from "./controller";
app.use("/", router);

app.use(errorUtil.catchNotFound); // いずれのルーティングにもマッチしない(=NOT FOUND)をキャッチ
app.use(errorUtil.catchError); // すべてのエラーをキャッチ

const port = process.env.PORT || 8080;
try {
  app.listen(port, () => {
    systemLogger.info(`Running at Port ${port}...`);
  });
} catch (e) {
  if (e instanceof Error) {
    systemLogger.error(e);
  }
}
