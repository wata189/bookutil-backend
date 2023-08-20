import { systemLogger } from "../modules/logUtil";
import {checkLibrary} from "../modules/models";
import * as firestoreUtil from "../modules/firestoreUtil";

// Define main script
const main = async () => {
  systemLogger.debug("checkLibrary start");
  const data = await firestoreUtil.tran([checkLibrary])
  systemLogger.debug("checkLibrary end");
};

// Start script
main().catch(err => {
  systemLogger.error(err);
  process.exit(1);
});


