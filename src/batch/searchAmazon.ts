import puppeteer, { Page } from "puppeteer";
import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import { Timestamp } from "firebase-admin/firestore";
import nqdm from "nqdm";

const AMZN_URL = "https://www.amazon.co.jp/dp/";

const JOB_USER = "batch/searchAmazon.ts";

const TAG = {
  KINDLE_UNLIMITED: "キンドルアンリミテッド",
  AUDIBLE: "オーディブル",
  BOOK_WORKER: "ブックウォーカー",
  FREE: "無料",
  HAS_BUNKO: "文庫あり",
  HAS_NEWER_VERSION: "新版あり",
};

const FIRESTORE_LIMIT = 495;
const ALERT_MSG_LIMIT = "(500件に近いため中断があります)";

const at = Timestamp.fromDate(new Date());

const main = async () => {
  console.log("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendSearchAmazon(
    `【${yyyyMMdd}】Amazon検索を開始しました！
なるべくよみたいリストを更新しないでください！`
  );

  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const toreadBooks = await models.fetchToreadBooks(true, fs);
      return { toreadBooks };
    },
  ])) as { toreadBooks: models.ToreadBook[] };

  const toreadBookIsbns: string[] = [];
  for (const toreadBook of data.toreadBooks) {
    if (toreadBook.isbn) {
      const isbn10 =
        toreadBook.isbn.length === 10
          ? toreadBook.isbn
          : util.isbn13To10(toreadBook.isbn);
      toreadBookIsbns.push(isbn10);
    }
  }

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    // ブックウォーカー・無料タグは除外
    .filter((b) => !b.tags.includes(TAG.BOOK_WORKER))
    .filter((b) => !b.tags.includes(TAG.FREE));

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  // amazonのページスクレイピングしてキンドルアンリミテッド・オーディブルチェック
  const addKindleUnlimitedTagBooks: models.SimpleBook[] = [];
  const deleteKindleUnlimitedTagBooks: models.SimpleBook[] = [];
  const addAudibleTagBooks: models.SimpleBook[] = [];
  const bunkos: models.NewBookDocument[] = [];
  const addBunkoTagBooks: models.SimpleBook[] = [];
  const newerVersions: models.NewBookDocument[] = [];
  const addNewerVersionTagBooks: models.SimpleBook[] = [];
  for (const toreadBook of nqdm(toreadBooks)) {
    try {
      let isbn10 = toreadBook.isbn;
      if (!isbn10) {
        continue;
      }
      if (isbn10.length !== 10) {
        isbn10 = util.isbn13To10(isbn10);
      }

      const url = AMZN_URL + isbn10;
      await page.goto(url);

      // いちおう5秒待つ
      await util.wait(5);

      const simpleBook = {
        documentId: toreadBook.documentId,
        updateAt: toreadBook.updateAt,
      };

      const newerVersionIsbn10 = await getNewerVersionIsbn(page);
      if (
        newerVersionIsbn10 &&
        !toreadBookIsbns.includes(newerVersionIsbn10) &&
        !toreadBook.tags.includes(TAG.HAS_NEWER_VERSION)
      ) {
        addNewerVersionTagBooks.push(simpleBook);
        newerVersions.push({
          isbn: newerVersionIsbn10,
          author_name: toreadBook.authorName || "",
          book_name: toreadBook.bookName,
          publish_date: "",
          publisher_name: toreadBook.publisherName || "",
          tags: toreadBook.tags.join("/"),
          create_user: JOB_USER,
          update_user: JOB_USER,
          create_at: at,
          update_at: at,
          is_created_toread: false,
        });

        // 新版見つかった場合はそこで処理中断
        continue;
      }

      const hasKindleUnlimited = await searchKindleUnlimited(page);
      const hasAudible = await searchAudible(page);

      if (
        hasKindleUnlimited &&
        !toreadBook.tags.includes(TAG.KINDLE_UNLIMITED)
      ) {
        addKindleUnlimitedTagBooks.push(simpleBook);
      } else if (
        !hasKindleUnlimited &&
        toreadBook.tags.includes(TAG.KINDLE_UNLIMITED)
      ) {
        deleteKindleUnlimitedTagBooks.push(simpleBook);
      }
      if (hasAudible && !toreadBook.tags.includes(TAG.AUDIBLE)) {
        addAudibleTagBooks.push(simpleBook);
      }

      // 文庫検索
      const bunkoIsbn10 = await getBunkoIsbn(page);
      if (
        bunkoIsbn10 &&
        !toreadBookIsbns.includes(bunkoIsbn10) &&
        !toreadBook.tags.includes(TAG.HAS_BUNKO)
      ) {
        addBunkoTagBooks.push(simpleBook);
        bunkos.push({
          isbn: bunkoIsbn10,
          author_name: toreadBook.authorName || "",
          book_name: toreadBook.bookName,
          publish_date: "",
          publisher_name: toreadBook.publisherName || "",
          tags: toreadBook.tags.join("/"),
          create_user: JOB_USER,
          update_user: JOB_USER,
          create_at: at,
          update_at: at,
          is_created_toread: false,
        });
      }
    } catch (e) {
      console.error(e);
      continue;
    }

    if (
      addAudibleTagBooks.length > FIRESTORE_LIMIT ||
      addAudibleTagBooks.length > FIRESTORE_LIMIT ||
      deleteKindleUnlimitedTagBooks.length > FIRESTORE_LIMIT ||
      bunkos.length > FIRESTORE_LIMIT
    ) {
      break;
    }
  }

  await discordUtil.sendSearchAmazon(`Amazon検索が完了しました！`);
  const promises: Promise<void>[] = [];
  await firestoreUtil.tran([
    // newBookドキュメント追加
    // 通知はタグ追加の際に送る
    // 先にやっておくとpromisesの非同期処理を待ちながらタグ追加できる
    async (fs: firestoreUtil.FirestoreTransaction) => {
      for (const bunko of bunkos) {
        promises.push(
          fs.createDocument(firestoreUtil.COLLECTION_PATH.T_NEW_BOOK, bunko)
        );
      }
      return {};
    },
    async (fs: firestoreUtil.FirestoreTransaction) => {
      // 新版発見はタグ追加+newbookドキュメント追加
      for (const newerVersion of newerVersions) {
        promises.push(
          fs.createDocument(
            firestoreUtil.COLLECTION_PATH.T_NEW_BOOK,
            newerVersion
          )
        );
      }
      return {};
    },

    // 各種タグの追加削除
    addToreadTag(addBunkoTagBooks, TAG.HAS_BUNKO, "文庫発見", toreadBooks),
    addToreadTag(
      addNewerVersionTagBooks,
      TAG.HAS_NEWER_VERSION,
      "新版発見",
      toreadBooks
    ),
    addToreadTag(
      addKindleUnlimitedTagBooks,
      TAG.KINDLE_UNLIMITED,
      "キンドルアンリミテッドタグ追加",
      toreadBooks
    ),
    deleteToreadTag(
      deleteKindleUnlimitedTagBooks,
      TAG.KINDLE_UNLIMITED,
      "キンドルアンリミテッドタグ削除",
      toreadBooks
    ),
    addToreadTag(
      addAudibleTagBooks,
      TAG.AUDIBLE,
      "オーディブルタグ追加",
      toreadBooks
    ),
  ]);

  await Promise.all(promises);
};

