import axiosBase from "axios";
import * as util from "./util";

const OPEN_BD_COVER_URL: string = process.env.VITE_OPEN_BD_COVER_URL || "";

const axios = axiosBase.create({
  baseURL: process.env.VITE_OPEN_BD_URL,
});

type OpenBdBook = {
  bookName: string;
  isbn: string;
  authorName: string;
  publisherName: string;
  coverUrl: string | null;
  publishedMonth: string | null;
};
type Contributor = {
  ContributorRole: string[];
};
type PublishingDate = {
  PublishingDateRole: string;
  Date: string;
};
const getBookInfo = async (isbn: string): Promise<OpenBdBook | null> => {
  let book: OpenBdBook | null = null;
  try {
    const path = `/get?isbn=${isbn}`;
    console.log(`getBookInfo:${path}`);

    const response = await axios.get(path);
    if (response && response.data && response.data[0]) {
      const onix = response.data[0].onix;
      const descriptiveDetail = onix.DescriptiveDetail;
      // 書名、PartNumber、サブタイトル、レーベルをbookNameに
      let bookName =
        descriptiveDetail.TitleDetail.TitleElement.TitleText.content;
      if (descriptiveDetail.TitleDetail.TitleElement.PartNumber) {
        bookName += ` ${descriptiveDetail.TitleDetail.TitleElement.PartNumber}`;
      }
      if (descriptiveDetail.TitleDetail.TitleElement.Subtitle) {
        bookName += ` ${descriptiveDetail.TitleDetail.TitleElement.Subtitle.content}`;
      }
      if (
        descriptiveDetail.Collection &&
        descriptiveDetail.Collection.TitleDetail &&
        descriptiveDetail.Collection.TitleDetail.TitleElement[0]
      ) {
        bookName += ` ${descriptiveDetail.Collection.TitleDetail.TitleElement[0].TitleText.content}`;
      }

      const author = descriptiveDetail.Contributor.find(
        (contributor: Contributor) => contributor.ContributorRole[0] === "A01"
      );
      const authorName = author.PersonName.content;
      const publisherName = onix.PublishingDetail.Imprint.ImprintName;

      let publishedMonth = null;
      const publishingDates: PublishingDate[] =
        onix.PublishingDetail.PublishingDate;
      const publishingDate = publishingDates.find(
        (d) => d.PublishingDateRole === "01"
      );
      if (publishingDate) {
        // YYYYMMDDをYYYY/MMに変換
        publishedMonth =
          publishingDate.Date.slice(0, 4) +
          "/" +
          publishingDate.Date.slice(4, 6);
      }
      const summary = response.data[0].summary;
      const coverUrl = summary.cover || null;
      book = {
        isbn,
        bookName,
        authorName,
        publisherName,
        coverUrl,
        publishedMonth,
      };
    }

    console.log(book);
    return book;
  } catch (error) {
    console.log(error);
    return book;
  }
};

const getCoverUrl = (isbn: string) => {
  if (!util.isIsbn(isbn)) return null;

  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  return `${OPEN_BD_COVER_URL}/${isbn13}.jpg`;
};

export default {
  getBookInfo,
  getCoverUrl,
};
