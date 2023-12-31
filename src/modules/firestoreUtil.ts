import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore, runTransaction, Transaction, doc, query, orderBy, collection, QueryFieldFilterConstraint, getDoc, getDocs, QuerySnapshot, DocumentData, where, WhereFilterOp, arrayUnion } from 'firebase/firestore/lite';
import * as util from "./util";


export class FirestoreTransaction{
  db: Firestore;
  transaction!: Transaction;

  constructor(){
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      appId: process.env.FIREBASE_APP_ID,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
    };
    const app = initializeApp(firebaseConfig);
    const db:Firestore = getFirestore(app);

    const host = (db.toJSON() as { settings?: { host?: string } }).settings?.host ?? '';

    // 開発環境の場合はローカル接続
    const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";
    if(util.isEnv() && !host.startsWith(firestoreEmulatorHost)){
      const firestoreEmulatorPort = process.env.FIRESTORE_EMULATOR_PORT || "9000";
      connectFirestoreEmulator(db, firestoreEmulatorHost, Number(firestoreEmulatorPort));
    }

    this.db = db;
  }

  private getCollectionRef(collectionPath:string){
    return collection(this.db, collectionPath);
  }
  private getDocumentRef(collectionPath:string, documentId:string){
    return doc(this.db, collectionPath, documentId);
  }

  async getCollection(collectionPath: string,  orderByField?: string, where?: QueryFieldFilterConstraint){
    const ref = this.getCollectionRef(collectionPath);
    let querySnapshot:QuerySnapshot<DocumentData, DocumentData>|null = null;
    if(where && orderByField){
      const q = query(ref, where, orderBy(orderByField));
      querySnapshot = await getDocs(q);
    }else if(orderByField){
      const q = query(ref, orderBy(orderByField));
      querySnapshot = await getDocs(q);
    }else{
      querySnapshot = await getDocs(ref);
    }

    const ret:DocumentData[] = querySnapshot.docs.map((doc) => {
      const docData = doc.data();
      docData.documentId = doc.id;
      return docData;
    });
    return ret;
  }
  async getDocument(collectionPath:string, documentId:string){
    const ref = this.getDocumentRef(collectionPath, documentId);
    const doc = await getDoc(ref);
    const docData = doc.data();
    if(docData){
      docData.documentId = doc.id;
    }
    return docData
  }

  async createDocument(collectionPath:string, document: unknown){
    const ref = doc(this.getCollectionRef(collectionPath))
    this.transaction.set(ref, document)
  }
  async updateDocument(collectionPath:string, documentId:string, document:{ [x: string]: any; }){
    const ref = this.getDocumentRef(collectionPath, documentId)
    this.transaction.update(ref, document);
  }
  async deleteDocument(collectionPath:string, documentId:string){
    const ref = this.getDocumentRef(collectionPath, documentId);
    this.transaction.delete(ref);
  }
  async addArray(collectionPath:string, documentId:string, field:string, values:unknown[]){
    const document = {
      [field]: arrayUnion(...values)
    };
    this.updateDocument(collectionPath, documentId, document)
  }
}

export const createWhere = (fieldPath:string, opStr:WhereFilterOp, value: unknown) => {
  return where(fieldPath, opStr, value)
};

export const tran = async (funcs:Function[]) => {
  const fs = new FirestoreTransaction();
  let result = {};
  for await(const func of funcs){
    // 配列として渡したfunctionを同期的に実行
    result = await runTransaction(fs.db, async (transaction) => {
      fs.transaction = transaction;
      return await func(fs)
    });
  }
  // funcsに渡した関数群の最後の返り値を返却
  return result;
};

export const COLLECTION_PATH = {
  M_LIBRARY: "/m_library",
  M_TOREAD_TAG: "/m_toread_tag",
  M_USER: "/m_user",
  T_TOREAD_BOOK: "/t_toread_book"
};
