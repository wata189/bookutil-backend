
import * as firestoreUtil from "../modules/firestoreUtil";
import mToreadTag from './dbdata/bookutil.m_toread_tag.json';

console.log("start insertMToreadTag")

const at = (new Date());
const documents = mToreadTag.map((row:any) => {
  return {
    tag:row.tag,
    order_num:row.order_num,
    create_user:"batch",
    update_user:"batch",
    create_at: at,
    update_at: at,
  }
});
firestoreUtil.tran([ async (fs:firestoreUtil.FirestoreTransaction) => {
  for await (const doc of documents){
    await fs.createDocument(firestoreUtil.COLLECTION_PATH.M_TOREAD_TAG, doc)
  }
}]);

console.log("end insertMToreadTag")