const getBunkoIsbn = async (page: Page) => {
  const paperbackDiv = await page.$("#tmm-grid-swatch-PAPERBACK");

  if (!paperbackDiv) return null;

  const btn = await paperbackDiv.$("a"); // aタグ取得
  if (!btn) return null;

  // 文庫であること確認
  const title = await btn.$("span.slot-title span");
  if (!title) return null;
  const titleText = await (await title.getProperty("textContent")).jsonValue();
  if (!titleText || titleText !== "文庫") return null;

  // hrefからISBN取得
  const href = await btn.evaluate((node) => node.href);
  if (!href) return null;
  const isbn = href.split("/").find((piece) => util.isIsbn(piece));

  return isbn || null;
};
const getNewerVersionIsbn = async (page: Page) => {
  const newerVersionDiv = await page.$("#newer-version");

  if (!newerVersionDiv) return null;

  const link = await newerVersionDiv.$("a"); // aタグ取得
  if (!link) return null;

  // hrefからISBN取得
  const href = await link.evaluate((node) => node.href);
  if (!href) return null;
  const isbn = href.split("/").find((piece) => util.isIsbn(piece));

  return isbn || null;
};

const searchKindleUnlimited = async (page: Page) => {
  const kindleDiv = await page.$("#tmm-grid-swatch-KINDLE");

  if (!kindleDiv) return false;

  const btn = await kindleDiv.$("a"); // aタグ取得
  if (!btn) return false;

  // キンドルアンリミテッドのアイコンあるか
  const kindleUnlimitedIcon = await btn.$("i.a-icon-kindle-unlimited");

  return kindleUnlimitedIcon !== null;
};
const searchAudible = async (page: Page) => {
  const audibleDiv = await page.$("#tmm-grid-swatch-AUDIO_DOWNLOAD");

  return audibleDiv !== null;
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
  await discordUtil.sendSearchAmazon(msg);
  if (books.length > FIRESTORE_LIMIT) {
    await discordUtil.sendSearchAmazon(ALERT_MSG_LIMIT);
  }
};

main().then(() => {
  console.log("end");
  process.exit();
});
