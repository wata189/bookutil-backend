import axiosBase, { AxiosResponse } from "axios";
const DISCORD_URL_CHECK_LIBRARY = process.env.DISCORD_URL_CHECK_LIBRARY || "";
const DISCORD_URL_NEW_BOOK_DISCOVER = process.env.DISCORD_URL_NEW_BOOK_DISCOVER || "";

const axios = axiosBase.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json;charset=utf-8"
  }
});

const send = async (url:string, username:string, msg:string) => {
  return await axios.post(url, {username, content:msg})
};

export const sendCheckLibrary = async (msg:string) => {
  await send(DISCORD_URL_CHECK_LIBRARY, "図書館チェックくん", msg);
};

export const sendNewBookDiscover = async (msg:string) => {
  await send(DISCORD_URL_NEW_BOOK_DISCOVER, "新刊発見くん", msg);
};