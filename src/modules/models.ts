import { Timestamp } from "firebase-admin/firestore";
import * as firestoreUtil from "./firestoreUtil";
import * as util from "./util";
import * as errorUtil from "./errorUtil";
import { checkMultiCalil } from "./calilUtil";
import {Response} from 'express';


const TAG_WANT = "よみたい";


export const fetchLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_LIBRARY, "order_num");

  return result.map((resultRow) => {
    const businessHours = resultRow.business_hours.map((hour:any) => {
      return {
        dayOfWeek: hour.day_of_week,
        isOpen: hour.is_open,
        startTime: hour.start_time,
        endTime: hour.end_time
      }
    })
    return {
      id: resultRow.id,
      city: resultRow.city,
      name: resultRow.name,
      closestStation: resultRow.closest_station,
      url: resultRow.url,
      mapUrl: resultRow.map_url,
      newBookCheckFlg: resultRow.new_book_check_flg,
      orderNum: resultRow.order_num,
      businessHours,

      spUrl: resultRow.sp_url,
      calendarUrl: resultRow.calendar_url,
      barcodeUrl: resultRow.barcode_url
    };
  });
};

export const initToread = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction) => {
  const toreadBooks = await fetchToreadBooks(isAuth, fs);
  const toreadTags = await fetchToreadTags(isAuth, toreadBooks, fs);

  return {toreadBooks, toreadTags};
};

export type ToreadBook = {
  documentId: string
  bookName: string
  isbn: string | null
  authorName: string | null
  publisherName: string | null
  page: number | null
  memo: string | null
  coverUrl: string
  newBookCheckFlg: number
  updateAt: number
  tags: string[]
}
export const fetchToreadBooks = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction):Promise<ToreadBook[]> => {
  //未ログインの場合はwhere句でタグが「プログラミング」を含むものだけ取得する
  const fieldPath = isAuth ? undefined : "tags";
  const opStr = isAuth ? undefined : "array-contains";
  const value = isAuth ? undefined : "プログラミング";
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "update_at", fieldPath, opStr, value);

  return result.map((resultRow) => {
    return {
      documentId: resultRow.documentId,
      bookName: resultRow.book_name,
      isbn: resultRow.isbn,
      authorName: resultRow.author_name,
      publisherName: resultRow.publisher_name,
      page: resultRow.page,
      memo: resultRow.memo || null,
      coverUrl: resultRow.cover_url,
      newBookCheckFlg: resultRow.new_book_check_flg,
      updateAt: resultRow.update_at.seconds,
      tags: resultRow.tags
    };
  });
};

const fetchToreadTags = async (isAuth:boolean, toreadBooks:ToreadBook[], fs:firestoreUtil.FirestoreTransaction) => {
  //未ログインの場合は表示用のタグリスト
  if(!isAuth) return [TAG_WANT, "プログラミング", "アルゴリズム"];

  //DBからタグ取得
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_TOREAD_TAG, "order_num");
  const masterTags:string[] = result.map(resultRow => resultRow.tag);

  // 図書館マスタから図書館タグを生成
  const libraries = await fetchLibraries(fs);
  const libraryTags:string[] = libraries.map(library => library.city + "図書館");

  // toreadTags
  let tags = masterTags.concat(libraryTags);
  toreadBooks.forEach(book => tags = tags.concat(book.tags));

  // 重複を削除
  return util.removeDuplicateElements(tags);
};

export type BookParams = {
  documentId: string | null
  updateAt: number | null
  user: string
  bookName: string
  isbn: string | null
  page: number | null
  authorName: string | null
  publisherName: string | null
  memo: string | null
  coverUrl: string | null
  newBookCheckFlg: number
  tags: string[]
  accessToken: string
  isExternalCooperation: boolean
};
export const createToreadBook = async (params:BookParams, fs:firestoreUtil.FirestoreTransaction) => {
  const document = toreadBookParamsToDocument(params);
  document.create_user = params.user;
  document.create_at = document.update_at;
  await fs.createDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, document);
};

