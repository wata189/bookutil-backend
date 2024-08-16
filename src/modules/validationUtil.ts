import { Response } from "express";

import * as util from "./util";
import * as models from "./models";
import * as errorUtil from "./errorUtil";
import * as firestoreUtil from "./firestoreUtil";
import { systemLogger } from "./logUtil";

export const isAuth = (
  res: Response,
  isAuth: boolean,
  isExternalCooperation?: boolean
) => {
  if (!isAuth && !isExternalCooperation) {
    errorUtil.throwError(
      res,
      "ログインをしてください",
      util.STATUS_CODES.UNAUTHORIZED
    );
  }
};

const NOT_EXISTS: unknown[] = ["", null, undefined, NaN];
export const isExist = (val: unknown) => {
  return !NOT_EXISTS.includes(val);
};
export const isExistArray = (val: unknown[]) => {
  return val.length > 0;
};
export const isFlg = (val: unknown) => {
  return val === 1 || val === 0;
};
export const isNumber = (val: unknown) => {
  if (typeof val === "number") {
    return true;
  } else if (typeof val === "string") {
    const regex1 = /^-?[0-9]$/;
    const regex10 = /^-?[0-9]*\.?[0-9]+$/;

    return regex10.test(val) || regex1.test(val);
  } else {
    return false;
  }
};
export const isPlus = (val: number) => {
  return val > 0;
};
export const isIsbn = (val: string) => {
  return util.isIsbn(val);
};
export const isUrl = (val: string) => {
  const regex = /^https?:\/\//;
  return regex.test(val);
};
export const isInOfRange = (start: number, end: number) => {
  return (val: number) => {
    return start <= val && val <= end;
  };
};
export const isDateStr = (val: string) => {
  const regex = /^\d{4}\/\d{2}\/\d{2}/;
  return regex.test(val);
};
export const isValidDate = (val: string) => {
  const date = new Date(val);
  return !isNaN(date.getDate());
};

const throwInvalidParam = <T>(param: T, checkFunc: (val: T) => boolean) => {
  if (!checkFunc(param)) throw new Error();
};

