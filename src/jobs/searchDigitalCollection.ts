import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import * as calilUtil from "../modules/calilUtil";
import { systemLogger } from "../modules/logUtil";

const JOB_USER = "jobs/searchDigitalCollection.ts";

const TAG = {
  KINDLE_UNLIMITED: "キンドルアンリミテッド",
  DIGITAL_COLLECTION: "デジタルコレクション",
  BOOK_WORKER: "ブックウォーカー",
  FREE: "無料",
};
const main = async () => {
  systemLogger.info("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendCheckLibrary(
    `【${yyyyMMdd}】デジタルコレクション検索を開始しました！
なるべくよみたいリストを更新しないでください！`
  );

  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const toreadBooks = await models.fetchToreadBooks(true, fs);
      return { toreadBooks };
    },
  ])) as { toreadBooks: models.ToreadBook[] };

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    // 指定タグは除外
    .filter((b) => !b.tags.includes(TAG.KINDLE_UNLIMITED))
    .filter((b) => !b.tags.includes(TAG.BOOK_WORKER))
    .filter((b) => !b.tags.includes(TAG.FREE));

  let i = 0;
  const total = toreadBooks.length;
  const addTagBooks: models.SimpleBook[] = [];
  const deleteTagBooks: models.SimpleBook[] = [];
  for (const toreadBook of toreadBooks) {
    i++;
    systemLogger.info(`${i}冊目/全${total}冊`);

    if (!toreadBook.isbn) {
      return;
    }

    const hasDigitalCollectionTag = toreadBook.tags.includes(
      TAG.DIGITAL_COLLECTION
    );
    const isDigitalCollectionExists = await calilUtil.checkNdlDigitalCollection(
      toreadBook.isbn
    );
    const simpleBook: models.SimpleBook = {
      documentId: toreadBook.documentId,
      updateAt: toreadBook.updateAt,
    };
    // 検索結果あり・タグなし→タグ追加
    if (isDigitalCollectionExists && !hasDigitalCollectionTag) {
      addTagBooks.push(simpleBook);

      // 検索結果なし・タグあり→タグ削除
    } else if (!isDigitalCollectionExists && hasDigitalCollectionTag) {
      deleteTagBooks.push(simpleBook);
    }
    // 4秒待つ
    // 60秒 / 4秒 * 60分 = 900で、 1000冊/hにおさまる
    await util.wait(4);
  }

  await discordUtil.sendCheckLibrary(
    `デジタルコレクション検索が完了しました！`
  );

  await firestoreUtil.tran([
    addToreadTag(
      addTagBooks,
      TAG.DIGITAL_COLLECTION,
      "デジタルコレクションタグ追加",
      toreadBooks
    ),
    deleteToreadTag(
      deleteTagBooks,
      TAG.DIGITAL_COLLECTION,
      "デジタルコレクションタグ削除",
      toreadBooks
    ),
  ]);
};
const addToreadTag = (
  books: models.SimpleBook[],
  tag: string,
  msgTitle: string,
  toreadBooks: models.ToreadBook[]
) => {
  return async (fs: firestoreUtil.FirestoreTransaction) => {
    await sendSimpleBookAlertMsg(books, msgTitle, toreadBooks);
    const params: models.SimpleBooksParams = {
      idToken: "",
      books: books,
      tags: [tag],
      user: JOB_USER,
    };
    await models.addToreadTag(params, fs);
    return {};
  };
};
const deleteToreadTag = (
  books: models.SimpleBook[],
  tag: string,
  msgTitle: string,
  toreadBooks: models.ToreadBook[]
) => {
  return async (fs: firestoreUtil.FirestoreTransaction) => {
    await sendSimpleBookAlertMsg(books, msgTitle, toreadBooks);
    const params: models.SimpleBooksParams = {
      idToken: "",
      books: books,
      tags: [tag],
      user: JOB_USER,
    };
    await models.deleteToreadTag(params, fs);
    return {};
  };
};
const sendSimpleBookAlertMsg = async (
  books: models.SimpleBook[],
  msgTitle: string,
  toreadBooks: models.ToreadBook[]
) => {
  let msg = `${msgTitle}: ${books.length}`;
  msg += "\n";
  msg += books
    .map((book) => {
      const toreadBook = toreadBooks.find(
        (b) => b.documentId === book.documentId
      );
      return `- ${toreadBook?.authorName}『${toreadBook?.bookName}』`;
    })
    .join("\n");
  await discordUtil.sendCheckLibrary(msg);
};

main().then(() => {
  systemLogger.info("end");
  process.exit();
});
