import {Response} from 'express';

import * as util from "./util";
import * as models from "./models";
import * as errorUtil from "./errorUtil";
import * as firestoreUtil from "./firestoreUtil";
import { systemLogger } from './logUtil';

export const isAuth = (res:Response, isAuth:boolean, isExternalCooperation?:boolean) => {
  if(!isAuth && !isExternalCooperation){
    errorUtil.throwError(res, "ログインをしてください", util.STATUS_CODES.UNAUTHORIZED);
  }
};

const NOT_EXISTS:unknown[] = ["", null, undefined, NaN];
export const isExist = (val:unknown) => {
  return !NOT_EXISTS.includes(val);
};
export const isExistArray = (val:any[]) => {
  return val.length > 0;
};
export const isFlg = (val:any) => {
  return val === 1 || val === 0;
};
export const isNumber = (val:any) => {
  const regex1 = /^-?[0-9]$/;
  const regex10 = /^-?[0-9]*\.?[0-9]+$/;

  return regex10.test(val.toString()) || regex1.test(val.toString());
};
export const isPlus = (val:number) => {
  return val > 0;
};
export const isIsbn = (val:string) => {
  return util.isIsbn(val);
};
export const isUrl = (val:string) => {
  const regex = /^https?:\/\//;
  return regex.test(val);
};
export const isInOfRange = (start:number, end:number) => {
  return (val:number) => {
    return start <= val && val <= end;
  }
};
export const isDateStr = (val:string) => {
  const regex = /^\d{4}\/\d{2}\/\d{2}/;
  return regex.test(val);
};
export const isValidDate = (val:string) => {
  const date = new Date(val);
  return !isNaN(date.getDate());
}

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
    if(isExist(params.coverUrl)){
      validationCmds.push({param:params.coverUrl, func: isUrl});
    }
    if(params.newBookCheckFlg === 1){
      validationCmds.push({param:params.isbn, func: isExist})
    }

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};

export const isValidUpdateBook = (res:Response, params:models.BookParams) => {

  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.documentId, func: isExist},
      {param: params.updateAt, func: isExist},
      {param: params.updateAt, func: isNumber}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }

};
export const isValidSimpleBook = (res:Response, params:models.SimpleBookParams) => {

  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.book, func: isExist},
      {param: params.book.documentId, func:isExist},
      {param: params.book.updateAt, func:isExist},
      {param: params.book.updateAt, func:isNumber},
      {param: params.user, func: isExist}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }

};
export const isValidGetWantTagParams = (res:Response, params:models.GetWantTagParams) => {

  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.isbn, func: isExist},
      {param: params.isbn, func: isIsbn},
      {param: params.user, func: isExist}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};

const runValidationCmds = (res:Response, cmds:ValidationCmd[]) => {
  for(const cmd of cmds){
    const isValid = cmd.func(cmd.param);
    // エラーあったらその時点で終了
    if(!isValid){
      errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
    }
  }
};

