import { systemLogger } from "../modules/logUtil";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as util from "../modules/util";
import * as models from "../modules/models";
import { checkCalil } from "../modules/calilUtil";
import * as discordUtil from "../modules/discordUtil";

import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";

const JOB_USER = "job/checkLibrary.ts";
const CLIENT_URL = process.env.CLIENT_URL;
const SALT = "salt";

const checkLibrary = async (fs: firestoreUtil.FirestoreTransaction) => {
  // newBookCheckFlg立ってる図書館を取得
  const libraries = (await searchCheckNewBookLibraries(fs)).sort(
    (a, b) => a.checkLibraryOrderNum - b.checkLibraryOrderNum
  );
  // newBookCheckFlg立っている本を取得
  const toreadBooks = await searchCheckNewBookToreadBooks(fs);
  // 図書館×本で検索 break・continueを使う関係でfor awaitで同期処理
  const searchResults = [];
  for await (const book of toreadBooks) {
    if (!book.isbn) continue; // isbn未入力は飛ばす

    for (const library of libraries) {
      // 検索対象or検索対象より優先度の高い図書館のタグ入っていたら飛ばす
      const cityTags = libraries
        .filter(
          (tmpLib) =>
            tmpLib.checkLibraryOrderNum <= library.checkLibraryOrderNum
        )
        .map((tmpLib) => tmpLib.city + "図書館");
      const isSearched =
        cityTags.filter((tag) => book.tags.includes(tag)).length > 0;
      if (isSearched) continue;

      // カーリル処理
      const calilResult = await checkCalil(book.isbn, library.id);

      // カーリルの結果あった場合のみ更新処理
      if (!calilResult.isExist) continue;

      searchResults.push({
        book,
        library,
        reserveUrl: calilResult.reserveUrl,
      });

      //それ以下の図書館は検索しなくてよいのでbreak
      break;
    }
  }
  // 検索結果あったら処理続行
  if (searchResults.length <= 0) return {};

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendCheckLibrary(
    `【${yyyyMMdd}】図書館で本が見つかったよ！`
  );

  // TODO: 重複気になる いったん同期にしてみる
  for (const searchResult of searchResults) {
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
      isExternalCooperation: false,
    };
    // 更新タグは重複消す
    bookParams.tags = util.removeDuplicateElements(updateTags);
    // 最優先図書館（checkLibraryOrderNum===0）の場合は図書館チェクフラグ消す
    bookParams.newBookCheckFlg = library.checkLibraryOrderNum === 0 ? 0 : 1;

    await models.updateToreadBook(book.documentId, bookParams, fs);

    // discordメッセージ送信
    const msg = `- ${library.city}図書館 / ${book.authorName}『${book.bookName}』
 - [予約URLを開く](${searchResult.reserveUrl})
 - [bookutilで開く](${CLIENT_URL}/toread?filterCondWord=${book.isbn})`;
    await discordUtil.sendCheckLibrary(msg);
  }
  return {};
};

// 電子図書館情報
const checkDLibrary = async (fs: firestoreUtil.FirestoreTransaction) => {
  const dLibrary: models.DLibrary = await models.fetchDLibrary(fs);
  // 新着情報を取得
  const response = await axios.get(dLibrary.checkUrl);
  const cheerioData = cheerio.load(response.data);
  const titles: string[] = [];
  cheerioData(".book_info .booktitle").each((i, el) => {
    const title = cheerioData(el).text();
    titles.push(title);
  });

  // ハッシュ化して前回のものと異なるか確認
  const joinedTitles = titles.join("").trim();
  const tmpHash = crypto
    .createHash("sha256")
    .update(joinedTitles + SALT)
    .digest("hex");
  if (tmpHash !== dLibrary.beforeHash) {
    // 異なる場合通知送信
    const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
    const msg = `【${yyyyMMdd}】${dLibrary.name}に新着資料があるかもしれません
[新着資料画面を開く](${dLibrary.openUrl})`;
    await discordUtil.sendCheckLibrary(msg);
  }

  // 今回の情報で更新
  const updateParams = {
    before_hash: tmpHash,
    update_at: Timestamp.fromDate(new Date()),
    update_user: "job/checkDLibrary.ts",
  };
  await fs.updateDocument(
    firestoreUtil.COLLECTION_PATH.M_D_LIBRARY,
    dLibrary.documentId,
    updateParams
  );
  return {};
};

const searchCheckNewBookLibraries = async (
  fs: firestoreUtil.FirestoreTransaction
) => {
  return (await models.fetchLibraries(fs)).filter((library) => {
    return library.newBookCheckFlg; //図書館チェックフラグ立っている図書館のみ
  });
};
const searchCheckNewBookToreadBooks = async (
  fs: firestoreUtil.FirestoreTransaction
) => {
  return (await models.fetchToreadBooks(true, fs)).filter((book) => {
    return book.newBookCheckFlg && book.isbn && util.isIsbn(book.isbn); // 図書館チェックフラグたち、isbnがあるもののみ
  });
};

// Define main script
const main = async () => {
  systemLogger.info("checkLibrary start");
  await firestoreUtil.tran([checkLibrary, checkDLibrary]);
  systemLogger.info("checkLibrary end");
};

// Start script
main().catch((err) => {
  systemLogger.error(err);
  process.exit(1);
});
