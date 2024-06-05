////////////////deleteTag.st
// 引数で指定したタグを各本から削除する


import { program } from "commander";
// コマンドライン引数をcommanderでパースする
program.parse(process.argv);
const deleteTag = program.args[0]
if(!deleteTag){
  console.error("引数でタグを指定してください");
  process.exit(1);
}

console.log("start deleteTag")
console.log(`delete ${deleteTag}`);

import * as firestoreUtil from "../modules/firestoreUtil";


const at = (new Date());
firestoreUtil.tran([ async (fs:firestoreUtil.FirestoreTransaction) => {
  const toreadBookDocuments = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, "isbn", "tags", "array-contains", deleteTag);
  const updateToreadBooks = toreadBookDocuments.map((document) => {
    console.log(document.book_name);
    const tags:string[] = document.tags;
    return {
      documentId: document.documentId,
      document: {
        tags: tags.filter(tag => tag !== deleteTag),
        update_user: "batch",
        update_at: at,
      }
    }
  });
  const bookshelfBookDocuments = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, "isbn", "tags", "array-contains", deleteTag);
  const updateBookshelfBooks = bookshelfBookDocuments.map((document) => {
    console.log(document.book_name);
    const tags:string[] = document.tags;
    return {
      documentId: document.documentId,
      document: {
        tags: tags.filter(tag => tag !== deleteTag),
        update_user: "batch",
        update_at: at,
      }
    }
  });

  const promises:Promise<void>[] = [];
  updateToreadBooks.forEach((book) => {
    promises.push(fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, book.documentId, book.document)) ;
  });
  updateBookshelfBooks.forEach((book) => {
    promises.push(fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, book.documentId, book.document)) ;
  });
  const results = (await Promise.all(promises));

  console.log("end deleteTag")
}]);
