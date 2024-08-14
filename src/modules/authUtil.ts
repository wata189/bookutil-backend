import { systemLogger } from "./logUtil";
import * as util from "./util";
import * as firestoreUtil from "./firestoreUtil";

import * as admin from "firebase-admin";
import * as auth from "firebase-admin/auth";

const USE_AUTH = process.env.USE_AUTH === "true";
const IS_AUTH = process.env.IS_AUTH === "true";

const initApp = admin.initializeApp(
  {
    credential: admin.credential.applicationDefault(),
  },
  "auth"
);
const firebaseAuth = auth.getAuth(initApp);

export const decodeToken = async (
  idToken: string
): Promise<auth.DecodedIdToken> => {
  return await firebaseAuth.verifyIdToken(idToken);
};

// トークンが使えるか確認する処理
export const isAuth = async (
  idToken: string | null,
  fs: firestoreUtil.FirestoreTransaction
): Promise<boolean> => {
  // 開発環境の場合は環境変数を見る
  if (util.isEnv() && !USE_AUTH) {
    systemLogger.warn("env not use auth");
    return IS_AUTH;
  }

  // アクセストークンない場合はfalse返却
  if (!idToken) {
    systemLogger.warn("アクセストークンなし");
    return false;
  }

  try {
    // idTokenデコードしてエラーでなければ認証OK
    const decodedToken = await decodeToken(idToken);
    // expはエポック秒なので、エポックミリ秒に変換
    const expMilliSecond = decodedToken.exp * 1000;
    const loginUser = await fs.getCollection(
      firestoreUtil.COLLECTION_PATH.M_USER,
      "email",
      "email",
      "==",
      decodedToken.email
    );
    if (expMilliSecond < new Date().getTime()) {
      systemLogger.warn("期限切れ");
      return false;
    } else if (loginUser.length === 0) {
      systemLogger.warn("ログインユーザーが不正");
      return false;
    } else {
      systemLogger.debug("認証ok");
      return true;
    }
  } catch (e) {
    systemLogger.warn("その他認証エラー");
    systemLogger.warn(e);
    return false;
  }
};
