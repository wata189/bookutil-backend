
import * as firestoreUtil from "../modules/firestoreUtil";
import { Timestamp } from "firebase-admin/firestore";

console.log("start toHttps")


firestoreUtil.tran([async (fs:firestoreUtil.FirestoreTransaction) => {
  const toreadBookDocuments = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK);
  const bookshelfBookDocuments = await fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK);

  const updateToreadBookDocuments = toreadBookDocuments.filter(doc => doc.cover_url && doc.cover_url.startsWith("http:"));
  const updateBookshelfBookDocuments = bookshelfBookDocuments.filter(doc => doc.cover_url && doc.cover_url.startsWith("http:"));
  console.log(`update toread ${updateToreadBookDocuments.length}`);
  console.log(`update bookshelf ${updateBookshelfBookDocuments.length}`)
  const updateAt = Timestamp.fromDate(new Date());
  const toreadBookPromises = updateToreadBookDocuments.map(doc => {
    return fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK, doc.documentId, {
      update_at: updateAt,
      update_user: "batch toHttps.ts",
      cover_url: doc.cover_url.replace(/^http:/, "https:")
    });
  });
  const bookshelfBookPromises = updateBookshelfBookDocuments.map(doc => {
    return fs.updateDocument(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK, doc.documentId, {
      update_at: updateAt,
      update_user: "batch toHttps.ts",
      cover_url: doc.cover_url.replace(/^http:/, "https:")
    });
  });
  
  await Promise.all(bookshelfBookPromises);
  await Promise.all(toreadBookPromises);
  console.log("end toHttps")
  return;
}]);