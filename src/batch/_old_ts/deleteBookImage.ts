// 指定ドメインの書影URLを持つ本の書影を削除する

import { program } from "commander";
program
  .argument(
    "<domain>",
    "削除対象の書影URLドメイン (例: https://cover.openbd.jp)",
  )
  .parse(process.argv);

const targetDomain: string = program.args[0];

if (!targetDomain) {
  console.error("引数でドメインを指定してください");
  process.exit(1);
}

console.log("start deleteCoverUrl");
console.log(`target domain: ${targetDomain}`);

import * as firestoreUtil from "../../modules/firestoreUtil";

const at = new Date();

firestoreUtil.tran([
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const [toreadDocs, bookshelfDocs] = await Promise.all([
      fs.getCollection(firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK),
      fs.getCollection(firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK),
    ]);

    const toreadTargets = toreadDocs.filter(
      (doc) =>
        typeof doc.cover_url === "string" &&
        doc.cover_url.includes(targetDomain),
    );
    const bookshelfTargets = bookshelfDocs.filter(
      (doc) =>
        typeof doc.cover_url === "string" &&
        doc.cover_url.includes(targetDomain),
    );

    console.log(`よみたい: ${toreadTargets.length}件`);
    console.log(`本棚: ${bookshelfTargets.length}件`);

    const promises: Promise<void>[] = [];

    toreadTargets.forEach((doc) => {
      console.log(`よみたい削除: ${doc.book_name} / ${doc.cover_url}`);
      promises.push(
        fs.updateDocument(
          firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK,
          doc.documentId,
          { cover_url: "", update_user: "batch", update_at: at },
        ),
      );
    });

    bookshelfTargets.forEach((doc) => {
      console.log(`本棚削除: ${doc.book_name} / ${doc.cover_url}`);
      promises.push(
        fs.updateDocument(
          firestoreUtil.COLLECTION_PATH.T_BOOKSHELF_BOOK,
          doc.documentId,
          { cover_url: null, update_user: "batch", update_at: at },
        ),
      );
    });

    await Promise.all(promises);

    console.log("end deleteCoverUrl");
    return {};
  },
]);
