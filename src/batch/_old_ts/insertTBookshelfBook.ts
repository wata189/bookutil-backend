import * as firestoreUtil from "../../modules/firestoreUtil";
import * as models from "../../modules/models";
import * as util from "../../modules/util";
import * as fs from 'fs';
import path from 'path';


console.log("start insert t_bookshelf_book")

import paramses from "C:\\workspace\\bookutil-backend\\src\\batch\\data\\bookshelfBookParams_1716792231814.json";
const bookshelfBookParamses:models.BookshelfBookParams[] = paramses;
const count = 500;
const sendParamses = bookshelfBookParamses.slice(0, count);
const unsendParamses = bookshelfBookParamses.slice(count);

const main = async () => {
  await firestoreUtil.tran([ async (fs:firestoreUtil.FirestoreTransaction) => {
    const isbn = bookshelfBookParamses[0].isbn;
    const doc = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, "isbn", "isbn", "==", isbn);
    if(doc.length > 0){
      throw new Error;
    }


    const promises = sendParamses.map(bookshelfBookParams => {
      return models.createBookshelfBook(bookshelfBookParams, fs);
    })

    return Promise.all(promises);
  }]);
  //   // jsonに出力
  // fs.writeFileSync( path.join("src", "batch", "data", `unsendBookshelfBookParams_${(new Date().getTime())}.json`), JSON.stringify(unsendParamses));

  // console.log(`残り${unsendParamses.length}件`)
  console.log("end insert t_bookshelf_book");
  process.exit();
};


main();

