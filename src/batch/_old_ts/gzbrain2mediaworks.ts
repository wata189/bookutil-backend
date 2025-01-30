import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";

const MEDIAWORKS_PUBLISHER_CODE = "8402";
const MEDIAWORKS_PUBLISHER_NAME = "メディアワークス";

const JOB_USER = "batch/gzbrain2mediaworks.ts";

const main = async () => {
  console.log("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendAlert(`【${yyyyMMdd}】バッチ処理開始`);

  let toreadBooks: models.ToreadBook[] = [];
  let bookshelfBooks: models.BookshelfBook[] = [];

  await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      toreadBooks = await models.fetchToreadBooks(true, fs);
      bookshelfBooks = await models.fetchBookshelfBooks(true, fs);
      return {};
    },
  ]);

  const updateToreadBooks: models.ToreadBook[] = toreadBooks
    .filter((b) => b.isbn?.startsWith("4" + MEDIAWORKS_PUBLISHER_CODE))
    .map((b) => {
      b.publisherName = MEDIAWORKS_PUBLISHER_NAME;
      return b;
    });
  const updateBookshelfBooks: models.BookshelfBook[] = bookshelfBooks
    .filter((b) => b.isbn?.startsWith("4" + MEDIAWORKS_PUBLISHER_CODE))
    .map((b) => {
      b.publisherName = MEDIAWORKS_PUBLISHER_NAME;
      return b;
    });

  const promises: Promise<void>[] = [];
  await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      for (const b of updateToreadBooks) {
        const params: models.BookParams = {
          ...b,
          user: JOB_USER,
          idToken: null,
          isExternalCooperation: true,
        };
        promises.push(models.updateToreadBook(b.documentId, params, fs));
      }
      return {};
    },
    async (fs: firestoreUtil.FirestoreTransaction) => {
      for (const b of updateBookshelfBooks) {
        const params: models.BookshelfBookParams = {
          ...b,
          user: JOB_USER,
          idToken: null,
        };
        promises.push(models.updateBookshelfBook(params, fs));
      }
      return {};
    },
  ]);
  await Promise.all(promises);
  await discordUtil.sendAlert(`バッチ処理終了`);
};

main().then(() => {
  console.log("end");
  process.exit();
});
