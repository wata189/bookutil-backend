import { systemLogger } from "../modules/logUtil";
import { Timestamp } from "firebase-admin/firestore";
import * as firestoreUtil from "../modules/firestoreUtil";
import ical from "node-ical";
import * as util from "../modules/util";
import * as discordUtil from "../modules/discordUtil";
import * as models from "../modules/models"
const CLIENT_URL = process.env.CLIENT_URL;
const SINKAN_NET_ICAL = process.env.SINKAN_NET_ICAL || "";
const TOREAD_CREATE_NEW_BOOK_URL = `${CLIENT_URL}/toread?alertNewBooksFlg=1`;

type NewBookDocument = {
  isbn: string;
  author_name: string;
  book_name: string;
  publish_date: string;
  publisher_name: string;
  create_user: string;
  update_user: string;
  create_at: Timestamp;
  update_at: Timestamp;
  is_created_toread: boolean;
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

  const at = Timestamp.fromDate(new Date());
  const user = "alert new book";

  // 新刊コレクションに登録されていないASINを抽出
  const newBooks:NewBookDocument[] = [];
  const uidExp = /^[A-Z]{2}[0-9]{9}[0-9X]/;
  for await(const event of events){
    // ISBN切り出し
    let isbn = "dummy";
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
    let description = ["", "", "no_author_name", "no_publisher_name"];
    if("description" in event && event.description){
      description = event.description?.toString().split("<br />")
    }
    const authorName = description[2];
    const publisherName = description[3];
    let publishDate = "0000-00-00";
    const dateFormat = "yyyy-MM-dd";
    if("start" in event && event.start){
      if("start" in event.start){
        publishDate = util.formatDateToStr(event.start.start, dateFormat);
      }else{
        publishDate = util.formatDateToStr(event.start, dateFormat)
      }
    }
    const bookName = "summary" in event && event.summary ? event.summary.toString()  : "";

    const newBook:NewBookDocument = {
      isbn,
      author_name: authorName,
      book_name: bookName,
      publish_date: publishDate,
      publisher_name: publisherName,
      create_user: user,
      update_user: user,
      create_at: at,
      update_at: at,
      is_created_toread: false
    }
    newBooks.push(newBook);
  }

  if(newBooks.length <= 0)return

  const promises = [];

  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  let message = `【${yyyyMMdd}】新刊が見つかったよ！
`;

  for(const newBook of newBooks){
    // DB格納
    promises.push(fs.createDocument(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, newBook));
    // newBooksから通知メッセ組み立てる
    message += `- ${util.formatDateToStr(new Date(newBook.publish_date), "yyyy/MM/dd")} ${newBook.author_name}『${newBook.book_name}』
`;

  }

  message += `[Bookutilで新刊登録](${TOREAD_CREATE_NEW_BOOK_URL})`;

  promises.push(discordUtil.sendNewBookDiscover(message));


  const results = (await Promise.all(promises));
  
};

// Define main script
const main = async () => {
  systemLogger.debug("alertNewBook start");
  const data = await firestoreUtil.tran([discoverNewBook])
  systemLogger.debug("alertNewBook end");
};

// Start script
main().catch(err => {
  systemLogger.error(err);
  process.exit(1);
});
