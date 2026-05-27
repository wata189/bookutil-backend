// よみたいリストの「よやくする」タグを「よみたい」タグに置き換える

console.log("start replaceReserveTag");

import * as firestoreUtil from "../../modules/firestoreUtil";

const FROM_TAG = "よやくする";
const TO_TAG = "よみたい";
const at = new Date();

firestoreUtil.tran([
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const toreadDocs = await fs.getCollection(
      firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK,
      "isbn",
      "tags",
      "array-contains",
      FROM_TAG,
    );

    console.log(`対象件数: ${toreadDocs.length}件`);

    const promises: Promise<void>[] = toreadDocs.map((doc) => {
      const tags: string[] = doc.tags;
      const newTags = tags
        .filter((tag) => tag !== FROM_TAG)
        .concat(tags.includes(TO_TAG) ? [] : [TO_TAG]);
      console.log(
        `${doc.book_name}: [${tags.join(", ")}] -> [${newTags.join(", ")}]`,
      );
      return fs.updateDocument(
        firestoreUtil.COLLECTION_PATH.T_TOREAD_BOOK,
        doc.documentId,
        { tags: newTags, update_user: "batch", update_at: at },
      );
    });

    await Promise.all(promises);

    console.log("end replaceReserveTag");
    return {};
  },
]);
