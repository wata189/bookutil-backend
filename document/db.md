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
| note                    | メモ             | string    |      |      |     |          |                              |
| check_library_order_num | 図書館確認優先度 | number    | Y    |      | Y   |          | checkLibraryで利用する優先度 |
| create_user             | 作成者           | string    | Y    |      |     | "system" |                              |
| create_at               | 作成日時         | timestamp | Y    |      |     | 現在時刻 |                              |
| update_user             | 更新者           | string    | Y    |      |     | "system" |                              |
| update_at               | 更新日時         | timestamp | Y    |      |     | 現在時刻 |                              |

# m_mangaapp: マンガアプリマスタ

| 物理名      | 論理名   | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                                         |
| ----------- | -------- | ------------- | ---- | ---- | --- | -------- | -------------------------------------------- |
| category    | カテゴリ | string        | Y    |      | Y   |          |                                              |
| order_num   | 並び順   | number        | Y    |      | Y   |          |                                              |
| apps        | アプリ   | array         | Y    |      |     |          |                                              |
| - name      | アプリ名 | string        | Y    |      |     |          |                                              |
| - url       | URL      | array[string] | Y    |      |     |          | URLは検索箇所を置換しやすいようにarrayにする |
| - order_num | 並び順   | number        | Y    |      | Y   |          |                                              |
| create_user | 作成者   | string        | Y    |      |     | "system" |                                              |
| create_at   | 作成日時 | timestamp     | Y    |      |     | 現在時刻 |                                              |
| update_user | 更新者   | string        | Y    |      |     | "system" |                                              |
| update_at   | 更新日時 | timestamp     | Y    |      |     | 現在時刻 |                                              |

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
| publish_month      | 出版年月     | string        |      |      |     |          | YYYY/MM        |
| cover_url          | 書影URL      | string        |      |      |     |          |                |
| tags               | タグ         | array[string] |      |      |     |          |                |
| memo               | メモ         | string        |      |      |     |          |                |
| new_book_check_flg | 新刊確認ﾌﾗｸﾞ | number        | Y    |      |     | 0        | 1:true 0:false |
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
| publish_month  | 出版年月 | string        |      |      |     |          | YYYY/MM           |
| cover_url      | 書影URL  | string        |      |      |     |          |                   |
| tags           | タグ     | array[string] |      |      |     |          |                   |
| contents       | 書籍内容 | array         |      |      |     |          |                   |
| - content_name | - 内容名 | string        |      |      |     |          |                   |
| - author_name  | - 著者名 | string        |      |      |     |          |                   |
| - rate         | - 評価   | number        | Y    |      |     | 0        | 0は評価なしと判定 |
| memo           | メモ     | string        |      |      |     |          |                   |
| read_date      | 読了日   | string        |      |      |     |          | YYYY/MM/DD        |
| rate           | 評価     | number        | Y    |      |     | 0        | 0は評価なしと判定 |
| create_user    | 作成者   | string        | Y    |      |     | "system" |                   |
| create_at      | 作成日時 | timestamp     | Y    |      |     | 現在時刻 |                   |
| update_user    | 更新者   | string        | Y    |      |     | "system" |                   |
| update_at      | 更新日時 | timestamp     | Y    |      |     | 現在時刻 |                   |

# t_reading_book: 読書中データ

| 物理名         | 論理名   | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考              |
| -------------- | -------- | ------------- | ---- | ---- | --- | -------- | ----------------- |
| book_name      | 書籍名   | string        | Y    |      |     |          |                   |
| isbn           | ISBN     | string        |      |      | Y   |          | nullの重複は可    |
| author_name    | 著者名   | string        |      |      |     |          |                   |
| publisher_name | 出版社名 | string        |      |      |     |          |                   |
| publish_month  | 出版年月 | string        |      |      |     |          | YYYY/MM           |
| cover_url      | 書影URL  | string        |      |      |     |          |                   |
| tags           | タグ     | array[string] |      |      |     |          |                   |
| contents       | 書籍内容 | array         |      |      |     |          |                   |
| - content_name | - 内容名 | string        |      |      |     |          |                   |
| - author_name  | - 著者名 | string        |      |      |     |          |                   |
| - rate         | - 評価   | number        | Y    |      |     | 0        | 0は評価なしと判定 |
| memo           | メモ     | string        |      |      |     |          |                   |
| create_user    | 作成者   | string        | Y    |      |     | "system" |                   |
| create_at      | 作成日時 | timestamp     | Y    |      |     | 現在時刻 |                   |
| update_user    | 更新者   | string        | Y    |      |     | "system" |                   |
| update_at      | 更新日時 | timestamp     | Y    |      |     | 現在時刻 |                   |

