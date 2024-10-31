import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { Timestamp } from "firebase-admin/firestore";
import * as firestoreUtil from "../../modules/firestoreUtil";

const majorPublisherCsv = fs.readFileSync(
  "./src/batch/data/major_publisher.csv",
  "utf8"
);
const majorPublisherData: string[] = parse(majorPublisherCsv);
const minorPublisherCsv = fs.readFileSync(
  "./src/batch/data/minor_publisher.csv",
  "utf8"
);
const minorPublisherData: string[] = parse(minorPublisherCsv);

type PublisherDocument = {
  code: string;
  name: string;
  is_on_kadokawa: boolean;
  create_user: string;
  create_at: Timestamp;
  update_user: string;
  update_at: Timestamp;
};

const user = "batch/createMPublisher.ts";
const now = Timestamp.fromDate(new Date());

const majorPublishers: PublisherDocument[] = majorPublisherData.map((row) => {
  return {
    code: row[0],
    name: row[1],
    is_on_kadokawa: row[2] === "true",
    create_user: user,
    create_at: now,
    update_user: user,
    update_at: now,
  };
});
const minorPublishers: PublisherDocument[] = minorPublisherData.map((row) => {
  return {
    code: row[0],
    name: row[1],
    is_on_kadokawa: row[3] === "1",
    create_user: user,
    create_at: now,
    update_user: user,
    update_at: now,
  };
});

const publisherDocuments: PublisherDocument[] =
  majorPublishers.concat(minorPublishers);

const publisherDocuments1 = publisherDocuments.slice(0, 500);
const publisherDocuments2 = publisherDocuments.slice(500);

console.log(publisherDocuments.length);
console.log(publisherDocuments1.length);
console.log(publisherDocuments2.length);
// publisherのDB登録
firestoreUtil.tran([
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const promises = publisherDocuments1.map((doc) => {
      return fs.createDocument(firestoreUtil.COLLECTION_PATH.M_PUBLISHER, doc);
    });
    return Promise.all(promises);
  },
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const promises = publisherDocuments2.map((doc) => {
      return fs.createDocument(firestoreUtil.COLLECTION_PATH.M_PUBLISHER, doc);
    });
    return Promise.all(promises);
  },
  async (fs: firestoreUtil.FirestoreTransaction) => {
    const publishers = await fs.getCollection(
      firestoreUtil.COLLECTION_PATH.M_PUBLISHER
    );
    console.log("now publisher count:");
    console.log(publishers.length);
    return {};
  },
]);
