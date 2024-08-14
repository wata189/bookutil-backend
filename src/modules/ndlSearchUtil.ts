import axiosBase from "axios";
import * as util from "./util";

const NDL_SEARCH_URL = process.env.VITE_NDL_SEARCH_URL;

const axios = axiosBase.create({
  baseURL: NDL_SEARCH_URL + "/api",
});

export type NdlBook = {
  ndlId: string | null;
  bookName: string | null;
  isbn: string | null;
  authorName: string | null;
  publisherName: string | null;
  coverUrl: string | null;
};

type DcIdentifire = {
  _text: string;
  _attributes: { "xsi:type": string };
};
type DcCreator = {
  _text: string;
};
type NdlItem = {
  guid: { _text: string };
  title: { _text: string };
  "dc:identifier": DcIdentifire | DcIdentifire[] | null;
  "dc:creator": DcCreator | DcCreator[];
  "dc:publisher": { _text: string } | null;
};
type NdlResponse = {
  rss: {
    channel: {
      item: NdlItem[] | NdlItem;
    };
  };
};

export const getNdlBook = async (isbn: string): Promise<NdlBook | null> => {
  let book: NdlBook | null = null;

  const path = `/opensearch?isbn=${isbn}`;
  console.log(`getNdlBooks:${path}`);

  try {
    const response = await axios.get(path);
    if (response && response.data) {
      const responseJson = util.xml2json(response.data) as NdlResponse;
      const searchResult = responseJson.rss.channel.item;

      const ndlItem = Array.isArray(searchResult)
        ? searchResult[0]
        : searchResult;
      book = ndlItem2NdlBook(ndlItem);
    }
  } catch (error) {
    console.error(error);
  }
  return book;
};

export const searchNdlBooks = async (searchWord: string) => {
  let ndlBooks: NdlBook[] = [];
  // eslint-disable-next-line no-irregular-whitespace
  const formatted = searchWord.replace(/　/g, " "); // 全角スペースあるとエラー出るので半角にする
  const path = `/opensearch?any=${formatted}&cnt=50`;
  console.log(`getNdlBooks:${path}`);
  try {
    const response = await axios.get(path);
    if (response && response.data) {
      ndlBooks = xml2NdlBooks(response.data);
    }
  } catch (error) {
    console.error(error);
  }
  return ndlBooks;
};

const xml2NdlBooks = (xml: string): NdlBook[] => {
  const ndlBooks: NdlBook[] = [];
  const responseJson = util.xml2json(xml) as NdlResponse;
  const ndlItems = responseJson.rss.channel.item;
  if (Array.isArray(ndlItems)) {
    for (const ndlItem of ndlItems) {
      const ndlBook = ndlItem2NdlBook(ndlItem);
      if (ndlBook) {
        ndlBooks.push(ndlBook);
      }
    }
  } else {
    const ndlBook = ndlItem2NdlBook(ndlItems);
    if (ndlBook) {
      ndlBooks.push(ndlBook);
    }
  }
  return ndlBooks;
};
const ndlItem2NdlBook = (ndlItem: NdlItem): NdlBook | null => {
  let ndlBook = null;
  // レスポンスから書誌IDを取得
  try {
    const ndlUrl = ndlItem.guid ? ndlItem.guid._text : "";

    const ndlId: string | null = ndlUrl.split("/").pop() || null;
    const bookName: string = ndlItem.title ? ndlItem.title._text : "";
    let authorName = null;
    // 配列の場合がある
    const dcCreators = ndlItem["dc:creator"];
    if (dcCreators) {
      if (Array.isArray(dcCreators)) {
        authorName = dcCreators
          .map((dcCreator) => {
            return dcCreator._text.replaceAll(",", "").replaceAll(" ", "");
          })
          .join(", ");
      } else {
        authorName = dcCreators._text.replaceAll(",", "").replaceAll(" ", "");
      }
    }

    // NDLから取得した著者名には年号が入ってるので消す
    if (authorName) {
      authorName = authorName.replace(/[0-9-]/g, "");
    }

    const publisherName = ndlItem["dc:publisher"]
      ? ndlItem["dc:publisher"]._text
      : null;

    let isbn = null;

    const identifiers = ndlItem["dc:identifier"];

    if (identifiers) {
      if (Array.isArray(identifiers)) {
        for (const identifier of identifiers) {
          if (
            identifier._attributes["xsi:type"] === "dcndl:ISBN" ||
            identifier._attributes["xsi:type"] === "dcndl:ISBN13"
          ) {
            isbn = identifier._text.replaceAll("-", "");
            break;
          }
        }
      } else {
        if (
          identifiers._attributes["xsi:type"] === "dcndl:ISBN" ||
          identifiers._attributes["xsi:type"] === "dcndl:ISBN13"
        ) {
          isbn = identifiers._text.replaceAll("-", "");
        }
      }
    }

    let coverUrl = null;
    if (isbn) {
      coverUrl = getCoverUrl(isbn);
    }
    ndlBook = { isbn, ndlId, bookName, authorName, publisherName, coverUrl };
  } catch (error) {
    console.error(error);
  }
  return ndlBook;
};

export const getCoverUrl = (isbn: string) => {
  if (!util.isIsbn(isbn)) return null;

  const isbn13 = isbn.length === 13 ? isbn : util.isbn10To13(isbn);

  return `${NDL_SEARCH_URL}/thumbnail/${isbn13}.jpg`;
};

type Content = {
  authorName: string | null;
  contentName: string;
  rate: number;
};

type PartInformation = {
  "rdf:Description": {
    "dcterms:title": { _text: string };
    "dc:creator": { _text: string };
  };
};
type OaipmhData = {
  "OAI-PMH": {
    GetRecord: {
      record: {
        metadata: {
          "rdf:RDF": {
            "dcndl:BibResource": [
              {
                "dcndl:partInformation": PartInformation[];
              },
            ];
          };
        };
      };
    };
  };
};
export const searchNdlShortStorys = async (
  isbn: string
): Promise<Content[]> => {
  let shortStorys: Content[] = [];

  try {
    const ndlBook = await getNdlBook(isbn);

    if (ndlBook && ndlBook.ndlId) {
      const path = `/oaipmh?verb=GetRecord&metadataPrefix=dcndl&identifier=oai:ndlsearch.ndl.go.jp:${ndlBook.ndlId}`;
      console.log(`searchShortStorys:${path}`);
      const response = await axios.get(path);
      if (response && response.data) {
        const searchResult = util.xml2json(response.data) as OaipmhData;

        // レスポンスから短編小説名を取得
        const partInformations =
          searchResult["OAI-PMH"].GetRecord.record.metadata["rdf:RDF"][
            "dcndl:BibResource"
          ][0]["dcndl:partInformation"];
        if (partInformations && partInformations.length > 0) {
          shortStorys = partInformations.map((partInformation) => {
            const title: string =
              partInformation["rdf:Description"]["dcterms:title"]._text;
            const creatorObject =
              partInformation["rdf:Description"]["dc:creator"];
            let author: string | null = null;
            if (creatorObject && creatorObject._text) {
              const creator: string = creatorObject._text;
              // 著って入ってる→アンソロジー
              if (creator.includes(" 著")) {
                author = creator.split(" 著")[0];
              } else if (creator.includes(" 訳")) {
                // 訳って入ってて著って入ってない→海外著者の短編集 authorは空でよい
              } else {
                author = creator;
              }
            }

            return {
              // トリム、全角数字→半角数字の整形
              authorName: author ? util.fullStr2Half(author).trim() : null,
              contentName: title,
              rate: 0, // rateはデフォルトで0
            };
          });
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
  return shortStorys;
};
