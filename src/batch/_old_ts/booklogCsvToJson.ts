// csv読み込み
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import * as util from "../../modules/util";


const csvFilePath = "C:\\workspace\\bookutil-backend\\src\\batch\\base_booklog.csv";
const csv = fs.readFileSync(csvFilePath);
const records:string[][] = parse(csv, { });

const  ASIN_ROW_NUM = 0;
const  ISBN_ROW_NUM = 1;
const TITLE_ROW_NUM = 6;
const IMAGE_ROW_NUM = 9;
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
const main = async () => {

  const booklogs:Booklog[] = [];
  for(const record of records){
    if(record.length !== 10){
      console.log(`tarinai! ${record[6]}`);
    }
    if(record[ASIN_ROW_NUM] && util.isIsbn(record[ASIN_ROW_NUM])){
      record[ISBN_ROW_NUM] = record[ASIN_ROW_NUM]
    }
    booklogs.push({
      itemId: record[ASIN_ROW_NUM].trim(),
      isbn: record[ISBN_ROW_NUM].trim(),
      tags: record[2].trim().split(/[ 　\/]/),
      rate: record[3] ? Number(record[3].trim()): 0,
      review: record[4].trim(),
      createAt: record[5].trim(),
      bookName: record[TITLE_ROW_NUM].trim(),
      authorName: record[7].trim().replace(/[ 　]/, ""),
      publisherName: record[8].trim(),
      coverUrl: record[9].trim()
    });
  }
  
  // json出力
  fs.writeFile(path.join("src", "batch", "booklog.json"),
    JSON.stringify(booklogs),
    () => {
      console.log("done")
    }
  )
}
main();