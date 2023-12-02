import { Timestamp } from "firebase/firestore/lite";
import * as firestoreUtil from "./firestoreUtil";
import { removeDuplicateElements } from "./util";

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

  // 重複を削除
  return removeDuplicateElements(tags);
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
