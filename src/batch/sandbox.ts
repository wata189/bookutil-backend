import * as models from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";

console.log("start sandbox.ts");

const isbns = [
  "4326101202",// 足立区のはず
  "4535558965",// 荒川区のはず
  "4829163054", // 国会図書館のはず
  "4253282571", // nullのはず
];



firestoreUtil.tran([ async (fs:firestoreUtil.FirestoreTransaction) => {
  for(const isbn of isbns){
    const tag = await models.findLibraryTag(isbn, fs);
    console.log(tag);
  }
}]);




console.log("end sandbox.ts");