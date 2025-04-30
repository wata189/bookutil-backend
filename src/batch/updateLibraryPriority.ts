import * as util from "../modules/util";
import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as discordUtil from "../modules/discordUtil";
import { systemLogger } from "../modules/logUtil";
import { checkCalil } from "../modules/calilUtil";

const JOB_USER = "batch/updateLibraryPriority.ts";
import nqdm from "nqdm";

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
      const libraries = await models.fetchLibraries(fs);
      return { toreadBooks, libraries };
    },
  ])) as { toreadBooks: models.ToreadBook[]; libraries: models.Library[] };

  const toreadBooks = data.toreadBooks
    .filter((b) => b.isbn) // isbnあるものだけ
    .filter((b) => b.tags.includes("よみたい")) // よみたいだけ
    .filter((b) => b.tags.join("/").includes("図書館")) // 図書館タグついているものだけ
    .filter((b) => !b.tags.includes("新宿区電子図書館")) // 電子図書館タグ入は除外
    .filter((b) => !b.tags.includes("新宿区図書館")) // 優先度変わらない図書館のタグ入は除外
    .filter((b) => !b.tags.includes("渋谷区図書館"))
    .filter((b) => !b.tags.includes("千代田区図書館"));

  type SearchResult = {
    book: models.ToreadBook;
    library: models.Library;
    reserveUrl: string;
  };
  const searchResults: SearchResult[] = [];
  try {
    // 図書館×本で検索 break・continueを使う関係でfor awaitで同期処理
    for await (const book of nqdm(toreadBooks)) {
      if (!book.isbn) continue;
      for (const library of data.libraries) {
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
    systemLogger.warn(e);
  }

  await firestoreUtil.tran([
    async (fs: firestoreUtil.FirestoreTransaction) => {
      for await (const searchResult of searchResults) {
        const library = searchResult.library;
        const book = searchResult.book;
        // タグ更新
        // 図書館未定タグと図書館タグすべてけす
        // 「図書館」という文字列が入るタグを削除すればよい
        const updateTags = book.tags.filter((tag) => !tag.includes("図書館"));
        // 今の図書館タグ追加する
        updateTags.push(library.city + "図書館");
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

  await discordUtil.sendSearchAmazon(
    `図書館優先度アップデートが完了しました！`
  );
};

// Start script
main().catch((err) => {
  systemLogger.error(err);
  process.exit(1);
});
