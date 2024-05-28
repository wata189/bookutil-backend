console.log("start sandbox.ts");
import * as models from "../modules/models";
import * as fs from 'fs';
import path from 'path';
import * as util from "../modules/util";
import * as ndlSearchUtil from "../modules/ndlSearchUtil";

import params from "C:\\workspace\\bookutil-backend\\src\\batch\\data\\bookshelfBookParams_1716792231814.json";
const bookshelfBookParamses:models.BookshelfBookParams[] = params;
console.log(bookshelfBookParamses.length + 86);


console.log("end sandbox.ts");