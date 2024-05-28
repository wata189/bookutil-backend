
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
import booklogJson from "C:/workspace/bookutil-backend/src/batch/data/booklog_1716783779732.json";
const booklogs:Booklog[] = booklogJson;

console.log(booklogs.filter(b => !util.isIsbn(b.isbn) && !b.coverUrl).length);

const main = async () => {
  console.log("start")
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0); 

  const start = 2000
  for(let i = start; i < start + 500; i++) {
    const booklog = booklogs[i];
    if(util.isIsbn(booklog.isbn)){continue;}
    if(booklog.coverUrl){continue;}
  
    // amazonのページスクレイピング
    const url = AMZN_URL + booklog.itemId;
    await page.goto(url);
    const paperBookDiv = await page.$('#tmm-grid-swatch-OTHER');
    if(!paperBookDiv)continue;
    const btn = await paperBookDiv.$("a"); // aタグ取得
    if(!btn)continue;
    const href = await btn.evaluate(node => node.href);
    if(!href)continue;
    console.log(booklog.bookName);

    const isbn = href.split("/").find(piece => util.isIsbn(piece));
    if(isbn){
      booklog.isbn = isbn;
      console.log(`ISBN get! ${isbn}`)
    }
  }
  
  // json出力
  fs.writeFileSync( path.join("src", "batch", "data", `booklog_${(new Date().getTime())}.json`), JSON.stringify(booklogs));

}
main().then(() => {
  console.log("end");
  process.exit();
});