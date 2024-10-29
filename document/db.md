# m_library: 図書館マスタ

| 物理名                  | 論理名           | 型        | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                         |
| ----------------------- | ---------------- | --------- | ---- | ---- | --- | -------- | ---------------------------- |
| id                      | 図書館ID         | string    | Y    | Y    | Y   |          | calilの図書館IDと同じにする  |
| city                    | 市区町村         | string    | Y    |      |     |          | 「〇〇区」など市区町村まで   |
| name                    | 図書館名         | string    | Y    |      |     |          |                              |
| closest_station         | 最寄り駅         | string    |      |      |     |          |                              |
| url                     | サイトURL        | string    | Y    |      |     |          |                              |
| sp_url                  | スマホサイトURL  | string    |      |      |     |          |                              |
| map_url                 | GoogleマップURL  | string    | Y    |      |     |          |                              |
| calendar_url            | カレンダーURL    | string    | Y    |      |     |          |                              |
| barcode_url             | 貸出ﾊﾞｰｺｰﾄﾞURL   | string    |      |      |     |          |                              |
| new_book_check_flg      | 新刊確認フラグ   | number    | Y    |      |     | 1        | 1:true 0:false               |
| order_num               | 並び順           | number    | Y    |      | Y   |          |                              |
| check_library_order_num | 図書館確認優先度 | number    | Y    |      | Y   |          | checkLibraryで利用する優先度 |
| create_user             | 作成者           | string    | Y    |      |     | "system" |                              |
| create_at               | 作成日時         | timestamp | Y    |      |     | 現在時刻 |                              |
| update_user             | 更新者           | string    | Y    |      |     | "system" |                              |
| update_at               | 更新日時         | timestamp | Y    |      |     | 現在時刻 |                              |

# m_toread_tag: タグマスタ

| 物理名      | 論理名   | 型        | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考 |
| ----------- | -------- | --------- | ---- | ---- | --- | -------- | ---- |
| tag         | タグ名   | string    | Y    | Y    | Y   |          |      |
| order_num   | 並び順   | number    | Y    |      | Y   |          |      |
| create_user | 作成者   | string    | Y    |      |     | "system" |      |
| create_at   | 作成日時 | timestamp | Y    |      |     | 現在時刻 |      |
| update_user | 更新者   | string    | Y    |      |     | "system" |      |
| update_at   | 更新日時 | timestamp | Y    |      |     | 現在時刻 |      |

# m_publisher: 出版社マスタ

| 物理名         | 論理名         | 型        | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                           |
| -------------- | -------------- | --------- | ---- | ---- | --- | -------- | ------------------------------ |
| code           | 出版社コード   | string    | Y    | Y    | Y   |          | ISBNに含まれている出版社コード |
| name           | 出版社名       | string    | Y    |      |     |          |                                |
| is_on_kadokawa | 角川子会社ﾌﾗｸﾞ | boolean   | Y    |      |     | false    | ブックウォーカータグつけるため |
| create_user    | 作成者         | string    | Y    |      |     | "system" |                                |
| create_at      | 作成日時       | timestamp | Y    |      |     | 現在時刻 |                                |
| update_user    | 更新者         | string    | Y    |      |     | "system" |                                |
| update_at      | 更新日時       | timestamp | Y    |      |     | 現在時刻 |                                |

# m_user: ユーザマスタ

| 物理名   | 論理名   | 型     | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                                        |
| -------- | -------- | ------ | ---- | ---- | --- | -------- | ------------------------------------------- |
| email    | ﾒｰﾙｱﾄﾞﾚｽ | string | Y    | Y    | Y   |          |                                             |
| username | ユーザ名 | string | Y    |      |     |          | GCP Identity Platformで払い出されるユーザ名 |

# t_toread_book: よみたいリストデータ

| 物理名             | 論理名       | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考           |
| ------------------ | ------------ | ------------- | ---- | ---- | --- | -------- | -------------- |
| book_name          | 書籍名       | string        | Y    |      |     |          |                |
| isbn               | ISBN         | string        |      |      | Y   |          | nullの重複は可 |
| author_name        | 著者名       | string        |      |      |     |          |                |
| publisher_name     | 出版社名     | string        |      |      |     |          |                |
| page               | ページ数     | number        |      |      |     |          | 現在未使用     |
| cover_url          | 書影URL      | string        |      |      |     |          |                |
| new_book_check_flg | 新刊確認ﾌﾗｸﾞ | number        | Y    |      |     | 0        | 1:true 0:false |
| tag                | タグ         | array[string] |      |      |     |          |                |
| other_url          | その他URL    | string        |      |      |     |          | 現在未使用     |
| memo               | メモ         | string        |      |      |     |          |                |
| create_user        | 作成者       | string        | Y    |      |     | "system" |                |
| create_at          | 作成日時     | timestamp     | Y    |      |     | 現在時刻 |                |
| update_user        | 更新者       | string        | Y    |      |     | "system" |                |
| update_at          | 更新日時     | timestamp     | Y    |      |     | 現在時刻 |                |

# t_bookshelf_book: 本棚データ

| 物理名         | 論理名   | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考              |
| -------------- | -------- | ------------- | ---- | ---- | --- | -------- | ----------------- |
| book_name      | 書籍名   | string        | Y    |      |     |          |                   |
| isbn           | ISBN     | string        |      |      | Y   |          | nullの重複は可    |
| author_name    | 著者名   | string        |      |      |     |          |                   |
| publisher_name | 出版社名 | string        |      |      |     |          |                   |
| cover_url      | 書影URL  | string        |      |      |     |          |                   |
| tag            | タグ     | array[string] |      |      |     |          |                   |
| read_date      | 読了日   |               |      |      |     |          | YYYY/MM/DD        |
| rate           | 評価     |               | Y    |      |     | 0        | 0は評価なしと判定 |
| contents       | 書籍内容 | array         |      |      |     |          |                   |
| - content_name | - 内容名 |               |      |      |     |          |                   |
| - author_name  | - 著者名 |               |      |      |     |          |                   |
| - rate         | - 評価   |               | Y    |      |     | 0        | 0は評価なしと判定 |
| create_user    | 作成者   | string        | Y    |      |     | "system" |                   |
| create_at      | 作成日時 | timestamp     | Y    |      |     | 現在時刻 |                   |
| update_user    | 更新者   | string        | Y    |      |     | "system" |                   |
| update_at      | 更新日時 | timestamp     | Y    |      |     | 現在時刻 |                   |

# t_new_book: 新刊データ

| 物理名           | 論理名       | 型        | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                            |
| ---------------- | ------------ | --------- | ---- | ---- | --- | -------- | ------------------------------- |
| book_name        | 書籍名       | string    | Y    |      |     |          |                                 |
| isbn             | ISBN         | string    |      |      | Y   |          |                                 |
| author_name      | 著者名       | string    |      |      |     |          |                                 |
| publisher_name   | 出版社名     | string    |      |      |     |          |                                 |
| publish_date     | 出版日       | string    | Y    |      |     |          | YYYY-MM-DD(新刊netのﾃﾞｰﾀの都合) |
| is_create_toread | 追加済みﾌﾗｸﾞ | boolean   | Y    |      |     | false    | toreadかbookshelfに追加したか   |
| create_user      | 作成者       | string    | Y    |      |     | "system" |                                 |
| create_at        | 作成日時     | timestamp | Y    |      |     | 現在時刻 |                                 |
| update_user      | 更新者       | string    | Y    |      |     | "system" |                                 |
| update_at        | 更新日時     | timestamp | Y    |      |     | 現在時刻 |                                 |
