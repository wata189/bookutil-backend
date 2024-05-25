
import puppeteer from "puppeteer";
import * as fs from 'fs';
import path from 'path';
import * as util from "../modules/util";

const AMZN_URL = "https://www.amazon.co.jp/dp/";
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
import booklogJson from "C:/workspace/bookutil-backend/src/batch/data/booklog_1716567731518.json"
const booklogs:Booklog[] = booklogJson;


const main = async () => {
  console.log("start")
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let count = 0;
  for(const booklog of booklogs){
    if(util.isIsbn(booklog.isbn)){continue;} // ISBNあったらスクレイピングしなくていい
    if(booklog.bookName.includes("[雑誌]")){continue;}
    if(booklog.bookName.includes("UOMO(ウオモ)")){continue;}
    if(booklog.coverUrl){continue;} // 書影あったらスクレイピングしないでいい
  
    // amazonのページスクレイピング
    const url = AMZN_URL + booklog.itemId;
    await page.goto(url);
    await util.wait(5);
    const paperBookDiv = await page.$('#tmm-grid-swatch-OTHER');
    if(!paperBookDiv)continue;
    await util.wait(5);
    const btn = await paperBookDiv.$("a"); // aタグ取得
    if(!btn)continue;
    await util.wait(5);
    const href = await btn.evaluate(node => node.href);
    if(!href)continue;
    console.log(booklog.bookName);

    const isbn = href.split("/").find(piece => util.isIsbn(piece));
    if(isbn){
      booklog.isbn = isbn;
      console.log(`ISBN get! ${isbn}`)

      count++
      // ちょっとずつisbnとる
      if(count >= 70){
        break;
      }
    }
  }
  
  // json出力
  fs.writeFileSync( path.join("src", "batch", "data", `booklog_${(new Date().getTime())}.json`), JSON.stringify(booklogs));

  console.log("end")
}
main();