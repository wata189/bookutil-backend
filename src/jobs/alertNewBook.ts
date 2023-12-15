import { systemLogger } from "../modules/logUtil";
import { Timestamp } from "firebase-admin/firestore";
import * as firestoreUtil from "../modules/firestoreUtil";
import ical from "node-ical";
import * as util from "../modules/util";
import * as discordUtil from "../modules/discordUtil";
const CLIENT_URL = process.env.CLIENT_URL;
const SINKAN_NET_ICAL = process.env.SINKAN_NET_ICAL || "";

type NewBookDocument = {
  isbn: string;
  book_name: string | undefined;
  author_name: string;
  publisher_name: string;
  publish_date: string;
  create_user: string;
  update_user: string;
  create_at: Timestamp;
  update_at: Timestamp;
};
const discoverNewBook = async (fs:firestoreUtil.FirestoreTransaction) => {
  // icalを取得
  const calender = await ical.async.fromURL(SINKAN_NET_ICAL);
  // まず年月日で1週間前～の予定のみに絞る
  const onlyNumberdateFormat = "yyyyMMdd"
  const today = new Date();
  const before7Day = new Date(today.getTime())
  before7Day.setDate(today.getDate() - 7);
  const before7DayStr = util.formatDateToStr(before7Day, onlyNumberdateFormat);
  
  const events = Object.keys(calender).map(key => calender[key])
  .filter(cal => {
    let startStr = "00000000";
    if("start" in cal && cal.start){
      if("start" in cal.start){
        startStr = util.formatDateToStr(cal.start.start, onlyNumberdateFormat);
      }else{
        startStr = util.formatDateToStr(cal.start, onlyNumberdateFormat)
      }
    }

    return Number(before7DayStr) <= Number(startStr);
  });

  // 新刊コレクションに登録されていないASINを抽出
  const newBooks:NewBookDocument[] = [];
  const uidExp = /^[A-Z]{2}[0-9]{9}[0-9X]/;
  for await(const event of events){
    // ISBN切り出し
    let isbn = "";
    if("uid" in event && event.uid && uidExp.test(event.uid?.toString())){
      const uid = event.uid?.toString()
      const uidIsbn = uid.slice(2).replace("@sinkan.net", "");
      if(util.isIsbn(uidIsbn)){
        isbn = uidIsbn;
      }
    }

    // t_new_bookにあったら発見済なのでループ飛ばす
    const dbNewBook = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, "isbn", "isbn", "==", isbn);
    if(dbNewBook.length > 0){
      continue
    }

    //本情報加工
    let description = ["", "", "", ""];
    if("description" in event && event.description){
      description = event.description?.toString().split("<br />")
    }
    const author_name = description[2];
    const publisher_name = description[3];
    let publish_date = "0000-00-00";
    const dateFormat = "yyyy-MM-dd";
    if("start" in event && event.start){
      if("start" in event.start){
        publish_date = util.formatDateToStr(event.start.start, dateFormat);
      }else{
        publish_date = util.formatDateToStr(event.start, dateFormat)
      }
    }

    const at = Timestamp.fromDate(new Date());
    const user = "alert new book";
    const newBook = {
      isbn,
      book_name: "summary" in event ? event.summary?.toString() : undefined,
      author_name,
      publisher_name,
      publish_date,
      create_user: user,
      update_user: user,
      create_at: at,
      update_at: at
    }
    newBooks.push(newBook);
  }

  if(newBooks.length <= 0)return

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendNewBookDiscover(`【${yyyyMMdd}】新刊が見つかったよ！`);

  const promises = [];
  for(const newBook of newBooks){
    // DB格納
    promises.push(fs.createDocument(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, newBook));
    // ディスコ送信
    const url = encodeURI(`${CLIENT_URL}/toread?isbn=${newBook.isbn}&bookName=${newBook.book_name}&authorName=${newBook.author_name}&publisherName=${newBook.publisher_name}&newBookCheckFlg=1`);
    const msg = `- ${util.formatDateToStr(new Date(newBook.publish_date), "yyyy/MM/dd")} ${newBook.author_name}『${newBook.book_name}』 [bookutilに登録](${url})`;
    promises.push(discordUtil.sendNewBookDiscover(msg));
    // あまり高速でディスコに送るとエラー出るので、10秒待つ
    await util.wait(10);
  }
  const results = (await Promise.all(promises));
};

const alertNewBookSale = async (fs:firestoreUtil.FirestoreTransaction) => {
  // 日付として使うもの
  const onlyNumberdateFormat = "yyyyMMdd"
  const today = new Date();
  const before7Day = new Date(today.getTime())
  before7Day.setDate(today.getDate() - 7);
  const todayStr = util.formatDateToStr(today, onlyNumberdateFormat);
  const before7DayStr = util.formatDateToStr(before7Day, onlyNumberdateFormat);

  // 新刊取得
  const dbNewBooks:NewBookDocument[] = (await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK)).map((data) => {
    return {
      isbn: data["isbn"],
      book_name: data["book_name"],
      author_name: data["author_name"],
      publisher_name: data["publisher_name"],
      publish_date: data["publish_date"],
      create_user: data["create_user"],
      update_user: data["update_user"],
      create_at: data["create_at"],
      update_at: data["update_at"]
    }
  }).filter((book:NewBookDocument) => {
    // 新刊コレクションで1週間前～今日までの間に絞る
    const publishDate = util.formatDateToStr(new Date(book.publish_date), onlyNumberdateFormat);

    return Number(before7DayStr) <= Number(publishDate) && Number(publishDate) <= Number(todayStr);
  });

  // 通知すべき本がない場合は終わり
  if(dbNewBooks.length <= 0)return
  
  
  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendNewBookSale(`【${yyyyMMdd}】新刊が発売されたよ！`);
  const promises = [];
  for(const dbNewBook of dbNewBooks){
    const msg = `- ${dbNewBook.author_name}『${dbNewBook.book_name}』 [bookutilで開く](${CLIENT_URL}/toread?filterCondWord=${dbNewBook.isbn})`;
    promises.push(discordUtil.sendNewBookSale(msg));
    // あまり高速でディスコに送るとエラー出るので、10秒待つ
    await util.wait(10);
  }
  const results = (await Promise.all(promises));
}

// Define main script
const main = async () => {
  systemLogger.debug("alertNewBook start");
  const data = await firestoreUtil.tran([discoverNewBook, alertNewBookSale])
  systemLogger.debug("alertNewBook end");
};

// Start script
main().catch(err => {
  systemLogger.error(err);
  process.exit(1);
});