//ISBN被りチェック　新規作成
export const isCreateUniqueIsbn = async (res:Response, isbn:string|null, fs:firestoreUtil.FirestoreTransaction) => {
  // isbn空の場合は問題なし
  if(!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "isbn", "isbn", "in", [isbn10, isbn13]);
  if(result.length > 0){
    errorUtil.throwError(res, "同じISBNの本があります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ISBN被りチェック　更新
export const isUpdateUniqueIsbn = async (res:Response, documentId:string, isbn:string|null, fs:firestoreUtil.FirestoreTransaction) => {
  //isbn空の場合は問題ない
  if(!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);
  
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "isbn", "isbn", "in", [isbn10, isbn13]);
  const sameIsbnBook = result.find(resultRow => resultRow.documentId !== documentId);
  if(sameIsbnBook){
    errorUtil.throwError(res, "同じISBNの本があります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ID存在チェック
export const isExistBookId = async (res:Response, documentId:string, fs:firestoreUtil.FirestoreTransaction) => {
  const book = await util.getToreadBook(documentId, fs);
  if(!isExist(book)){
    errorUtil.throwError(res, "本が削除されています", util.STATUS_CODES.BAD_REQUEST);
  }
};

//コンフリクトチェック
export const isNotConflictBook = async (res:Response, documentId:string, updateAt:number|null, fs:firestoreUtil.FirestoreTransaction) => {
  const book = await util.getToreadBook(documentId, fs);
  if(!book || book.update_at.seconds !== updateAt ){
    errorUtil.throwError(res, "本の情報が更新されています", util.STATUS_CODES.CONFLICT);
  }
};

//複数選択の本のバリデーション
export const isValidBooks = (res:Response, params:models.BooksParams) => {
  
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.books, func: isExist},
      {param: params.books, func: isExistArray},
      {param: params.user, func: isExist}
    ];

    for(const deleteBook of params.books){
      validationCmds.push({param:deleteBook.documentId, func:isExist});
      validationCmds.push({param:deleteBook.updateAt, func:isExist});
      validationCmds.push({param:deleteBook.updateAt, func:isNumber});
    }

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//タグ追加のバリデーション
export const isValidTag = (res:Response, params:models.BooksParams) => {
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.tags, func: isExist},
      {param: params.tags, func: isExistArray}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ID存在チェック　複数
export const isExistBooksId = async (res:Response, books:models.SimpleBook[], fs:firestoreUtil.FirestoreTransaction) => {  
  const promises = [];
  for(const book of books){
    promises.push(isExistBookId(res, book.documentId, fs));
  }
  const results = (await Promise.all(promises));
};

//コンフリクトチェック　複数
export const isNotConflictBooks = async (res:Response, books:models.SimpleBook[], fs:firestoreUtil.FirestoreTransaction) => {
  const promises = [];
  for(const book of books){
    promises.push(isNotConflictBook(res, book.documentId, book.updateAt, fs));
  }
  const results = (await Promise.all(promises));
};


export const isValidAddNewBooksParams = (res:Response, params:models.AddNewBooksParams) => {
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.user, func: isExist}
    ];

    for(const newBook of params.newBooks){
      const validationCmds:ValidationCmd[] = [
        {param: newBook.bookName, func: isExist},
        {param: newBook.newBookCheckFlg, func: isFlg}
      ];
    
      if(isExist(newBook.isbn)){
        validationCmds.push({param:newBook.isbn.toString(), func: isIsbn});
      }
      if(newBook.newBookCheckFlg === 1){
        validationCmds.push({param:newBook.isbn, func: isExist});
      }
      validationCmds.push({param: newBook.documentId, func: isExist});
      validationCmds.push({param: newBook.updateAt, func: isExist});
      validationCmds.push({param: newBook.updateAt, func: isNumber});
      validationCmds.push({param: newBook.isAdd, func: isFlg});
    }

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ID存在チェック
export const isExistNewBooksId = async (res:Response, newBooks:models.NewBookForm[], fs:firestoreUtil.FirestoreTransaction) => {
  const promises:Promise<FirebaseFirestore.DocumentData | undefined>[] = [];
  for(const newBook of newBooks) {
    promises.push(util.getNewBook(newBook.documentId, fs))
  }

  const documents = await Promise.all(promises);
  for(const document of documents){
    if(!isExist(document)){
      errorUtil.throwError(res, "本が削除されています", util.STATUS_CODES.BAD_REQUEST);
    }
  }
};

//コンフリクトチェック
export const isNotConflictNewBooks = async (res:Response, newBooks:models.NewBookForm[], fs:firestoreUtil.FirestoreTransaction) => {

  for(const newBook of newBooks) {
    const newBookDocument = await util.getNewBook(newBook.documentId, fs);
    
    if(!newBookDocument || newBookDocument.update_at.seconds !== newBook.updateAt ){
      errorUtil.throwError(res, "本の情報が更新されています", util.STATUS_CODES.CONFLICT);
    }
  }
};

export const isValidBookshelfBook = (res:Response, params:models.BookshelfBookParams) => {
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.bookName, func: isExist},
      {param: params.user, func: isExist},
      {param: params.rate, func: isExist},
      {param: params.rate, func: Number.isInteger},
      {param: params.rate, func: isInOfRange(0, 5)}
    ];
  
    if(params.isbn && isExist(params.isbn)){
      validationCmds.push({param:params.isbn.toString(), func: isIsbn})
    }
    if(isExist(params.coverUrl)){
      validationCmds.push({param:params.coverUrl, func: isUrl});
    }
    if(params.readDate && isExist(params.readDate)){
      validationCmds.push({param:params.readDate, func: isDateStr});
      validationCmds.push({param:params.readDate, func: isValidDate});
    }
    for(const content of params.contents){
      validationCmds.push({param:content.contentName, func: isExist});
      validationCmds.push({param:content.rate, func: isExist});
      validationCmds.push({param:content.rate, func: Number.isInteger});
      validationCmds.push({param:content.rate, func: isInOfRange(0, 5)});

    }

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};
export const isValidUpdateBookshelfBook = (res:Response, params:models.BookshelfBookParams) => {

  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.documentId, func: isExist},
      {param: params.updateAt, func: isExist},
      {param: params.updateAt, func: isNumber}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }

};
//ISBN被りチェック　新規作成
export const isCreateUniqueBookshelfIsbn = async (res:Response, isbn:string|null, fs:firestoreUtil.FirestoreTransaction) => {
  // isbn空の場合は問題なし
  if(!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, "isbn", "isbn", "in", [isbn10, isbn13]);
  if(result.length > 0){
    errorUtil.throwError(res, "同じISBNの本があります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ISBN被りチェック　更新
export const isUpdateUniqueBookshelfIsbn = async (res:Response, documentId:string, isbn:string|null, fs:firestoreUtil.FirestoreTransaction) => {
  //isbn空の場合は問題ない
  if(!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);
  
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, "isbn", "isbn", "in", [isbn10, isbn13]);
  const sameIsbnBook = result.find(resultRow => resultRow.documentId !== documentId);
  if(sameIsbnBook){
    errorUtil.throwError(res, "同じISBNの本があります", util.STATUS_CODES.BAD_REQUEST);
  }
};

//ID存在チェック
export const isExistBookshelfBookId = async (res:Response, documentId:string, fs:firestoreUtil.FirestoreTransaction) => {
  const book = await util.getBookshelfBook(documentId, fs);
  if(!isExist(book)){
    errorUtil.throwError(res, "本が削除されています", util.STATUS_CODES.BAD_REQUEST);
  }
};

//コンフリクトチェック
export const isNotConflictBookshelfBook = async (res:Response, documentId:string, updateAt:number|null, fs:firestoreUtil.FirestoreTransaction) => {
  const book = await util.getBookshelfBook(documentId, fs);
  if(!book || book.update_at.seconds !== updateAt ){
    errorUtil.throwError(res, "本の情報が更新されています", util.STATUS_CODES.CONFLICT);
  }
};

export const isValidSimpleBookshelfBook = async (res:Response, params:models.SimpleBookshelfBookParams) => {
  try{
    const validationCmds:ValidationCmd[] = [
      {param: params.documentId, func: isExist},
      {param: params.updateAt, func: isExist},
      {param: params.updateAt, func: isNumber},
      {param: params.user, func: isExist}
    ];

    runValidationCmds(res, validationCmds);
  }catch(e){
    systemLogger.error(e);
    errorUtil.throwError(res, "不正なパラメータがあります", util.STATUS_CODES.BAD_REQUEST);
  }
};