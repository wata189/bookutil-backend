import { systemLogger } from "../modules/logUtil";
import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import * as bookApiUtil from "../modules/bookApiUtil";
import nqdm from "nqdm";

const TAG = {
  BOOK_WORKER: "ブックウォーカー",
  MAY_BOOK_WORKER: "ブックウォーカー?",
};

const JOB_USER = "batch/setPublishData.ts";

const FIRESTORE_LIMIT = 495;
const GOOGLE_BOOKS_API_LIMIT = 480; // 1000件上限なので2つあわせて

const main = async () => {
  systemLogger.debug("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendAlert(`【${yyyyMMdd}】書籍情報設定を開始しました！！`);

  let toreadBooks: models.ToreadBook[] = [];
  let bookshelfBooks: models.BookshelfBook[] = [];

  await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      toreadBooks = filterUncompleteBooks(
        await models.fetchToreadBooks(true, fs)
      ).slice(0, GOOGLE_BOOKS_API_LIMIT);
      bookshelfBooks = filterUncompleteBooks(
        await models.fetchBookshelfBooks(true, fs)
      ).slice(0, GOOGLE_BOOKS_API_LIMIT);
      return {};
    },
  ]);

  const updatedToreadBookParams: models.BookParams[] = [];
  const updatedBookshelfBookParams: models.BookshelfBookParams[] = [];
  for (const book of nqdm(toreadBooks)) {
    const updatedBook = await updateToreadBook(book);
    if (updatedBook) {
      updatedToreadBookParams.push(updatedBook);
    }
    await util.wait(3);
  }
  for (const book of nqdm(bookshelfBooks)) {
    const updatedBook = await updateBookshelfBook(book);
    if (updatedBook) {
      updatedBookshelfBookParams.push(updatedBook);
    }
    await util.wait(3);
  }
  const updateFunc: ((
    fs: firestoreUtil.FirestoreTransaction
  ) => Promise<object>)[] = [];

  for (const splitedParams of util.splitArray(
    updatedToreadBookParams,
    FIRESTORE_LIMIT
  )) {
    updateFunc.push(async (fs: firestoreUtil.FirestoreTransaction) => {
      const promises: Promise<void>[] = [];
      for (const params of splitedParams) {
        if (params.documentId)
          promises.push(models.updateToreadBook(params.documentId, params, fs));
      }
      await Promise.all(promises);
      return {};
    });
  }
  for (const splitedParams of util.splitArray(
    updatedBookshelfBookParams,
    FIRESTORE_LIMIT
  )) {
    updateFunc.push(async (fs: firestoreUtil.FirestoreTransaction) => {
      const promises: Promise<void>[] = [];
      for (const params of splitedParams) {
        if (params.documentId)
          promises.push(models.updateBookshelfBook(params, fs));
      }
      await Promise.all(promises);
      return {};
    });
  }

  await firestoreUtil.tran(updateFunc);
  await discordUtil.sendAlert(`書籍情報設定を終了しました！！`);
};

const updateBookshelfBook = async (
  book: models.BookshelfBook
): Promise<models.BookshelfBookParams | null> => {
  if (!book.isbn) return null;

  const apiBook = await bookApiUtil.getApiBook(book.isbn);

  if (!apiBook) return null;

  const params: models.BookshelfBookParams = {
    ...book,

    user: JOB_USER,
    idToken: null,
  };

  if (apiBook.publishedMonth) {
    params.publishedMonth = apiBook.publishedMonth;
  }
  if (apiBook.publisherName) {
    params.publisherName = apiBook.publisherName;
  }
  if (apiBook.coverUrl) {
    params.coverUrl = apiBook.coverUrl;
  }
  if (apiBook.memo && !params.memo) {
    params.memo = apiBook.memo || null;
  }
  return params;
};

const updateToreadBook = async (
  book: models.ToreadBook
): Promise<models.BookParams | null> => {
  if (!book.isbn) return null;

  const apiBook = await bookApiUtil.getApiBook(book.isbn);

  if (!apiBook) return null;

  const params: models.BookParams = {
    ...book,

    user: JOB_USER,
    idToken: null,
    isExternalCooperation: true,
  };

  if (apiBook.publishedMonth) {
    params.publishedMonth = apiBook.publishedMonth;
  }
  if (apiBook.publisherName) {
    params.publisherName = apiBook.publisherName;
  }
  if (apiBook.coverUrl) {
    params.coverUrl = apiBook.coverUrl;
  }
  if (apiBook.memo && !params.memo) {
    params.memo = apiBook.memo || null;
  }

  if (
    apiBook.isOnKadokawa &&
    !params.tags.includes(TAG.BOOK_WORKER) &&
    !params.tags.includes(TAG.MAY_BOOK_WORKER)
  ) {
    params.tags.push(TAG.MAY_BOOK_WORKER);
  }
  return params;
};

const filterUncompleteBooks = <
  T extends models.ToreadBook | models.BookshelfBook,
>(
  books: T[]
) => {
  return books.filter((b) => {
    // isbnあり、出版日がないものを対象とする
    return b.isbn && !b.publishedMonth;
  });
};

main().then(() => {
  console.log("end");
  process.exit();
});
