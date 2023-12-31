import { systemLogger } from "./logUtil";
import {ToreadBook} from "./models";
import axiosBase, { AxiosResponse } from "axios";

const CALIL_URL = process.env.CALIL_URL || "";
const CALIL_APP_KEY = process.env.CALIL_APP_KEY || "";

const axios = axiosBase.create({
  baseURL: CALIL_URL,
  headers: {'Content-Type': 'application/json;charset=utf-8'},
  responseType: "json"
});

type CheckParams = {
  appkey: string,
  format: string,
  callback: string,
  isbn?: string,
  systemid?: string,
  session?: string

}
export const checkCalil = async (book:ToreadBook, libraryId:string) => {
  const result = {
    isExist: false,
    reserveUrl: ""
  };
  // カーリルでチェック
  try{
    //1回目の検索
    const isbn = book.isbn || ""
    let params:CheckParams | null = {
      appkey: CALIL_APP_KEY,
      isbn,
      systemid: libraryId,
      format: "json",
      callback: "no"
    };
    while(params){
      const res:AxiosResponse<any, any> = await axios.get("/check",{params});
      const data = res.data;

      //continueの場合はセッション情報使ってもう一度処理する
      if(data.continue){
        params = {
          appkey: CALIL_APP_KEY,
          session: data.session,
          format: "json",
          callback: "no"
        }
      }else{
        //呼び出しが終了したら結果を格納
        const calilBook = data.books[isbn][libraryId];
        if(calilBook.libkey && Object.keys(calilBook.libkey).length > 0){
          result.isExist = true;
          result.reserveUrl = calilBook.reserveurl;
        }

        // paramsを空にしてループ終了
        params = null;
      }
    }
  }catch(e){
    systemLogger.warn(e);
  }finally{
    return result;
  }
};