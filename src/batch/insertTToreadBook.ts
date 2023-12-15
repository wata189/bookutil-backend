import * as firestoreUtil from "../modules/firestoreUtil";
import * as models from "../modules/models";
import * as util from "../modules/util";
import { Timestamp } from "firebase-admin/firestore";


import tToreadBook from "./dbdata/bookutil.t_toread_book.json";
import tToreadTag from "./dbdata/bookutil.t_toread_tag.json";
console.log("start insertTToreadBook")

// テストでは数絞る
const sendToreadBook:any[] = tToreadBook.slice(0,450);

const documents:models.BookDocument[] = sendToreadBook.filter((row:any) => row.delete_flg === 0) //dltflg削除
.map((row:any) => {
  const tags:string[] = tToreadTag.filter((tagRow:any)=> tagRow.book_id === row.id)
  .map((tagRow:any) => {
    return tagRow.tag
  });

  const isbn = row.isbn;
  let isbn13 = "";
  if(util.isIsbn(isbn)){
    if(isbn.length === 13){
      isbn13 = isbn
    }else{
      const isbn12 = "978" + isbn.slice(0,-1);
      // チェックディジット計算
      const sum = isbn12.split("").map((num:string, index:number) => {
        //ウェイトは1→3→1→3の順
        const coefficient = index % 2 === 0 ? 1 : 3;
        return Number(num) * coefficient;
      }).reduce((a:number, b:number) => a+b); //sum

      //10で割ったあまり出す
      const remainder = sum % 10;
      //あまりが0の場合は0、それ以外は10-あまり
      const checkDigit = remainder === 0 ? 0 : 10 - remainder;
      isbn13 = isbn12 + checkDigit;
    }
  }
  
  const ret:models.BookDocument = {
    book_name: row.book_name,
    isbn: row.isbn,
    author_name: row.author_name,
    publisher_name: row.publisher_name,
    page: row.page,
    memo: row.memo,
    cover_url: `https://cover.openbd.jp/${isbn13}.jpg` || null,
    new_book_check_flg: row.new_book_check_flg,
    create_user: row.create_user,
    update_user: "batch",
    create_at: Timestamp.fromDate(new Date(row.create_at)),
    update_at: Timestamp.fromDate(new Date(row.update_at)),
    tags
  };
  return ret;
});

firestoreUtil.tran([ async (fs:firestoreUtil.FirestoreTransaction) => {
  for await (const doc of documents){
    console.log("insert "+doc.book_name);
    await fs.createDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, doc)
  }
  console.log("end insertTToreadBook")
}]);
