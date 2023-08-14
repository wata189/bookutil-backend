import { systemLogger } from "./logUtil";
import * as util from "./util";

import { CognitoJwtVerifier } from "aws-jwt-verify";

const USE_AUTH = process.env.USE_AUTH === "true";
const IS_AUTH = process.env.IS_AUTH === "true";

const COGNITO_AUTH_REGION = process.env.COGNITO_AUTH_REGION || "";
const COGNITO_AUTH_USER_POOL_ID = process.env.COGNITO_AUTH_USER_POOL_ID || "";
const COGNITO_CRIENT_ID = process.env.COGNITO_CRIENT_ID || "";
const COGNITO_TOKEN_USE = "access";

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_AUTH_USER_POOL_ID,
  tokenUse: COGNITO_TOKEN_USE,
  clientId: COGNITO_CRIENT_ID
});

// TODO: トークンが使えるか確認する処理
export const isAuth = async (accessToken:string|undefined):Promise<boolean> => {
  // 開発環境の場合は環境変数を見る
  if(util.isEnv() && !USE_AUTH){
    systemLogger.warn("env not use auth");
    return IS_AUTH;
  } 

  // アクセストークンない場合はfalse返却
  if(!accessToken){
    systemLogger.warn("アクセストークンなし")
    return false;
  }

  try{
    // ペイロード実行　エラーでなければ認証OK
    const payload = await verifier.verify(
      accessToken
    );
    // payload.expはエポック秒なので、エポックミリ秒に変換
    const expMilliSecond = payload.exp * 1000;
    if(expMilliSecond > (new Date()).getTime()){
      systemLogger.debug("認証ok");
      return true;
    }else{
      systemLogger.warn("期限切れ");
      return false;
    }

  }catch(e){
    systemLogger.warn("その他認証エラー")
    systemLogger.warn(e);
    return false;
  }
  
};