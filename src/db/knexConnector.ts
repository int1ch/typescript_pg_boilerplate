import { knex } from "knex";
import { snakecase, camelcase } from "stringcase";
import * as config from "../config";
import logger from "../logger";

export async function testConnection() {
  await connection.raw("SELECT now()");
  return connection;
}

const DUMP = false;
const DEBUG = false;

export function openConnection() {
  //ups, dev may run in testing / development
  //other envs expected to use only PG_PASSWORD,
  const password = config.IS_TESTING
    ? config.PG_TESTING_PASSWORD
    : config.PG_PASSWORD;

  const connection = knex({
    client: "pg",
    connection: {
      host: config.PG_HOST,
      port: config.PG_PORT,
      user: config.PG_USERNAME,
      password: password,
      database: config.PG_DATABASE,
    },
    acquireConnectionTimeout: 3000,
    pool: {
      min: 2,
      max: 2, //FIXME
    },
    wrapIdentifier: snakeWrapper,
    postProcessResponse: postConverter,
    debug: DEBUG,
  });
  return connection;
}

function snakeWrapper(
  value: string,
  origImpl: (value: string) => string,
  queryContext: any
): string {
  if (DUMP) logger.log("snake wrapper:", value, origImpl, queryContext);

  return origImpl(snakecase(value));
}
function postConverter(value: any, queryContext: any, path?: string): any {
  if (isRaw(value, queryContext, path)) return value;
  if (DUMP) logger.log("Query POST Converter:", value);
  if (Array.isArray(value)) {
    return value.map((item) => postConverter(item, queryContext));
  }
  if (value._parsers && value._types) {
    const output: any = {};
    Object.assign(output, value);
    output.rows = postConverter(value.rows, queryContext);
    return output;
  }

  const output: any = {};
  path ||= "";
  for (const key of Object.keys(value)) {
    const newKey = camelcase(key);
    output[newKey] = value[key];
    /*postConverter(
      value[key],
      queryContext,
      (path += "." + key)
    );*/
  }

  return output;
}

function isRaw(value: any, queryContext: any, path?: string) {
  if (typeof value !== "object" || value === null) return true;
  if (value instanceof Date) return true;
  return false;

  //if (path === "root") return false;
  //if (typeof recursive !== "function") return true;
  //return !recursive(value, path, queryContext);
}

export async function closeConnection() {
  connection.destroy();
  //logger.log("unsupported?");
  //connection.close
}
const connection = openConnection();
export default connection;
