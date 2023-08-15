import { DocumentData, FirestoreDataConverter, Timestamp } from "firebase/firestore/lite";
import * as firestoreUtil from "./firestoreUtil";
import { systemLogger } from "./logUtil";

export const fetchLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_LIBRARY, "order_num");

  const weekNum = (new Date()).getDay();

  return result.map((resultRow) => {
    const businessHour = resultRow.business_hours.find((hour:any) => hour.day_of_week === weekNum);
    return {
      id: resultRow.id,
      city: resultRow.city,
      name: resultRow.name,
      closestStation: resultRow.closest_station,
      url: resultRow.url,
      mapUrl: resultRow.map_url,
      dayOfWeek: businessHour.day_of_week,
      isOpen: businessHour.is_open,
      startTime: businessHour.start_time,
      endTime: businessHour.end_time
    };
  });
};

export const initToread = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction) => {
  const toreadBooks = await fetchToreadBooks(isAuth, fs);
  const toreadTags = await fetchToreadTags(isAuth, toreadBooks, fs);

  return {toreadBooks, toreadTags};
};

type ToreadBook = {
  documentId: string
  bookName: string
  isbn: string | null
  authorName: string | null
  publisherName: string | null
  page: number | null
  otherUrl: string | null
  coverUrl: string
  newBookCheckFlg: number
  updateAt: number
  tags: string[]
}
const fetchToreadBooks = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction):Promise<ToreadBook[]> => {
  //未ログインの場合はwhere句でタグが「プログラミング」を含むものだけ取得する
  const where = isAuth ? undefined : firestoreUtil.createWhere("tags", "array-contains", "プログラミング");

  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "update_at", where);

  return result.map((resultRow) => {
    return {
      documentId: resultRow.documentId,
      bookName: resultRow.book_name,
      isbn: resultRow.isbn,
      authorName: resultRow.author_name,
      publisherName: resultRow.publisher_name,
      page: resultRow.page,
      otherUrl: resultRow.other_url,
      coverUrl: resultRow.cover_url,
      newBookCheckFlg: resultRow.new_book_check_flg,
      updateAt: resultRow.update_at.seconds,
      tags: resultRow.tags
    };
  });
};

const fetchToreadTags = async (isAuth:boolean, toreadBooks:ToreadBook[], fs:firestoreUtil.FirestoreTransaction) => {
  //未ログインの場合は表示用のタグリスト
  if(!isAuth) return ["よみたい", "プログラミング", "アルゴリズム"];

  //DBからタグ取得
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_TOREAD_TAG, "order_num");
  const masterTags:string[] = result.map(resultRow => resultRow.tag);

  // 図書館マスタから図書館タグを生成
  const libraries = await fetchLibraries(fs);
  const libraryTags:string[] = libraries.map(library => library.city + "図書館");

  // toreadTags
  let tags = masterTags.concat(libraryTags);
  toreadBooks.forEach(book => tags = tags.concat(book.tags));

  // set→array変換で重複削除
  // javascriptはsetも順序が保証される
  return [...(new Set(tags))];
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
  otherUrl: string | null
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

type BookDocument = {
  book_name: string
  isbn: string | null
  page: number | null
  author_name: string | null
  publisher_name: string | null
  other_url: string | null
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
    "other_url": params.otherUrl,
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
  for await (const book of books){
    await fs.deleteDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, book.documentId);
  }
};
