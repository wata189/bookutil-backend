import { Timestamp } from "firebase-admin/firestore";
import * as firestoreUtil from "./firestoreUtil";
import * as util from "./util";
import * as errorUtil from "./errorUtil";
import { checkMultiCalil } from "./calilUtil";
import {Response} from 'express';


const TAG_WANT = "よみたい";
const NDL_SEARCH_URL = process.env.NDL_SEARCH_URL;


export const fetchLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_LIBRARY, "order_num");

  return result.map((resultRow) => {
    return {
      id: resultRow.id,
      city: resultRow.city,
      name: resultRow.name,
      closestStation: resultRow.closest_station,
      url: resultRow.url,
      mapUrl: resultRow.map_url,
      newBookCheckFlg: resultRow.new_book_check_flg,
      orderNum: resultRow.order_num,

      spUrl: resultRow.sp_url,
      calendarUrl: resultRow.calendar_url,
      barcodeUrl: resultRow.barcode_url
    };
  });
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

// よみたいポイントの算出　ブックウォーカーよんでいる＞よんでいる＞よみたい＞その他
const calcWantPoint = (tags:string[]):number => {
  let wantPoint = 0;
  if(tags.includes("よんでいる")){
    wantPoint = 2;
    // ブックウォーカー・無料は若干優先
    if(tags.includes("ブックウォーカー") || tags.includes("無料")){
      wantPoint += 1;
    }
  }else if(tags.includes("よみたい")){
    wantPoint = 1;
  }
  return wantPoint;
};
export const fetchToreadBooks = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction):Promise<ToreadBook[]> => {
  //未ログインの場合はwhere句でタグが「プログラミング」を含むものだけ取得する
  const fieldPath = isAuth ? undefined : "tags";
  const opStr = isAuth ? undefined : "array-contains";
  const value = isAuth ? undefined : "プログラミング";
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "update_at", fieldPath, opStr, value);

  const books:ToreadBook[] = result.map((resultRow) => {
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
  // 
  return books.sort((a, b)=> {
    return (calcWantPoint(b.tags) - calcWantPoint(a.tags)) || b.updateAt - a.updateAt;
  });
};

export type RequestParams = {
  idToken: string | null
}

export type BookParams = RequestParams & {
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
export type SimpleBookParams = RequestParams & {
  book: SimpleBook
  user: string
};
export type SimpleBooksParams = RequestParams & {
  books: SimpleBook[]
  tags?: string[]
  user: string
};
export type BooksParams = RequestParams & {
  books: SimpleBook[]
  tags?: string[]
  user: string
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

export type GetWantTagParams = RequestParams & {
  isbn: string,
  user: string
};

export type NewBookForm = {
  documentId: string;
  bookName: string;
  isbn: string;
  authorName: string;
  publisherName: string;
  newBookCheckFlg: number;
  tags: string;
  isAdd: boolean;
  updateAt: number;
}
export const fetchNewBooks = async (fs:firestoreUtil.FirestoreTransaction):Promise<NewBookForm[]> => {
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, "is_created_toread", "is_created_toread", "!=", true);

  return result.map(resultRow => {
    return {
      documentId: resultRow.documentId,
      bookName: resultRow.book_name,
      isbn: resultRow.isbn,
      authorName: resultRow.author_name,
      publisherName: resultRow.publisher_name,
      newBookCheckFlg: 1,
      updateAt: resultRow.update_at.seconds,
      tags: "",
      isAdd: false
    };;
  });;
};

export type AddNewBooksParams = RequestParams & {
  user:string; 
  newBooks:NewBookForm[];
};

export const addNewBooks = async (params:AddNewBooksParams, fs:firestoreUtil.FirestoreTransaction) => {
  const promises:Promise<void>[] = [];
  for(const newBook of params.newBooks){
    // 新刊のis_created_toreadをtrueにする
    const document = {
      is_created_toread: true,
      update_at: Timestamp.fromDate(new Date()),
      update_user: params.user
    }
    promises.push(fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, newBook.documentId, document));

    // isAddついてるものだけtoreadに新規作成
    if(!newBook.isAdd){continue;}
    const isbn13 = newBook.isbn.length === 13 ? newBook.isbn : util.isbn10To13(newBook.isbn);
    const bookParams:BookParams = {
      ...newBook,
      tags: newBook.tags.split(/[ 　\,\/]/).filter(tag => tag),
      idToken: params.idToken,
      user: params.user,
      page: null,
      memo: "",
      coverUrl: `${NDL_SEARCH_URL}/thumbnail/${isbn13}.jpg`,
      isExternalCooperation: false
    };
    promises.push(createToreadBook(bookParams, fs))
  }
  // 非同期で終わるまで待つ
  const results = (await Promise.all(promises));
  return;
};

type Content = {
  authorName: string | null,
  contentName: string,
  rate: number
};
type BookshelfBook = {
  documentId: string | null,
  bookName: string,
  isbn: string | null,
  coverUrl: string,
  authorName: string | null,
  publisherName: string | null,
  readDate: string | null,
  updateAt: number | null,
  tags: string[],
  rate: number,
  contents: Content[],
  dispCoverUrl: string
};
export const fetchBookshelfBooks = async (fs:firestoreUtil.FirestoreTransaction) => {
    const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, "update_at");
  
    const books:BookshelfBook[] = result.map((resultRow) => {
      return {
        documentId: resultRow.documentId,
        bookName: resultRow.book_name,
        isbn: resultRow.isbn,
        authorName: resultRow.author_name,
        publisherName: resultRow.publisher_name,
        coverUrl: resultRow.cover_url,
        readDate: resultRow.read_date,
        updateAt: resultRow.update_at.seconds,
        tags: resultRow.tags,
        rate: resultRow.rate,
        contents: resultRow.contents.map((content:ContentDocument) => {
          return {authorName: content.author_name, contentName: content.content_name, rate: content.rate}
        }),
        dispCoverUrl: ""
      };
    });
    return books;
};

