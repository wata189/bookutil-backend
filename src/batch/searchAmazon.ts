import puppeteer, { Page } from "puppeteer";
import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";

const AMZN_URL = "https://www.amazon.co.jp/dp/";

const TAG = {
  KINDLE_UNLIMITED: "キンドルアンリミテッド",
  AUDIBLE: "オーディブル",
  BOOK_WORKER: "ブックウォーカー",
};

const FIRESTORE_LIMIT = 495;

const main = async () => {
  console.log("start");

  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const toreadBooks = await models.fetchToreadBooks(true, fs);
      return { toreadBooks };
    },
  ])) as { toreadBooks: models.ToreadBook[] };

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    .filter((b) => !b.tags.includes(TAG.BOOK_WORKER)) // ブックウォーカーは除外
    .slice(0, 50); // TODO: テストなので一部だけ

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  // amazonのページスクレイピングしてキンドルアンリミテッド・オーディブルチェック
  const addKindleUnlimitedTagBooks: models.SimpleBook[] = [];
  const deleteKindleUnlimitedTagBooks: models.SimpleBook[] = [];
  const addAudibleTagBooks: models.SimpleBook[] = [];
  const deleteAudibleTagBooks: models.SimpleBook[] = [];
  for (const toreadBook of toreadBooks) {
    try {
      // いちおう1秒待つ
      await util.wait(1);

      let isbn10 = toreadBook.isbn;
      if (!isbn10) {
        continue;
      }
      if (isbn10.length !== 10) {
        isbn10 = util.isbn13To10(isbn10);
      }

      const url = AMZN_URL + isbn10;
      await page.goto(url);
      const hasKindleUnlimited = await searchKindleUnlimited(page);
      const hasAudible = await searchAudible(page);

      const simpleBook = {
        documentId: toreadBook.documentId,
        updateAt: toreadBook.updateAt,
      };
      if (
        hasKindleUnlimited &&
        !toreadBook.tags.includes(TAG.KINDLE_UNLIMITED)
      ) {
        console.log(`キンドルアンリミテッドタグ追加: ${toreadBook.bookName}`);
        addKindleUnlimitedTagBooks.push(simpleBook);
      } else if (
        !hasKindleUnlimited &&
        toreadBook.tags.includes(TAG.KINDLE_UNLIMITED)
      ) {
        console.log(`キンドルアンリミテッドタグ削除: ${toreadBook.bookName}`);
        deleteKindleUnlimitedTagBooks.push(simpleBook);
      }
      if (hasAudible && !toreadBook.tags.includes(TAG.AUDIBLE)) {
        console.log(`オーディブルタグ追加: ${toreadBook.bookName}`);
        addAudibleTagBooks.push(simpleBook);
      } else if (!hasAudible && toreadBook.tags.includes(TAG.AUDIBLE)) {
        console.log(`オーディブルタグ削除: ${toreadBook.bookName}`);
        deleteAudibleTagBooks.push(simpleBook);
      }
    } catch (e) {
      console.error(e);
      continue;
    }

    if (
      addAudibleTagBooks.length > FIRESTORE_LIMIT ||
      addAudibleTagBooks.length > FIRESTORE_LIMIT ||
      deleteAudibleTagBooks.length > FIRESTORE_LIMIT ||
      deleteKindleUnlimitedTagBooks.length > FIRESTORE_LIMIT
    ) {
      break;
    }
  }

  await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      console.log(
        `キンドルアンリミテッドタグ追加: ${addKindleUnlimitedTagBooks.length}`
      );
      if (addKindleUnlimitedTagBooks.length > FIRESTORE_LIMIT) {
        console.warn("  500件に近いため中断があります");
      }
      const params: models.SimpleBooksParams = {
        idToken: "",
        books: addKindleUnlimitedTagBooks,
        tags: [TAG.KINDLE_UNLIMITED],
        user: "batch/searchAmazon.ts",
      };
      await models.addToreadTag(params, fs);

      return {};
    },
    async (fs: firestoreUtil.FirestoreTransaction) => {
      console.log(
        `キンドルアンリミテッドタグ削除: ${deleteKindleUnlimitedTagBooks.length}`
      );
      if (deleteKindleUnlimitedTagBooks.length > FIRESTORE_LIMIT) {
        console.warn("  500件に近いため中断があります");
      }
      const params: models.SimpleBooksParams = {
        idToken: "",
        books: deleteKindleUnlimitedTagBooks,
        tags: [TAG.KINDLE_UNLIMITED],
        user: "batch/searchAmazon.ts",
      };
      await models.deleteToreadTag(params, fs);
      return {};
    },
    async (fs: firestoreUtil.FirestoreTransaction) => {
      console.log(`オーディブルタグ追加: ${addAudibleTagBooks.length}`);
      if (addAudibleTagBooks.length > FIRESTORE_LIMIT) {
        console.warn("  500件に近いため中断があります");
      }
      const params: models.SimpleBooksParams = {
        idToken: "",
        books: addAudibleTagBooks,
        tags: [TAG.AUDIBLE],
        user: "batch/searchAmazon.ts",
      };
      await models.addToreadTag(params, fs);
      return {};
    },
    async (fs: firestoreUtil.FirestoreTransaction) => {
      console.log(`オーディブルタグ削除: ${deleteAudibleTagBooks.length}`);
      if (deleteAudibleTagBooks.length > FIRESTORE_LIMIT) {
        console.warn("  500件に近いため中断があります");
      }
      const params: models.SimpleBooksParams = {
        idToken: "",
        books: deleteAudibleTagBooks,
        tags: [TAG.AUDIBLE],
        user: "batch/searchAmazon.ts",
      };
      await models.deleteToreadTag(params, fs);
      return {};
    },
  ]);

  await discordUtil.sendAlert("Amazon検索が完了しました");
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
main().then(() => {
  console.log("end");
  process.exit();
});
