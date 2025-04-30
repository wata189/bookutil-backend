import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import { systemLogger } from "../modules/logUtil";
import { checkCalil } from "../modules/calilUtil";

const JOB_USER = "batch/updateLibraryPriority.ts";
import nqdm from "nqdm";
const FIRESTORE_TRANSACTION_LIMIT = 495;

const IS_BEFORE_MOVING = true; // TODO:引越し前フラグ

type updateLibrary = {
  id: string;
  city: string;
};
const LIBRARIES: updateLibrary[] = [
  { id: "Tokyo_Shinjuku", city: "新宿区" },
  { id: "Tokyo_Bunkyo", city: "文京区" },
  { id: "Tokyo_Chiyoda", city: "千代田区" },
  { id: "Tokyo_Taito", city: "台東区" },
  { id: "Tokyo_Nakano", city: "中野区" },
  { id: "Tokyo_Shibuya", city: "渋谷区" },
  { id: "Tokyo_Minato", city: "港区" },
  { id: "Tokyo_Toshima", city: "豊島区" },
  { id: "Tokyo_NDL", city: "国会" },
];

const main = async () => {
  systemLogger.log("start");

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendSearchAmazon(
    `【${yyyyMMdd}】図書館優先度アップデートを開始しました!`
  );

  const data = (await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      const toreadBooks = await models.fetchToreadBooks(true, fs);
      return { toreadBooks };
    },
  ])) as { toreadBooks: models.ToreadBook[] };

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    .filter((b) => b.tags.includes("よみたい")) // よみたいだけ
    .filter((b) => b.tags.join("/").includes("図書館")) // 図書館タグついているものだけ
    .filter((b) => !b.tags.includes("新宿区電子図書館")) // 電子図書館タグ入は除外
    .filter((b) => !b.tags.includes("新宿区図書館")); // TODO:優先度変わらない図書館のタグ入は除外

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
      `エラー発生のため最後まで処理が完了していません`
    );
    systemLogger.warn(e);
  }

  // 500件ずつにトランザクションを分割する
  for (const splitedResults of util.splitArray(
    searchResults,
    FIRESTORE_TRANSACTION_LIMIT
  )) {
    await firestoreUtil.tran([
      async (fs: firestoreUtil.FirestoreTransaction) => {
        for await (const searchResult of splitedResults) {
          const library = searchResult.library;
          const book = searchResult.book;
          // タグ更新
          let updateTags: string[] = [];
          if (IS_BEFORE_MOVING) {
            updateTags = book.tags.filter((tag) => tag != "図書館未定");
          } else {
            // 引越し後の場合は図書館未定タグと図書館タグすべてけす
            updateTags = book.tags.filter((tag) => !tag.includes("図書館"));
          }

          // 今の図書館タグ追加する
          const libTag =
            library.city + (IS_BEFORE_MOVING ? "引越後" : "") + "図書館";
          updateTags.push(libTag);
          updateTags.push("よみたい");

          //DB更新
          const bookParams: models.BookParams = {
            ...book,
            user: JOB_USER, //更新ユーザーは独自のものにする
            idToken: "",
            isExternalCooperation: true,
          };
          // 更新タグは重複消す
          bookParams.tags = util.removeDuplicateElements(updateTags);

          await models.updateToreadBook(book.documentId, bookParams, fs);
        }
        return {};
      },
    ]);
  }

  await discordUtil.sendSearchAmazon(
    `図書館優先度アップデートが完了しました！`
  );
};

// Start script
main().catch((err) => {
  systemLogger.error(err);
  process.exit(1);
});