export const updateToreadBook = async (documentId: string, params:BookParams, fs:firestoreUtil.FirestoreTransaction) => {
  const document = toreadBookParamsToDocument(params);
  await fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, documentId, document);
};

export type BookDocument = {
  book_name: string
  isbn: string | null
  page: number | null
  author_name: string | null
  publisher_name: string | null
  memo: string | null
  cover_url: string | null
  new_book_check_flg: number
  tags: string[]
  create_user?: string
  create_at?: Timestamp 
  update_user: string
  update_at: Timestamp 
}
const toreadBookParamsToDocument = (params:BookParams):BookDocument => {
  return {
    "book_name": params.bookName,
    "isbn": params.isbn,
    "page": params.page,
    "author_name": params.authorName,
    "publisher_name": params.publisherName,
    "memo": params.memo,
    "cover_url": params.coverUrl,
    "new_book_check_flg": params.newBookCheckFlg,
    "tags": params.tags,
    "update_user": params.user,
    "update_at": Timestamp.fromDate(new Date())
  };
};

export type SimpleBook = {
  documentId: string
  updateAt: number
};
export type SimpleBookParams = {
  book: SimpleBook
  user: string
  accessToken: string
};
export type SimpleBooksParams = {
  books: SimpleBook[]
  tags?: string[]
  user: string
  accessToken: string
};
export type BooksParams = {
  books: SimpleBook[]
  tags?: string[]
  user: string
  accessToken: string
};
export const deleteToreadBooks = async (books: SimpleBook[], fs:firestoreUtil.FirestoreTransaction) => {
  const promises = [];
  for(const book of books){
    promises.push(fs.deleteDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, book.documentId));
  }
  const results = (await Promise.all(promises));
};

export const addToreadTag = async (params:SimpleBooksParams, fs:firestoreUtil.FirestoreTransaction) => {
  const tags = params.tags || [];
  const promises = [];
  for(const book of params.books){
    promises.push(fs.addArray(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, book.documentId, "tags", tags));
  }
  const results = (await Promise.all(promises));
};

export const addWantTag = async (res:Response, params:SimpleBookParams, fs: firestoreUtil.FirestoreTransaction) => {

    // 本の情報を取得
    const book = await util.getToreadBook(params.book.documentId, fs);
    if(!book){
      // 本の情報がないエラー（普通起こらないはず）
      errorUtil.throwError(res, "本が登録されていません", util.STATUS_CODES.INTERNAL_SERVER_ERROR);
      return;
    }
    const libraryTag = await findLibraryTag(book.isbn, fs);
    if(!libraryTag){
      // 本が図書館にないエラー
      errorUtil.throwError(res, "本が図書館にありません", util.STATUS_CODES.INTERNAL_SERVER_ERROR);
      return;
    }
    const wantTags = [libraryTag];
    // よみたいタグが登録されていない場合はよみたいタグも一緒に追加
    const bookTags:string[] = book.tags;
    if(!bookTags.includes(TAG_WANT)){
      wantTags.push(TAG_WANT);
    }
    
    //DBに格納
    await fs.addArray(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, book.documentId, "tags", wantTags)

    return;
};

export const findLibraryTag = async (isbn: string, fs:firestoreUtil.FirestoreTransaction) => {
  const libraries = await fetchLibraries(fs);
  const libraryIds = libraries.map(library => library.id);
  const calilResult = await checkMultiCalil(isbn, libraryIds);
  let libraryTag:string|null = null;
  if(calilResult.isExist){
    const library = libraries.find(library => library.id === calilResult.libraryId);
    if(library){
      libraryTag = library.city + "図書館";
    }
  }
  return libraryTag;
};

export type GetWantTagParams = {
  isbn: string,
  user: string,
  accessToken: string
};