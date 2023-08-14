import log4js from "log4js";


log4js.configure({
  appenders: {
      system: {type:"stdout"},
      access: {type:"stdout"}
  },
  categories: {
      default: {appenders:['system'], level: 'debug'},
      web: {appenders: ['access'], level: 'info'}
  }
});

export const systemLogger = log4js.getLogger();4

const accessLogger = log4js.getLogger("web");
const accessLoggerOptions = {};
export const connectAccessLogger = log4js.connectLogger(accessLogger, accessLoggerOptions);