export const fetchTags = async (isAuth:boolean, fs:firestoreUtil.FirestoreTransaction) => {
  //未ログインの場合は表示用のタグリスト適当に返却
  if(!isAuth) return [TAG_WANT, "プログラミング", "アルゴリズム"];

  //DBからタグ取得
  const result = await fs.getCollection(firestoreUtil.COLLECTION_PATH.M_TOREAD_TAG, "order_num");
  const masterTags:string[] = result.map(resultRow => resultRow.tag);

  // 図書館マスタから図書館タグを生成
  const libraries = await fetchLibraries(fs);
  const libraryTags:string[] = libraries.map(library => library.city + "図書館");

  let bookTags:string[] = [];
  // TODO: タグマスタにignoreTagsのフラグも入れる？
  const ignoreTags = [...libraryTags, "よんでいる", "よみたい", "かいたい", "ブックウォーカー", "キンドルアンリミテッド", "無料", "図書館未定", "青空文庫"];
  // toreadTags
  const toreadBooks = await fetchToreadBooks(isAuth, fs);
  toreadBooks.forEach(book => {
    bookTags.push(book.tags.filter(tag => !ignoreTags.includes(tag)) // 本自体の性質に結びつかないタグは除去
      .sort().join("/") // 適当にソートする
    );
  });
  // bookshelfTags
  const bookShelfBooks = await fetchBookshelfBooks(fs);
  bookShelfBooks.forEach(book => {
    bookTags.push(book.tags.filter(tag => !ignoreTags.includes(tag)) 
      .sort().join("/")
    );
  });

  // 重複を削除
  const allTags = masterTags.concat(libraryTags).concat(bookTags.sort());
  return util.removeDuplicateElements(allTags).filter(tag => tag); // 空文字は除外
  
};

export type BookshelfBookParams = BookshelfBook & RequestParams & {
  user: string
};
export const createBookshelfBook = async (params:BookshelfBookParams, fs:firestoreUtil.FirestoreTransaction) => {
  const document = bookshelfBookParamsToDocument(params);
  document.create_user = params.user;
  document.create_at = document.update_at;
  await fs.createDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, document);
};

export const updateBookshelfBook = async (params:BookshelfBookParams, fs:firestoreUtil.FirestoreTransaction) => {
  const document = bookshelfBookParamsToDocument(params);
  await fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, params.documentId || "", document);
};

export type ContentDocument = {
  author_name: string | null
  content_name: string
  rate: number
}
export type BookshelfBookDocument = {
  book_name: string
  isbn: string | null
  author_name: string | null
  publisher_name: string | null
  cover_url: string | null
  tags: string[]
  read_date: string | null
  rate: number
  contents: ContentDocument[]
  create_user?: string
  create_at?: Timestamp 
  update_user: string
  update_at: Timestamp 
}
const bookshelfBookParamsToDocument = (params:BookshelfBookParams):BookshelfBookDocument => {
  const contents:ContentDocument[] = params.contents.map(content => {
    return {
      author_name: content.authorName,
      content_name: content.contentName,
      rate: content.rate
    }
  })
  return {
    "book_name": params.bookName,
    "isbn": params.isbn,
    "author_name": params.authorName,
    "publisher_name": params.publisherName,
    "cover_url": params.coverUrl,
    "tags": params.tags,
    "read_date": params.readDate,
    "rate": params.rate,
    "contents": contents,
    "update_user": params.user,
    "update_at": Timestamp.fromDate(new Date())
  };
};

export type SimpleBookshelfBookParams = RequestParams & {
  user: string,
  documentId: string,
  updateAt: number
}

export const deleteBookshelfBook = async (params:SimpleBookshelfBookParams, fs:firestoreUtil.FirestoreTransaction) => {
  await fs.deleteDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, params.documentId);
};