export const isValidBook = (res: Response, params: models.BookParams) => {
  try {
    throwInvalidParam(params.bookName, isExist);

    throwInvalidParam(params.newBookCheckFlg, isFlg);

    throwInvalidParam(params.user, isExist);

    if (params.isbn) throwInvalidParam(params.isbn, isIsbn);

    if (params.page) {
      throwInvalidParam(params.page, isNumber);
      throwInvalidParam(params.page, isPlus);
    }

    if (params.coverUrl) throwInvalidParam(params.coverUrl, isUrl);

    if (params.newBookCheckFlg === 1) throwInvalidParam(params.isbn, isExist);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

export const isValidCreateBooks = (
  res: Response,
  params: models.CreateBooksParams
) => {
  try {
    throwInvalidParam(params.user, isExist);
    throwInvalidParam(params.books, isExist);
    throwInvalidParam(params.books, isExistArray);
    for (const book of params.books) {
      isValidBook(res, book);
    }
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

export const isValidUpdateBook = (res: Response, params: models.BookParams) => {
  try {
    throwInvalidParam(params.documentId, isExist);
    throwInvalidParam(params.updateAt, isExist);
    throwInvalidParam(params.updateAt, isNumber);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};
export const isValidSimpleBook = (
  res: Response,
  params: models.SimpleBookParams
) => {
  try {
    throwInvalidParam(params.book, isExist);
    throwInvalidParam(params.book.documentId, isExist);
    throwInvalidParam(params.book.updateAt, isExist);
    throwInvalidParam(params.book.updateAt, isNumber);
    throwInvalidParam(params.user, isExist);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};
export const isValidGetWantTagParams = (
  res: Response,
  params: models.GetWantTagParams
) => {
  try {
    throwInvalidParam(params.isbn, isExist);
    throwInvalidParam(params.isbn, isIsbn);
    throwInvalidParam(params.user, isExist);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ISBN被りチェック 新規作成
export const isCreateUniqueIsbn = async (
  res: Response,
  isbn: string | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  // isbn空の場合は問題なし
  if (!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(
    firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK,
    "isbn",
    "isbn",
    "in",
    [isbn10, isbn13]
  );
  if (result.length > 0) {
    errorUtil.throwError(
      res,
      "同じISBNの本があります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

export const isCreateBooksUniqueIsbn = async (
  res: Response,
  books: models.BookParams[],
  fs: firestoreUtil.FirestoreTransaction
) => {
  // 作成する本に重複ISBNがあるかどうか確認
  const isbns: string[] = books
    .map((book) => (book.isbn ? book.isbn : ""))
    .filter((isbn) => isExist(isbn))
    .map((isbn) => {
      // isbn13に統一
      return isbn.length === 13 ? isbn : util.isbn10To13(isbn);
    });
  // 重複削除すると長さが変わる→重複するISBNがある→エラー
  if (isbns.length !== util.removeDuplicateElements(isbns).length) {
    errorUtil.throwError(
      res,
      "同じISBNの本があります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }

  // DB側のチェック
  const promises: Promise<void>[] = [];
  for (const book of books) {
    promises.push(isCreateUniqueIsbn(res, book.isbn, fs));
  }
  await Promise.all(promises);
};

//ISBN被りチェック 更新
export const isUpdateUniqueIsbn = async (
  res: Response,
  documentId: string,
  isbn: string | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  //isbn空の場合は問題ない
  if (!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(
    firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK,
    "isbn",
    "isbn",
    "in",
    [isbn10, isbn13]
  );
  const sameIsbnBook = result.find(
    (resultRow) => resultRow.documentId !== documentId
  );
  if (sameIsbnBook) {
    errorUtil.throwError(
      res,
      "同じISBNの本があります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ID存在チェック
export const isExistBookId = async (
  res: Response,
  documentId: string,
  fs: firestoreUtil.FirestoreTransaction
) => {
  const book = await util.getToreadBook(documentId, fs);
  if (!isExist(book)) {
    errorUtil.throwError(
      res,
      "本が削除されています",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//コンフリクトチェック
export const isNotConflictBook = async (
  res: Response,
  documentId: string,
  updateAt: number | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  const book = await util.getToreadBook(documentId, fs);
  if (!book || book.update_at.seconds !== updateAt) {
    errorUtil.throwError(
      res,
      "本の情報が更新されています",
      util.STATUS_CODES.CONFLICT
    );
  }
};

//複数選択の本のバリデーション
export const isValidBooks = (res: Response, params: models.BooksParams) => {
  try {
    throwInvalidParam(params.books, isExist);
    throwInvalidParam(params.books, isExistArray);
    throwInvalidParam(params.user, isExist);

    for (const deleteBook of params.books) {
      throwInvalidParam(deleteBook.documentId, isExist);
      throwInvalidParam(deleteBook.updateAt, isExist);
      throwInvalidParam(deleteBook.updateAt, isNumber);
    }
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//タグ追加のバリデーション
export const isValidTag = (res: Response, params: models.BooksParams) => {
  try {
    throwInvalidParam(params.tags, isExist);
    if (params.tags) {
      throwInvalidParam(params.tags, isExistArray);
    }
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ID存在チェック 複数
export const isExistBooksId = async (
  res: Response,
  books: models.SimpleBook[],
  fs: firestoreUtil.FirestoreTransaction
) => {
  const promises = [];
  for (const book of books) {
    promises.push(isExistBookId(res, book.documentId, fs));
  }
  await Promise.all(promises);
};

//コンフリクトチェック 複数
export const isNotConflictBooks = async (
  res: Response,
  books: models.SimpleBook[],
  fs: firestoreUtil.FirestoreTransaction
) => {
  const promises = [];
  for (const book of books) {
    promises.push(isNotConflictBook(res, book.documentId, book.updateAt, fs));
  }
  await Promise.all(promises);
};

export const isValidAddNewBooksParams = (
  res: Response,
  params: models.AddNewBooksParams
) => {
  try {
    throwInvalidParam(params.user, isExist);

    for (const newBook of params.newBooks) {
      throwInvalidParam(newBook.bookName, isExist);
      throwInvalidParam(newBook.newBookCheckFlg, isFlg);

      if (newBook.isbn) {
        throwInvalidParam(newBook.isbn, isIsbn);
      }

      if (newBook.newBookCheckFlg === 1) {
        throwInvalidParam(newBook.isbn, isExist);
      }

      throwInvalidParam(newBook.documentId, isExist);
      throwInvalidParam(newBook.updateAt, isExist);
      throwInvalidParam(newBook.updateAt, isNumber);
      throwInvalidParam(newBook.isAdd, isFlg);
    }
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ID存在チェック
export const isExistNewBooksId = async (
  res: Response,
  newBooks: models.NewBookForm[],
  fs: firestoreUtil.FirestoreTransaction
) => {
  const promises: Promise<FirebaseFirestore.DocumentData | undefined>[] = [];
  for (const newBook of newBooks) {
    promises.push(util.getNewBook(newBook.documentId, fs));
  }

  const documents = await Promise.all(promises);
  for (const document of documents) {
    if (!isExist(document)) {
      errorUtil.throwError(
        res,
        "本が削除されています",
        util.STATUS_CODES.BAD_REQUEST
      );
    }
  }
};

//コンフリクトチェック
export const isNotConflictNewBooks = async (
  res: Response,
  newBooks: models.NewBookForm[],
  fs: firestoreUtil.FirestoreTransaction
) => {
  for (const newBook of newBooks) {
    const newBookDocument = await util.getNewBook(newBook.documentId, fs);

    if (
      !newBookDocument ||
      newBookDocument.update_at.seconds !== newBook.updateAt
    ) {
      errorUtil.throwError(
        res,
        "本の情報が更新されています",
        util.STATUS_CODES.CONFLICT
      );
    }
  }
};

export const isValidBookshelfBook = (
  res: Response,
  params: models.BookshelfBookParams
) => {
  try {
    throwInvalidParam(params.bookName, isExist);
    throwInvalidParam(params.user, isExist);
    throwInvalidParam(params.rate, isExist);
    throwInvalidParam(params.rate, Number.isInteger);
    throwInvalidParam(params.rate, isInOfRange(0, 5));

    if (params.isbn) {
      throwInvalidParam(params.isbn, isIsbn);
    }
    if (params.coverUrl) {
      throwInvalidParam(params.coverUrl, isUrl);
    }
    if (params.readDate) {
      throwInvalidParam(params.readDate, isDateStr);
      throwInvalidParam(params.readDate, isValidDate);
    }
    for (const content of params.contents) {
      throwInvalidParam(content.contentName, isExist);
      throwInvalidParam(content.rate, isExist);
      throwInvalidParam(content.rate, Number.isInteger);
      throwInvalidParam(content.rate, isInOfRange(0, 5));
    }
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};
export const isValidUpdateBookshelfBook = (
  res: Response,
  params: models.BookshelfBookParams
) => {
  try {
    throwInvalidParam(params.documentId, isExist);
    throwInvalidParam(params.updateAt, isExist);
    throwInvalidParam(params.updateAt, isNumber);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};
//ISBN被りチェック 新規作成
export const isCreateUniqueBookshelfIsbn = async (
  res: Response,
  isbn: string | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  // isbn空の場合は問題なし
  if (!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(
    firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK,
    "isbn",
    "isbn",
    "in",
    [isbn10, isbn13]
  );
  if (result.length > 0) {
    errorUtil.throwError(
      res,
      "同じISBNの本があります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ISBN被りチェック 更新
export const isUpdateUniqueBookshelfIsbn = async (
  res: Response,
  documentId: string,
  isbn: string | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  //isbn空の場合は問題ない
  if (!isbn || !isExist(isbn)) return;

  const isbn10 = isbn.length === 10 ? isbn : util.isbn13To10(isbn);
  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  const result = await fs.getCollection(
    firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK,
    "isbn",
    "isbn",
    "in",
    [isbn10, isbn13]
  );
  const sameIsbnBook = result.find(
    (resultRow) => resultRow.documentId !== documentId
  );
  if (sameIsbnBook) {
    errorUtil.throwError(
      res,
      "同じISBNの本があります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//ID存在チェック
export const isExistBookshelfBookId = async (
  res: Response,
  documentId: string,
  fs: firestoreUtil.FirestoreTransaction
) => {
  const book = await util.getBookshelfBook(documentId, fs);
  if (!isExist(book)) {
    errorUtil.throwError(
      res,
      "本が削除されています",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};

//コンフリクトチェック
export const isNotConflictBookshelfBook = async (
  res: Response,
  documentId: string,
  updateAt: number | null,
  fs: firestoreUtil.FirestoreTransaction
) => {
  const book = await util.getBookshelfBook(documentId, fs);
  if (!book || book.update_at.seconds !== updateAt) {
    errorUtil.throwError(
      res,
      "本の情報が更新されています",
      util.STATUS_CODES.CONFLICT
    );
  }
};

export const isValidSimpleBookshelfBook = async (
  res: Response,
  params: models.SimpleBookshelfBookParams
) => {
  try {
    throwInvalidParam(params.documentId, isExist);
    throwInvalidParam(params.updateAt, isExist);
    throwInvalidParam(params.updateAt, isNumber);
    throwInvalidParam(params.user, isExist);
  } catch (e) {
    systemLogger.error(e);
    errorUtil.throwError(
      res,
      "不正なパラメータがあります",
      util.STATUS_CODES.BAD_REQUEST
    );
  }
};
