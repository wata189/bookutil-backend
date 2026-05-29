import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import { systemLogger } from "../modules/logUtil";
import { checkCalil } from "../modules/calilUtil";

const JOB_USER = "batch/updateLibraryPriority.ts";
import nqdm from "nqdm";
const FIRESTORE_TRANSACTION_LIMIT = 495;

type updateLibrary = {
  id: string;
  city: string;
};
const LIBRARIES: updateLibrary[] = [
  { id: "Tokyo_Shinjuku", city: "新宿区" },
  { id: "Tokyo_Bunkyo", city: "文京区" },
  { id: "Tokyo_Chiyoda", city: "千代田区" },
  { id: "Tokyo_Shibuya", city: "渋谷区" },
  { id: "Tokyo_Taito", city: "台東区" },
  { id: "Tokyo_Toshima", city: "豊島区" },
  { id: "Tokyo_Minato", city: "港区" },
  { id: "Tokyo_Nakano", city: "中野区" },
  { id: "Tokyo_NDL", city: "国会" },
];

const main = async () => {
  systemLogger.log("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendSearchAmazon(
    `【${yyyyMMdd}】図書館検索を開始しました!`,
  );

  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const toreadBooks = await models.fetchToreadBooks(true, fs);
      return { toreadBooks };
    },
  ])) as { toreadBooks: models.ToreadBook[] };

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    .filter((b) => !b.tags.join("/").includes("区図書館")) // 特定のタグついているもの除外
    .filter((b) => !b.tags.includes("かいたい"))
    .filter((b) => !b.tags.includes("オーディブル"))
    .filter((b) => !b.tags.includes("無料"))
    .filter((b) => !b.tags.includes("ブックウォーカー"))
    .filter((b) => !b.tags.includes("国会図書館")) // 国会図書館除外
    .filter((b) => !b.tags.includes("新宿区電子図書館")); // 電子図書館タグは除外

  type SearchResult = {
    book: models.ToreadBook;
    library: updateLibrary;
    reserveUrl: string;
  };
  const searchResults: SearchResult[] = [];
  try {
    // 図書館×本で検索 break・continueを使う関係でfor awaitで同期処理
    for await (const book of nqdm(toreadBooks)) {
      if (!book.isbn) continue;
      for (const library of LIBRARIES) {
        // カーリル処理
        const calilResult = await checkCalil(book.isbn, library.id);

        // カーリルの結果あった場合のみ更新処理
        if (!calilResult.isExist) continue;

        searchResults.push({
          book: book,
          library,
          reserveUrl: calilResult.reserveUrl,
        });

        //それ以下の図書館は検索しなくてよいのでbreak
        break;
      }
    }
  } catch (e) {
    // エラーキャッチ（たぶんAPI上限）したらそこまでの部分をDB登録
    await discordUtil.sendSearchAmazon(
      `エラー発生のため最後まで処理が完了していません`,
    );
    systemLogger.warn(e);
  }

  // 500件ずつにトランザクションを分割して並列更新
  await Promise.all(
    util
      .splitArray(searchResults, FIRESTORE_TRANSACTION_LIMIT)
      .map(async (splitedResults) => {
        await firestoreUtil.tran([
          async (fs: firestoreUtil.FirestoreTransaction) => {
            // DB更新
            await Promise.all(
              splitedResults.map(async (searchResult) => {
                const library = searchResult.library;
                const book = searchResult.book;
                // タグ更新
                const updateTags: string[] = book.tags;

                // 今の図書館タグ追加する
                updateTags.push(library.city + "図書館");

                const bookParams: models.BookParams = {
                  ...book,
                  user: JOB_USER, //更新ユーザーは独自のものにする
                  idToken: "",
                  isExternalCooperation: true,
                };
                // 更新タグは重複消す
                bookParams.tags = util.removeDuplicateElements(updateTags);

                await models.updateToreadBook(book.documentId, bookParams, fs);
              }),
            );
            return {};
          },
        ]);
      }),
  );

  await discordUtil.sendSearchAmazon(`図書館検索が完了しました！`);
};

// Start script
main().catch((err) => {
  systemLogger.error(err);
  process.exit(1);
});
