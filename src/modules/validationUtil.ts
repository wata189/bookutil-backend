import {Response} from 'express';

import * as util from "./util";
import * as errorUtil from "./errorUtil";
import * as firestoreUtil from "./firestoreUtil";
import { systemLogger } from './logUtil';

export const isAuth = (res:Response, isAuth:boolean, isExternalCooperation?:boolean) => {
  if(!isAuth && !isExternalCooperation){
    errorUtil.throwError(res, "ログインをしてください", util.STATUS_CODES.UNAUTHORIZED);
  }
};

const NOT_EXISTS:unknown[] = ["", null, undefined, NaN];
const isExist = (val:unknown) => {
  return !NOT_EXISTS.includes(val);
};
const isExistArray = (val:any[]) => {
  return val.length > 0;
};
const isFlg = (val:any) => {
  return val === 1 || val === 0;
};
const isNumber = (val:number) => {
  const regex1 = /^-?[0-9]$/;
  const regex10 = /^-?[0-9]*\.?[0-9]+$/;

  return regex10.test(val.toString()) || regex1.test(val.toString());
};
const isPlus = (val:number) => {
  return val > 0;
};
const isIsbn = (val:string) => {
  return util.isIsbn(val);
};
const isUrl = (val:string) => {
  const regex = /^https?:/;
  return regex.test(val);
};

type ValidationCmd = {
  param: any,
  func: (val:any) => boolean
}
export const isValidBook = (res:Response, params:any) => {
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.bookName, func: isExist},
      {param: params.newBookCheckFlg, func: isFlg},
      {param: params.user, func: isExist}
    ];
  
    if(isExist(params.isbn)){
      validationCmds.push({param:params.isbn.toString(), func: isIsbn})
    }
    if(isExist(params.page)){
      validationCmds.push({param:params.page, func:isNumber});
      validationCmds.push({param:Number(params.page), func: isPlus})
    }
    if(isExist(params.otherUrl)){
      validationCmds.push({param:params.otherUrl, func: isUrl});
    }
    if(isExist(params.coverUrl)){
      validationCmds.push({param:params.coverUrl, func: isUrl});
    }

    for(const cmd of validationCmds){
      const isValid = cmd.func(cmd.param);
      // エラーあったらその時点で終了
      if(!isValid){
        errorUtil.throwError(res, `不正なパラメータがあります`, util.STATUS_CODES.BAD_REQUEST);
      }
    }

  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, `不正なパラメータがあります`, util.STATUS_CODES.BAD_REQUEST);
  }
};

//ISBN被りチェック　新規作成
export const isCreateUniqueIsbn = async (res:Response, isbn:string|null, fs:firestoreUtil.FirestoreTransaction) => {
  // isbn空の場合は問題なし
  if(!isExist(isbn)) return;

  const result = await fs.getCollection("t_toread_book", "isbn", firestoreUtil.createWhere("isbn", "==", isbn));
  if(result.length > 0){
    errorUtil.throwError(res, `同じISBNの本があります`, util.STATUS_CODES.BAD_REQUEST);
  }
};