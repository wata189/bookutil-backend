import axiosBase, { AxiosResponse } from "axios";
const DISCORD_URL = process.env.DISCORD_URL || "";

const axios = axiosBase.create({
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json;charset=utf-8"
  }
});

export const send = async (msg:string) => {
  await axios.post(DISCORD_URL, {username: "新刊チェックくん", content: msg});
};