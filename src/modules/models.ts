import { DocumentData, FirestoreDataConverter } from "firebase/firestore/lite";
import * as firestoreUtil from "./firestoreUtil";
import { systemLogger } from "./logUtil";

const COLLECTION_PATH = {
  M_LIBRARY: "/m_library",
  M_TOREAD_TAG: "/m_toread_tag",
  T_TOREAD_BOOK: "/t_toread_book"
};

export const fetchLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  const result = await fs.getCollection(COLLECTION_PATH.M_LIBRARY, "order_num");

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
  const toreadRows = await fetchToreadBooks(isAuth, fs);
  const toreadTags = await fetchToreadTags(isAuth, toreadRows, fs);

  return {toreadRows, toreadTags};
};

type ToreadBook = {
  id: string
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

  const result = await fs.getCollection(COLLECTION_PATH.T_TOREAD_BOOK, "update_at", where);

  return result.map((resultRow) => {
    return {
      id: resultRow.id,
      bookName: resultRow.book_name,
      isbn: resultRow.isbn,
      authorName: resultRow.author_name,
      publisherName: resultRow.publisher_name,
      page: resultRow.page,
      otherUrl: resultRow.other_url,
      coverUrl: resultRow.cover_url || "img/cover_placeholder.jpg",
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
  const result = await fs.getCollection(COLLECTION_PATH.M_TOREAD_TAG, "order_num");
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