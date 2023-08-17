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