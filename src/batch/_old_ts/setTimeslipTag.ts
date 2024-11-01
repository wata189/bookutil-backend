import * as firestoreUtil from "../modules/firestoreUtil";
import * as models from "../modules/models";
const timeslipTag = "昨日のタイムスリップ";
const referenceTag = "参考文献";

firestoreUtil.tran([
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const books = await models.fetchToreadBooks(true, fs);
    const timeslipBooks = books
      .map((b) => {
        return {
          documentId: b.documentId,
          bookName: b.bookName,
          tags: b.tags,
        };
      })
      .filter((b) => {
        return !b.tags.includes(timeslipTag) && b.tags.includes(referenceTag);
      });

    timeslipBooks.forEach((b) => console.log(b.bookName, b.tags));
    const params: models.SimpleBooksParams = {
      books: timeslipBooks.map((b) => {
        return {
          documentId: b.documentId,
          updateAt: 0,
        };
      }),
      tags: [timeslipTag],
      user: "batch/setTimeslipTag.ts",
      idToken: null,
    };
    await models.addToreadTag(params, fs);
    return {};
  },
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const books = await models.fetchBookshelfBooks(true, fs);
    const timeslipBooks = books
      .map((b) => {
        return {
          documentId: b.documentId,
          bookName: b.bookName,
          tags: b.tags,
        };
      })
      .filter((b) => {
        return !b.tags.includes(timeslipTag) && b.tags.includes(referenceTag);
      });

    timeslipBooks.forEach((b) => console.log(b.bookName, b.tags));
    const params: models.SimpleBooksParams = {
      books: timeslipBooks
        .filter((b) => b.documentId)
        .map((b) => {
          return {
            documentId: b.documentId || "",
            updateAt: 0,
          };
        }),
      tags: [timeslipTag],
      user: "batch/setTimeslipTag.ts",
      idToken: null,
    };
    await models.addBookshelfTag(params, fs);
    return {};
  },
]);
