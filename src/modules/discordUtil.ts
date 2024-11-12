import axiosBase from "axios";
import { systemLogger } from "./logUtil";
import * as util from "./util";
const DISCORD_URL_CHECK_LIBRARY = process.env.DISCORD_URL_CHECK_LIBRARY || "";
const DISCORD_URL_NEW_BOOK_DISCOVER =
  process.env.DISCORD_URL_NEW_BOOK_DISCOVER || "";
const DISCORD_URL_ALERT = process.env.DISCORD_URL_ALERT || "";
const DISCORD_URL_SEARCH_AMAZON = process.env.DISCORD_URL_SEARCH_AMAZON || "";

const axios = axiosBase.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json;charset=utf-8",
  },
});

const WAIT_SEC = 10;
const send = async (url: string, username: string, msg: string) => {
  systemLogger.info(`discord sendMsg: ${msg}`);
  await axios.post(url, { username, content: msg });
  await util.wait(WAIT_SEC);
};

export const sendCheckLibrary = async (msg: string) => {
  await send(DISCORD_URL_CHECK_LIBRARY, "図書館チェックくん", msg);
};

export const sendNewBookDiscover = async (msg: string) => {
  await send(DISCORD_URL_NEW_BOOK_DISCOVER, "新刊発見くん", msg);
};

export const sendSearchAmazon = async (msg: string) => {
  await send(DISCORD_URL_SEARCH_AMAZON, "Amazon検索くん", msg);
};

export const sendAlert = async (msg: string) => {
  await send(DISCORD_URL_ALERT, "Bookutilお知らせくん", msg);
};
