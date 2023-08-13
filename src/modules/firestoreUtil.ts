import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore, runTransaction, Transaction, doc, query, orderBy, collection, QueryCompositeFilterConstraint, getDocs, QuerySnapshot, DocumentData, FirestoreDataConverter } from 'firebase/firestore/lite';
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

  getCollectionRef(collectionPath:string){
    return collection(this.db, collectionPath);
  }
  getDocumentRef(collectionPath:string, documentId:string){
    return doc(this.db, collectionPath, documentId);
  }

  async getCollection(collectionPath: string,  orderByField?: string, where?: QueryCompositeFilterConstraint){
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

    const ret:DocumentData[] = querySnapshot.docs.map((doc) => doc.data());
    return ret;
  }

  //TODO:ほかのメソッド
}

export const tran = async (funcs:Function[]) => {
  const fs = new FirestoreTransaction();
  let result = {};
  for(const func of funcs){
    // 配列として渡したfunctionを同期的に実行
    // for awaitとかだと並列で実行してしまうので、「DBを更新してから再度読み取る」みたいな処理を実行できない
    result = await runTransaction(fs.db, async (transaction) => {
      fs.transaction = transaction;
      return await func(fs)
    });
  }
  // funcsに渡した関数群の最後の返り値を返却
  return result;
};