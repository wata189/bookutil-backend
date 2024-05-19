import {Response} from 'express';
import * as firestoreUtil from './firestoreUtil';
import { systemLogger } from './logUtil';

//ステータスコード定数
export const STATUS_CODES = {
  CONTINUE: 100,
  SWITCHING_PROTOCOL: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  MULTIPLE_CHOICE: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,

  INTERNAL_SERVER_ERROR: 500,
};

export const isEnv = ():boolean => {
  return process.env.ENV === "dev";
};

export const isIsbn = (isbn:string) => {
  const regex10 = /^[0-9]{9}[0-9X]$/;
  const regex13 = /^[0-9]{13}$/;
  return regex10.test(isbn) || regex13.test(isbn);
};

export const getToreadBook = async (documentId:string, fs:firestoreUtil.FirestoreTransaction) => {
  return await fs.getDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, documentId);
};
export const getBookshelfBook = async (documentId:string, fs:firestoreUtil.FirestoreTransaction) => {
  return await fs.getDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, documentId);
};

export const formatDateToStr = (date: Date, format: string) => {
  const symbol = {
    M: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    m: date.getMinutes(),
    s: date.getSeconds(),
  };

  const formatted = format.replace(/(M+|d+|h+|m+|s+)/g, (v) =>
    ((v.length > 1 ? "0" : "") + symbol[v.slice(-1) as keyof typeof symbol]).slice(-2)
  );

  return formatted.replace(/(y+)/g, (v) =>
    date.getFullYear().toString().slice(-v.length)
  );
};


// set→array変換で重複削除
// javascriptはsetも順序が保証される
export const removeDuplicateElements = (array:any[]) => {
  return [...(new Set(array))]
};

export const sendJson = (res: Response, msg?: string, data?: Object): void => {
  // 引数なかった場合の処理
  if (!res.statusCode) res.status(STATUS_CODES.OK);
  if (!msg) msg = '';
  if (!data) data = {};

  const result = {...data, status: res.statusCode, msg};
  res.json(result);

  systemLogger.info(`${res.statusCode} ${msg}`);
};

export const wait = (sec:number) => {
  return new Promise(resolve => setTimeout(resolve, sec*1000));
};

export const isbn9To10 = (isbn9:string):string => {
  const sum = isbn9.split('').reduce((acc, c, i) => {
      return acc + Number(c[0]) * (10 - i);
  }, 0);
  let checkDigit = (11 - sum % 11).toString();
  if(checkDigit === "10"){
    checkDigit = "X";
  }
  if(checkDigit === "11"){
    checkDigit = "0";
  }

  return isbn9 + checkDigit;
};

export const isbn12To13 = (isbn12: string):string => {
  // チェックディジット計算
  const sum = isbn12.split("").map((num:string, index:number) => {
    //ウェイトは1→3→1→3の順
    const coefficient = index % 2 === 0 ? 1 : 3;
    return Number(num) * coefficient;
  }).reduce((a:number, b:number) => a+b); //sum

  //10で割ったあまり出す
  const remainder = sum % 10;
  //あまりが0の場合は0、それ以外は10-あまり
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  return isbn12 + checkDigit;
};

export const isbn10To13 = (isbn10:string):string => {
  return isbn12To13("978" + isbn10.slice(0,-1));
};

export const isbn13To10 = (isbn13:string):string => {
  return isbn9To10(isbn13.substring(3, 12));
};
export const getNewBook = async (documentId:string, fs:firestoreUtil.FirestoreTransaction) => {
  return await fs.getDocument(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, documentId);
};