import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  Firestore,
  Transaction,
  QuerySnapshot,
  DocumentData,
  WhereFilterOp,
  FieldValue,
} from "firebase-admin/firestore";

// デフォルトで認証してくれる
// 環境変数 FIRESTORE_EMULATOR_HOST が設定されている場合、Firebase Admin SDK は Cloud Firestore エミュレータに自動的に接続する
const app = initializeApp();
const db: Firestore = getFirestore(app);

export class FirestoreTransaction {
  db: Firestore;
  transaction!: Transaction;

  constructor() {
    this.db = db;
  }

  private getCollectionRef(collectionPath: string) {
    return this.db.collection(collectionPath);
  }
  private getDocumentRef(collectionPath: string, documentId: string) {
    return this.getCollectionRef(collectionPath).doc(documentId);
  }

  async getCollection(
    collectionPath: string,
    orderByField?: string,
    fieldPath?: string,
    opStr?: WhereFilterOp,
    value?: unknown
  ) {
    const ref = this.getCollectionRef(collectionPath);
    let querySnapshot: QuerySnapshot<DocumentData, DocumentData> | null = null;

    if (fieldPath && opStr && value && orderByField) {
      const q = ref.where(fieldPath, opStr, value).orderBy(orderByField);
      querySnapshot = await this.transaction.get(q);
    } else if (orderByField) {
      const q = ref.orderBy(orderByField);
      querySnapshot = await this.transaction.get(q);
    } else {
      querySnapshot = await this.transaction.get(ref);
    }

    const ret: DocumentData[] = querySnapshot.docs.map((doc) => {
      const docData = doc.data();
      docData.documentId = doc.id;
      return docData;
    });
    return ret;
  }
  async getDocument(collectionPath: string, documentId: string) {
    const ref = this.getDocumentRef(collectionPath, documentId);
    const doc = await this.transaction.get(ref);
    const docData = doc.data();
    if (docData) {
      docData.documentId = doc.id;
    }
    return docData;
  }

  async createDocument(collectionPath: string, document: unknown) {
    const ref = this.getCollectionRef(collectionPath).doc();
    this.transaction.create(ref, document);
  }
  async updateDocument(
    collectionPath: string,
    documentId: string,
    document: { [x: string]: FieldValue | Partial<unknown> | undefined | null }
  ) {
    const ref = this.getDocumentRef(collectionPath, documentId);
    this.transaction.update(ref, document);
  }
  async deleteDocument(collectionPath: string, documentId: string) {
    const ref = this.getDocumentRef(collectionPath, documentId);
    this.transaction.delete(ref);
  }
  async addArray(
    collectionPath: string,
    documentId: string,
    field: string,
    values: unknown[]
  ) {
    const document = {
      [field]: FieldValue.arrayUnion(...values),
    };
    this.updateDocument(collectionPath, documentId, document);
  }

  async deleteArray(
    collectionPath: string,
    documentId: string,
    field: string,
    values: unknown[]
  ) {
    const document = {
      [field]: FieldValue.arrayRemove(...values),
    };
    this.updateDocument(collectionPath, documentId, document);
  }
}

export const tran = async (
  funcs: ((fs: FirestoreTransaction) => Promise<object>)[]
) => {
  const fs = new FirestoreTransaction();
  let result: object | void = {};
  for await (const func of funcs) {
    // 配列として渡したfunctionを同期的に実行
    result = await fs.db.runTransaction(async (transaction) => {
      fs.transaction = transaction;
      return await func(fs);
    });
  }
  // funcsに渡した関数群の最後の返り値を返却
  return result;
};

export const COLLECTION_PATH = {
  M_LIBRARY: "/m_library",
  M_TOREAD_TAG: "/m_toread_tag",
  M_USER: "/m_user",
  M_PUBLISHER: "/m_publisher",
  T_TOREAD_BOOK: "/t_toread_book",
  T_NEW_BOOK: "/t_new_book",
  T_BOOKSHELF_BOOK: "/t_bookshelf_book",
};
