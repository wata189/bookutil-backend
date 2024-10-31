import * as fs from "fs";
import { parse } from "csv-parse/sync";

const data = fs.readFileSync("./src/batch/data/m_publisher_raw.csv", "utf8");
const records = parse(data);

type Publisher = {
  publisherCode: string;
  children: { name: string; count: number }[];
  isOnKadokawa: boolean;
};
const publishers: Publisher[] = [];
for (const record of records) {
  const samePublisher = publishers.find((p) => p.publisherCode === record[0]);
  if (samePublisher) {
    samePublisher.children.push({ name: record[1], count: Number(record[2]) });
  } else {
    publishers.push({
      publisherCode: record[0],
      children: [{ name: record[1], count: Number(record[2]) }],
      isOnKadokawa: false,
    });
  }
}

const majorPublishers = publishers
  .filter((p) => {
    return (
      p.children.map((c) => c.count).reduce((prev, next) => prev + next, 0) >=
      100
    );
  })
  .sort((a, b) => {
    return (
      b.children.map((c) => c.count).reduce((prev, next) => prev + next, 0) -
      a.children.map((c) => c.count).reduce((prev, next) => prev + next, 0)
    );
  });

console.log(majorPublishers.length);

for (const publisher of majorPublishers) {
  // 空文字消す
  publisher.children = publisher.children
    .filter((c) => c.name)
    .filter((c) => c.name !== "NetLibrary") // 謎の名前も消す
    .sort((a, b) => b.count - a.count); // ソートしておく

  // 角川フラグ立てる
  const names = publisher.children.map((c) => c.name).join("/");
  if (
    names.includes("角川") ||
    names.includes("KADOKAWA") ||
    names.includes("ＫＡＤＯＫＡＷＡ")
  ) {
    publisher.isOnKadokawa = true;
  }

  // 角川という名前の出版社自体は消しておく
  if (publisher.isOnKadokawa) {
    publisher.children = publisher.children.filter((c) => {
      return !["KADOKAWA", "ＫＡＤＯＫＡＷＡ", "角川書店"].includes(c.name);
    });
  }

  // 3つぐらいに絞っておく
  publisher.children = publisher.children.slice(
    0,
    Math.max(3, publisher.children.length)
  );
}

// csvにして出力
const soloCsvData = [["code", "name", "count", "isOnKadokawa"]];
const multiCsvData = [["code", "name", "count", "isOnKadokawa"]];
for (const publisher of majorPublishers) {
  if (publisher.children.length > 1) {
    for (const child of publisher.children) {
      multiCsvData.push([
        publisher.publisherCode,
        child.name.trim(),
        child.count.toString(),
        publisher.isOnKadokawa ? "1" : "0",
      ]);
    }
  } else if (publisher.children.length === 1) {
    soloCsvData.push([
      publisher.publisherCode,
      publisher.children[0].name.trim(),
      publisher.children[0].count.toString(),
      publisher.isOnKadokawa ? "1" : "0",
    ]);
  }
}
const soloCsvContent = soloCsvData.map((row) => row.join(",")).join("\n");
const multiCsvContent = multiCsvData.map((row) => row.join(",")).join("\n");

fs.writeFile(
  "./src/batch/data/m_publisher_filtered_solo.csv",
  soloCsvContent,
  (error) => {
    if (error) {
      console.error("CSVファイルの作成中にエラーが発生しました:", error);
    } else {
      console.log("CSVファイルが作成されました。");
    }
  }
);

fs.writeFile(
  "./src/batch/data/m_publisher_filtered_multi.csv",
  multiCsvContent,
  (error) => {
    if (error) {
      console.error("CSVファイルの作成中にエラーが発生しました:", error);
    } else {
      console.log("CSVファイルが作成されました。");
    }
  }
);
