import * as util from "../src/modules/util";

describe.each([
  ["", false],
  ["prod", false],
  ["dev", true],
])("isEnv %p", (param, expected) => {
  test(`returns ${expected}`, () => {
    process.env.ENV = param;
    expect(util.isEnv()).toBe(expected);
  })
});
describe.each([
  ["", false],
  ["1", false],
  ["123456789", false],
  ["1234567890", true],
  ["1234567891", true],
  ["123456789X", true],
  ["X23456789X", false],
  ["123456789Y", false],
  ["12345678901", false],
  ["123456789012", false],
  ["1234567890123", true],
  ["123456789012X", false],
  ["123456789X123", false],
  ["12345678901234", false]
])("isIsbn(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.isIsbn(param)).toBe(expected);
  })
});
const testDate = new Date('1995-01-01T01:01:01');
describe.each([
  ["yy", testDate, "95"],
  ["yyyy", testDate, "1995"],
  ["M", testDate, "1"],
  ["MM", testDate, "01"],
  ["d", testDate, "1"],
  ["dd", testDate, "01"],
  ["h", testDate, "1"],
  ["hh", testDate, "01"],
  ["m", testDate, "1"],
  ["mm", testDate, "01"],
  ["s", testDate, "1"],
  ["ss", testDate, "01"],
  ["yyyyMMddhhmmss", testDate, "19950101010101"],
  ["yyyy/MM/dd hh:mm:ss", testDate, "1995/01/01 01:01:01"],
])("formatDateToStr(%p)", (format, date, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.formatDateToStr(date, format)).toBe(expected);
  })
});
describe.each([
  [[], 0],
  [[1, 3, 4, 5, 3, 4, 3, 4], 4],
  [["", "あ", "１", "ｗ", "あ", "ｗ", "1", "", ], 5],
  [[1, "1", 1], 2]
])("removeDuplicateElements(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.removeDuplicateElements(param).length).toBe(expected);
  })
});
describe.each([
  ["404891207", "4048912070"],
  ["480251105", "4802511051"],
  ["404680135", "4046801352"],
  ["429501007", "4295010073"],
  ["404703654", "4047036544"],
  ["406149575", "4061495755"],
  ["406257881", "4062578816"],
  ["404419110", "4044191107"],
  ["406156547", "4061565478"],
  ["482223917", "4822239179"],
  ["479817243", "479817243X"],
])("isbn9To10(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.isbn9To10(param)).toBe(expected);
  })
});
describe.each([
  ["9784048912075", "4048912070"],
  ["9784802511056", "4802511051"],
  ["9784046801357", "4046801352"],
  ["9784295010074", "4295010073"],
  ["9784047036543", "4047036544"],
  ["9784061495753", "4061495755"],
  ["9784062578813", "4062578816"],
  ["9784044191108", "4044191107"],
  ["9784061565470", "4061565478"],
  ["9784822239176", "4822239179"],
  ["9784798172439", "479817243X"],
])("isbn13To10(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.isbn13To10(param)).toBe(expected);
  })
});
describe.each([
  ["978404891207", "9784048912075"],
  ["978480251105", "9784802511056"],
  ["978404680135", "9784046801357"],
  ["978429501007", "9784295010074"],
  ["978404703654", "9784047036543"],
  ["978406149575", "9784061495753"],
  ["978406257881", "9784062578813"],
  ["978404419110", "9784044191108"],
  ["978406156547", "9784061565470"],
  ["978482223917", "9784822239176"],
  ["978479817243", "9784798172439"],
])("isbn12To13(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.isbn12To13(param)).toBe(expected);
  })
});
describe.each([
  ["4048912070", "9784048912075"],
  ["4802511051", "9784802511056"],
  ["4046801352", "9784046801357"],
  ["4295010073", "9784295010074"],
  ["4047036544", "9784047036543"],
  ["4061495755", "9784061495753"],
  ["4062578816", "9784062578813"],
  ["4044191107", "9784044191108"],
  ["4061565478", "9784061565470"],
  ["4822239179", "9784822239176"],
  ["479817243X", "9784798172439"],
])("isbn10To13(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(util.isbn10To13(param)).toBe(expected);
  })
});

import * as validationUtil from "../src/modules/validationUtil";
describe.each([
  ["", false],
  ["a", true],
  [0, true],
  [1, true],
  [true, true],
  [false, true],
  [null, false],
  [undefined, false],
  [NaN, false],
])("isExist(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isExist(param)).toBe(expected);
  })
});
describe.each([
  [[], false],
  [[0], true],
  [[false], true],
  [[""], true],
  [[null], true],
  [[undefined], true],
  [[NaN], true],
  [[0,0], true]
])("isExistArray(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isExistArray(param)).toBe(expected);
  })
});
describe.each([
  [-1, false],
  [0, true],
  [1, true],
  [2, false],
  [null, false],
  [NaN, false],
  [undefined, false],
])("isFlg(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isFlg(param)).toBe(expected);
  })
});
describe.each([
  [-1, true],
  [0, true],
  [1, true],
  [9, true],
  [1234567890, true],
  ["-1", true],
  ["0", true],
  ["1", true],
  ["9", true],
  ["1234567890", true],
  ["123456789X", false],
  ["a", false],
  [true, false],
  [false, false],
  ["－１", false],
  ["１", false],
  ["０", false],
])("isNumber(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isNumber(param)).toBe(expected);
  })
});
describe.each([
  [-1, false],
  [-9, false],
  [-1234567890, false],
  [0, false],
  [1, true],
  [9, true],
  [1234567890, true],
])("isPlus(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isPlus(param)).toBe(expected);
  })
});
describe.each([
  ["", false],
  ["1", false],
  ["123456789", false],
  ["1234567890", true],
  ["1234567891", true],
  ["123456789X", true],
  ["X23456789X", false],
  ["123456789Y", false],
  ["12345678901", false],
  ["123456789012", false],
  ["1234567890123", true],
  ["123456789012X", false],
  ["123456789X123", false],
  ["12345678901234", false]
])("isIsbn(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isIsbn(param)).toBe(expected);
  })
});
describe.each([
  ["", false],
  ["h", false],
  ["http://example.com", true],
  ["https://example.com", true],
  ["http:/example.com", false],
  ["https:/example.com", false],
  ["http//example.com", false],
  ["https//example.com", false],
  ["ttp://example.com", false],
  ["ttps://example.com", false],
])("isUrl(%p)", (param, expected) => {
  test(`returns ${expected}`, () => {
    expect(validationUtil.isUrl(param)).toBe(expected);
  })
});