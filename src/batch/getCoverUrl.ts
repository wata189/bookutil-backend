
import * as fs from 'fs';
import path from 'path';
import * as util from "../modules/util";
import * as ndlSearchUtil from "../modules/ndlSearchUtil";

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
import booklogJson from "C:/workspace/bookutil-backend/src/batch/data/booklog_1716784332465.json";
const booklogs:Booklog[] = booklogJson;

console.log(booklogs.filter(b => !b.coverUrl).length);

const main = async () => {
  console.log("start")

  const coverUrlBooklogs = booklogs.map(booklog => {
    if(booklog.coverUrl){return booklog}
    if(!util.isIsbn(booklog.isbn)){return booklog}

    booklog.coverUrl = ndlSearchUtil.getCoverUrl(booklog.isbn) || "";
    return booklog;
  })
  
  // json出力
  fs.writeFileSync( path.join("src", "batch", "data", `booklog_${(new Date().getTime())}.json`), JSON.stringify(coverUrlBooklogs));

}
main().then(() => {
  console.log("end");
  process.exit();
});