import { DocumentData, FirestoreDataConverter, Timestamp } from "firebase/firestore/lite";
import * as firestoreUtil from "./firestoreUtil";
import * as discordUtil from "./discordUtil";
import { formatDateToStr, isIsbn, removeDuplicateElements } from "./util";
import { checkCalil } from "./calilUtil";
const CLIENT_URL = process.env.CLIENT_URL;

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
      newBookCheckFlg: resultRow.new_book_check_flg,
      orderNum: resultRow.order_num,
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

export type ToreadBook = {
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

export type BookDocument = {
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

const searchCheckNewBookLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  return (await fetchLibraries(fs)).filter(library => {
    return library.newBookCheckFlg; //図書館チェックフラグ立っている図書館のみ
  })
};
const searchCheckNewBookToreadBooks = async (fs:firestoreUtil.FirestoreTransaction) => {
  return (await fetchToreadBooks(true, fs)).filter(book => {
    return book.newBookCheckFlg && book.isbn && isIsbn(book.isbn); // 図書館チェックフラグたち、isbnがあるもののみ
  });
}

export const checkLibrary = async (fs:firestoreUtil.FirestoreTransaction) => {
  // newBookCheckFlg立ってる図書館を取得
  const libraries = await searchCheckNewBookLibraries(fs);
  // newBookCheckFlg立っている本を取得
  const toreadBooks = await searchCheckNewBookToreadBooks(fs);
  // 図書館×本で検索 break・continueを使う関係でfor awaitで同期処理
  const searchResults = [];
  for await (const book of toreadBooks){
    for(const library of libraries){
      // 検索対象or検索対象より優先度の高い図書館のタグ入っていたら飛ばす
      const cityTags = libraries.filter(tmpLib => tmpLib.orderNum <= library.orderNum)
      .map(tmpLib => tmpLib.city + "図書館");
      const isSearched = cityTags.filter(tag => book.tags.includes(tag)).length > 0;
      if(isSearched)continue;

      // カーリル処理
      const calilResult = await checkCalil(book, library.id);

      // カーリルの結果あった場合のみ更新処理
      if(!calilResult.isExist)continue;

      searchResults.push({
        book,
        library,
        reserveUrl: calilResult.reserveUrl
      });

      //それ以下の図書館は検索しなくてよいのでbreak
      break

    }
  }
  // 検索結果あったら処理続行
  if(searchResults.length <= 0)return;

  // 通知自体のメッセージ
  const yyyyMMdd = formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.send(`【${yyyyMMdd}】新刊が見つかったよ！`);

  // promiseallで非同期的にDB更新とメッセージ処理
  const promises = [];
  for (const searchResult of searchResults){
    const library = searchResult.library;
    const book = searchResult.book;
    // タグ更新
    // 図書館未定タグと図書館タグすべてけす
    // 「図書館」という文字列が入るタグを削除すればよい
    let updateTags = book.tags.filter(tag => tag.includes("図書館"));
    // 今の図書館タグ追加する
    updateTags.push(library.city + "図書館");
    updateTags.push("よみたい");

    //DB更新
    const bookParams:BookParams = {
      ...book,
      user: "check library",//更新ユーザーは独自のものにする
      accessToken: "",
      isExternalCooperation: false
    };
    // 更新タグは重複消す
    bookParams.tags = removeDuplicateElements(updateTags); 
    // 最優先図書館（orderNum===0）の場合は図書館チェクフラグ消す
    bookParams.newBookCheckFlg = library.orderNum === 0 ? 0 : 1;
    // 他URLが入っている場合はそれを尊重　空の場合は予約URLを設定する
    bookParams.otherUrl = book.otherUrl ? book.otherUrl : searchResult.reserveUrl;

    promises.push(updateToreadBook(book.documentId, bookParams, fs));

    // discordメッセージ送信
    const msg = `- ${library.city}図書館 / ${book.authorName}『${book.bookName}』
 - [予約URLを開く](${searchResult.reserveUrl})
 - [bookutilで開く](${CLIENT_URL}/toread?filterCondWord=${book.isbn})`;
    promises.push(discordUtil.send(msg));
  }
  const results = (await Promise.all(promises));
};