# t_new_book: 新刊データ

| 物理名         | 論理名   | 型        | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                                   |
| -------------- | -------- | --------- | ---- | ---- | --- | -------- | -------------------------------------- |
| book_name      | 書籍名   | string    | Y    |      |     |          |                                        |
| isbn           | ISBN     | string    |      |      | Y   |          | nullの重複は可                         |
| author_name    | 著者名   | string    |      |      |     |          |                                        |
| publisher_name | 出版社名 | string    |      |      |     |          |                                        |
| publish_date   | 出版日   | string    | Y    |      |     |          | YYYY-MM-DD(新刊netのﾃﾞｰﾀの都合)        |
| tags           | タグ     | string    |      |      |     |          | 新刊データはなぜかタグstringで持ってる |
| create_user    | 作成者   | string    | Y    |      |     | "system" |                                        |
| create_at      | 作成日時 | timestamp | Y    |      |     | 現在時刻 |                                        |
| update_user    | 更新者   | string    | Y    |      |     | "system" |                                        |
| update_at      | 更新日時 | timestamp | Y    |      |     | 現在時刻 |                                        |

# t_jisui_book: 自炊データ

| 物理名         | 論理名         | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                 |
| -------------- | -------------- | ------------- | ---- | ---- | --- | -------- | -------------------- |
| book_name      | 書籍名         | string        | Y    |      |     |          |                      |
| isbn           | ISBN           | string        |      |      | Y   |          | nullの重複は可       |
| author_name    | 著者名         | string        |      |      |     |          |                      |
| publisher_name | 出版社名       | string        |      |      |     |          |                      |
| publish_month  | 出版年月       | string        |      |      |     |          | YYYY/MM              |
| cover_url      | 書影URL        | string        |      |      |     |          |                      |
| tags           | タグ           | array[string] |      |      |     |          |                      |
| memo           | メモ           | string        |      |      |     |          |                      |
| status         | 読書状態       | string        | Y    |      |     | "toread" | toread/reading/read  |
| file_name      | ファイル名     | string        | Y    |      | Y   |          |                      |
| type           | ファイルタイプ | string        | Y    |      |     |          | pdf/epub/image/audio |
| page_max       | ページ最大値   | number        | Y    |      |     |          | audioは再生時間秒    |
| page_tmp       | 現在のページ   | number        | Y    |      |     | 0        |                      |
| chapters       | チャプター     | array         | Y    |      |     | 空配列   |                      |
| - name         | - 内容名       | string        | Y    |      |     |          |                      |
| - page         | - ページ       | number        | Y    |      |     |          |                      |
| bookmarks      | しおり         | array[number] |      |      |     | 空配列   |                      |
| create_user    | 作成者         | string        | Y    |      |     | "system" |                      |
| create_at      | 作成日時       | timestamp     | Y    |      |     | 現在時刻 |                      |
| update_user    | 更新者         | string        | Y    |      |     | "system" |                      |
| update_at      | 更新日時       | timestamp     | Y    |      |     | 現在時刻 |                      |

# t_manga: アプリマンガデータ

| 物理名         | 論理名   | 型            | 必須 | 主ｷｰ | UK  | ﾃﾞﾌｫﾙﾄ値 | 備考                                                    |
| -------------- | -------- | ------------- | ---- | ---- | --- | -------- | ------------------------------------------------------- |
| book_name      | 書籍名   | string        | Y    |      |     |          |                                                         |
| isbn           | ISBN     | string        |      |      | Y   |          | nullの重複は可                                          |
| author_name    | 著者名   | string        |      |      |     |          |                                                         |
| publisher_name | 出版社名 | string        |      |      |     |          |                                                         |
| publish_month  | 出版年月 | string        |      |      |     |          | YYYY/MM                                                 |
| cover_url      | 書影URL  | string        |      |      |     |          |                                                         |
| tags           | タグ     | array[string] |      |      |     |          | アプリ名が入る想定                                      |
| memo           | メモ     | string        |      |      |     |          |                                                         |
| status         | 読書状況 | string        | Y    |      |     | "toread" | "toread":未読 "reading":"読書中" "read": 最新刊まで読了 |
| create_user    | 作成者   | string        | Y    |      |     | "system" |                                                         |
| create_at      | 作成日時 | timestamp     | Y    |      |     | 現在時刻 |                                                         |
| update_user    | 更新者   | string        | Y    |      |     | "system" |                                                         |
| update_at      | 更新日時 | timestamp     | Y    |      |     | 現在時刻 |                                                         |
