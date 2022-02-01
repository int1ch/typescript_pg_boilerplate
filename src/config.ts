import * as envConfig from "./env-config";

const DEBUG_CONFIG = false;
const config = envConfig.fromPath(undefined, { debug: DEBUG_CONFIG });
const loggingLevel = ["debug", "info", "warning"];
//FIXME warn or warning?
export const ENVIRONMENT = config.get("ENVIRONMENT").required().asString();
export const IS_PRODUCTION = ENVIRONMENT == "production";
export const IS_DEVELOPMENT = ENVIRONMENT == "development";
export const IS_TESTING = ENVIRONMENT == "testing";

export const LOGGING_CONSOLE_LEVEL = config
  .get("LOGGING_CONSOLE_LEVEL")
  .default("warning")
  .asEnum(loggingLevel);

//PG
export const PG_HOST = config.get("PG_HOST").required().asString();
export const PG_PORT = config.get("PG_PORT").required().asPortNumber();
export const PG_USERNAME = config.get("PG_USERNAME").required().asString();
export const PG_PASSWORD = config.get("PG_PASSWORD").required().asString();
export const PG_TESTING_PASSWORD = config.get("PG_TESTING_PASSWORD").asString();
export const PG_TESTING_USERNAME = config.get("PG_TESTING_USERNAME").asString();
export const PG_TESTING_DATABASE = config.get("PG_TESTING_DATABASE").asString();

export const PG_DATABASE = config.get("PG_DATABASE").required().asString();
export const PG_POOL_SIZE = config
  .get("PG_POOL_SIZE")
  .default(2)
  .asIntPositive();

export const BACKEND_PORT = config
  .get("BACKEND_PORT")
  .default(4000)
  .asPortNumber();

//OAUTH
