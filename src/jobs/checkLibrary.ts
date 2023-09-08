import { systemLogger } from "../modules/logUtil";
import * as firestoreUtil from "../modules/firestoreUtil";
import * as util from "../modules/util";
import * as models from "../modules/models";
import { checkCalil } from "../modules/calilUtil";
import * as discordUtil from "../modules/discordUtil";
const CLIENT_URL = process.env.CLIENT_URL;

// Define main script
const main = async () => {
  systemLogger.debug("checkLibrary start");
  const data = await firestoreUtil.tran([checkLibrary])
  systemLogger.debug("checkLibrary end");
};

// Start script
main().catch(err => {
  systemLogger.error(err);
  process.exit(1);
});




const checkLibrary = async (fs:firestoreUtil.FirestoreTransaction) => {
  // newBookCheckFlg立ってる図書館を取得
  const libraries = await searchCheckNewBookLibraries(fs);
  // newBookCheckFlg立っている本を取得
  const toreadBooks = await searchCheckNewBookToreadBooks(fs);
  // 図書館×本で検索 break・continueを使う関係でfor awaitで同期処理
  const searchResults = [];
  for await (const book of toreadBooks){
    for(const library of libraries){
      // 検索対象or検索対象より優先度の高い図書館のタグ入っていたら飛ばす
      const cityTags = libraries.filter(tmpLib => tmpLib.orderNum <= library.orderNum)
      .map(tmpLib => tmpLib.city + "図書館");
      const isSearched = cityTags.filter(tag => book.tags.includes(tag)).length > 0;
      if(isSearched)continue;

      // カーリル処理
      const calilResult = await checkCalil(book, library.id);

      // カーリルの結果あった場合のみ更新処理
      if(!calilResult.isExist)continue;

      searchResults.push({
        book,
        library,
        reserveUrl: calilResult.reserveUrl
      });

      //それ以下の図書館は検索しなくてよいのでbreak
      break

    }
  }
  // 検索結果あったら処理続行
  if(searchResults.length <= 0)return;

  // 通知自体のメッセージ
  const yyyyMMdd = util.formatDateToStr(new Date(), "yyyy/MM/dd");
  await discordUtil.sendCheckLibrary(`【${yyyyMMdd}】図書館で本が見つかったよ！`);

  // promiseallで非同期的にDB更新とメッセージ処理
  const promises = [];
  for (const searchResult of searchResults){
    const library = searchResult.library;
    const book = searchResult.book;
    // タグ更新
    // 図書館未定タグと図書館タグすべてけす
    // 「図書館」という文字列が入るタグを削除すればよい
    let updateTags = book.tags.filter(tag => !tag.includes("図書館"));
    // 今の図書館タグ追加する
    updateTags.push(library.city + "図書館");
    updateTags.push("よみたい");

    //DB更新
    const bookParams:models.BookParams = {
      ...book,
      user: "check library",//更新ユーザーは独自のものにする
      accessToken: "",
      isExternalCooperation: false
    };
    // 更新タグは重複消す
    bookParams.tags = util.removeDuplicateElements(updateTags); 
    // 最優先図書館（orderNum===0）の場合は図書館チェクフラグ消す
    bookParams.newBookCheckFlg = library.orderNum === 0 ? 0 : 1;
    // 他URLが入っている場合はそれを尊重　空の場合は予約URLを設定する
    bookParams.otherUrl = book.otherUrl ? book.otherUrl : searchResult.reserveUrl;

    promises.push(models.updateToreadBook(book.documentId, bookParams, fs));

    // discordメッセージ送信
    const msg = `- ${library.city}図書館 / ${book.authorName}『${book.bookName}』
 - [予約URLを開く](${searchResult.reserveUrl})
 - [bookutilで開く](${CLIENT_URL}/toread?filterCondWord=${book.isbn})`;
    promises.push(discordUtil.sendCheckLibrary(msg));
  }
  const results = (await Promise.all(promises));
};

const searchCheckNewBookLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  return (await models.fetchLibraries(fs)).filter(library => {
    return library.newBookCheckFlg; //図書館チェックフラグ立っている図書館のみ
  })
};
const searchCheckNewBookToreadBooks = async (fs:firestoreUtil.FirestoreTransaction) => {
  return (await models.fetchToreadBooks(true, fs)).filter(book => {
    return book.newBookCheckFlg && book.isbn && util.isIsbn(book.isbn); // 図書館チェックフラグたち、isbnがあるもののみ
  });
}
