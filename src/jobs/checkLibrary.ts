import { systemLogger } from "../modules/logUtil";

// Define main script
const main = async () => {
  systemLogger.debug("checkLibrary start");
  
  systemLogger.debug("checkLibrary end");
};

// Start script
main().catch(err => {
  process.exit(1); // Retry Job Task by exiting the process
});


