import googleBooksUtil from "./googleBooksUtil";
import * as ndlSearchUtil from "./ndlSearchUtil";
import openBdUtil from "./openBdUtil";

export type ApiBook = {
  bookName: string | null,
  isbn: string | null,
  authorName: string | null,
  publisherName: string | null,
  coverUrl: string | null
  memo: string | null
};
export const getApiBook = async (isbn:string) => {
  let apiBook:ApiBook|null = null;
  // try{
  //   // 1.googleBooksApiはなんか動かないのでいったんCO
  //   const googleBook = await googleBooksUtil.getBook(isbn);
  //   if(googleBook){
  //     apiBook = {
  //       ...googleBook,
  //       publisherName: null
  //     };
  //   }
  // }catch(e){
  //   console.error(e);
  // }
  //if(apiBook && apiBook.bookName && apiBook.isbn && apiBook.authorName){return apiBook;}

  try{
    // 2.ndl
    const ndlBook = await ndlSearchUtil.getNdlBook(isbn);
    if(ndlBook){
      apiBook = {
        ...ndlBook,
        memo: null
      };
    }
  }catch(e){
    console.error(e);
  }
  if(apiBook && apiBook.bookName && apiBook.isbn && apiBook.authorName){return apiBook;}

  try{
    // 3.openBD
    const openBdBook = await openBdUtil.getBookInfo(isbn);
    if(openBdBook){
      if(apiBook){
        if(!apiBook.bookName){
          apiBook.bookName = openBdBook.bookName;
        }
        if(!apiBook.isbn){
          apiBook.isbn = openBdBook.isbn;
        }
        if(!apiBook.authorName){
          apiBook.authorName = openBdBook.authorName;
        }
        if(!apiBook.publisherName){
          apiBook.publisherName = openBdBook.publisherName;
        }
        if(!apiBook.coverUrl){
          apiBook.coverUrl = openBdBook.coverUrl;
        }
      }else{
        apiBook = {
          ...openBdBook,
          memo: null
        };
      }
    }

  }catch(e){
    console.error(e);
  }

  return apiBook;
}
export const searchApiBooks = async (searchWord:string) => {
  const apiBooks: ApiBook[] = [];
  
  const googleBooks = await googleBooksUtil.searchBooks(searchWord);
  googleBooks.forEach(book => {
    apiBooks.push({
      bookName: book.bookName,
      isbn: book.isbn,
      authorName: book.authorName,
      publisherName: null,
      coverUrl: book.coverUrl,
      memo: book.memo
    });
  });
  const ndlBooks = await ndlSearchUtil.searchNdlBooks(searchWord);
  ndlBooks.forEach(book => {
    apiBooks.push({
      bookName: book.bookName,
      isbn: book.isbn,
      authorName: book.authorName,
      publisherName: book.publisherName,
      coverUrl: book.coverUrl,
      memo: null
    });
  });
  return apiBooks;
}