import * as ndlSearchUtil from "./ndlSearchUtil";
import axiosBase, { AxiosError } from "axios";
import * as util from "./util";
import * as models from "./models";
import * as firestoreUtil from "./firestoreUtil";

const axios = axiosBase.create({
  baseURL: process.env.VITE_LAMBDA_URL,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
  responseType: "json",
});
axios.interceptors.response.use(
  (response) => {
    // 成功時は普通にresponse返却
    return response;
  },
  (error: AxiosError) => {
    console.error(error);
    return null;
  }
);

export type ApiBook = {
  bookName: string | null;
  isbn: string | null;
  authorName: string | null;
  publisherName: string | null;
  coverUrl: string | null;
  publishedMonth: string | null; // YYYY/MM形式
  memo: string | null;
  isOnKadokawa: boolean;
};

type Publisher = {
  code: string;
  name: string;
  isOnKadokawa: boolean;
};
let publishers: Publisher[] = [];
// init処理 サーバから出版社マスタ取得
const setPublishers = (pubs: Publisher[]) => {
  publishers = pubs;
};

const init = async () => {
  // マスタ取得非同期
  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const publishers = await models.fetchPublishers(fs);
      return { publishers };
    },
  ])) as { publishers: Publisher[] };
  setPublishers(data.publishers);
};
init();

const findMasterPublisher = (isbn: string) => {
  // isbn10に変換
  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  // 1文字目削除
  const headDeletedIsbn = isbn10.slice(1);
  return publishers.find((p) => headDeletedIsbn.startsWith(p.code));
};

export const getApiBook = async (isbn: string) => {
  let apiBook: ApiBook | null = null;

  const masterPublisher = findMasterPublisher(isbn);
  const masterPublisherName = masterPublisher ? masterPublisher.name : null;
  const isOnKadokawa = masterPublisher ? masterPublisher.isOnKadokawa : false;

  // 1.googleBooksApi→バッチだとうまぐ動かないのでなし

  try {
    // 2.ndl
    const ndlBook = await ndlSearchUtil.getNdlBook(isbn);
    if (ndlBook) {
      apiBook = {
        ...ndlBook,
        memo: null,
        isOnKadokawa,
      };
      if (!apiBook.publisherName) {
        apiBook.publisherName = masterPublisherName;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return apiBook;
};
export const searchApiBooks = async (
  bookName: string,
  authorName: string,
  publisherName: string
) => {
  const apiBooks: ApiBook[] = [];

  const ndlBooks = await ndlSearchUtil.searchNdlBooks(
    bookName,
    authorName,
    publisherName
  );
  ndlBooks.forEach((book) => {
    let masterPublisherName = null;
    let isOnKadokawa = false;
    if (book.isbn) {
      const masterPublisher = findMasterPublisher(book.isbn);
      masterPublisherName = masterPublisher ? masterPublisher.name : null;
      isOnKadokawa = masterPublisher ? masterPublisher.isOnKadokawa : false;
    }
    apiBooks.push({
      bookName: book.bookName,
      isbn: book.isbn,
      authorName: book.authorName,
      publisherName: book.publisherName || masterPublisherName,
      coverUrl: book.coverUrl,
      memo: null,
      publishedMonth: book.publishedMonth,
      isOnKadokawa,
    });
  });
  // ソートしてisbnある本が上になるようにする
  return apiBooks.sort((a, b) => {
    if (!b.isbn) {
      return -1;
    } else if (!a.isbn) {
      return 1;
    } else {
      return 0;
    }
  });
};
