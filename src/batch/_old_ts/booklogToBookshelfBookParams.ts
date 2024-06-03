import * as models from "../../modules/models";
import * as util from "../../modules/util";
import * as fs from 'fs';
import path from 'path';

type Booklog = {
  itemId: string,
  isbn: string,
  tags: string[],
  rate: number,
  review: string,
  createAt: string,
  bookName: string,
  authorName: string,
  publisherName: string,
  coverUrl: string
};
import booklogJson from "C:/workspace/bookutil-backend/src/batch/data/booklog_1716786978368.json"
let booklogs:Booklog[] = booklogJson;



const bookshelfBookParams:models.BookshelfBookParams[] = booklogs.map(booklog => {
  const date = new Date(booklog.createAt);
  const contents = booklog.review ? booklog.review.split("\r\n").map(row => {
    const [authorName, ...others] = row.split("「");
    const otherStr = others.join("「");
    let rate = 0;
    if(otherStr.endsWith("★★★★★")){
      rate = 5;
    }else if(otherStr.endsWith("★★★★")){
      rate = 4;
    }else if(otherStr.endsWith("★★★")){
      rate = 3
    }else if(otherStr.endsWith("★★")){
      rate = 2
    }else if(otherStr.endsWith("★")){
      rate = 1
    }
    const contentName = otherStr.substring(0, otherStr.length - rate - 1);
  
    return {
      authorName: authorName.trim(),
      contentName: contentName.trim(),
      rate
    }
  }) : []
  return {
    bookName: booklog.bookName.trim(),
    isbn: util.isIsbn(booklog.isbn) ? booklog.isbn : null,
    authorName: booklog.authorName.replace(/[ 　]/g, "").trim(), // 空白除去
    publisherName: booklog.publisherName.trim(),
    coverUrl: booklog.coverUrl || "",
    tags: booklog.tags,
    readDate: util.formatDateToStr(date, "yyyy/MM/dd"),
    rate: booklog.rate ? Number(booklog.rate) : 0,
    contents,
    updateAt: null,
    user: "batch",

    // 不要だけど仮の値設定する
    documentId: null,
    dispCoverUrl: "",
    idToken: ""
  }
});
// jsonに出力
fs.writeFileSync( path.join("src", "batch", "data", `bookshelfBookParams_${(new Date().getTime())}.json`), JSON.stringify(bookshelfBookParams));
