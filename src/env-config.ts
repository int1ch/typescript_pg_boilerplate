import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

import { from } from "env-var";
import * as dotenv from "dotenv";
import logger from "./logger";
//import { STATUS_CODES } from "http";

const DEBUG = false;

export enum EnvironmentType {
  Production = "production",
  Testing = "testing",
  Development = "development",
}

function parseEnvName(value: string | undefined): EnvironmentType | undefined {
  if (value) {
    const lcv = value.toLowerCase();
    if (lcv === "production" || lcv === "prod") {
      return EnvironmentType.Production;
    }
    if (lcv === "testing" || lcv === "test") {
      return EnvironmentType.Testing;
    }
    if (lcv === "development" || lcv === "dev") {
      return EnvironmentType.Development;
    }
  }
  return undefined;
}

interface Options {
  debug?: boolean;
}
class ConfigParseError extends Error {
  code = "PARSEF";
}

function dotenvDataParser(data: string): NodeJS.ProcessEnv {
  return dotenv.parse(data) as NodeJS.ProcessEnv;
}
function yamlDataParser(data: string): NodeJS.ProcessEnv {
  const parsed = yaml.parse(data);
  const fileContainer: NodeJS.ProcessEnv = {};
  let keyCount = 0;
  try {
    for (const key in parsed) {
      const value = String(parsed[key]);
      fileContainer[key] = value;
      keyCount++;
    }
  } catch (e) {
    logger.error("Error validatind data", e);
  }
  if (!keyCount) {
    //FIXME
    throw new ConfigParseError("YAML failed to parse");
  }
  return fileContainer;
}
function readAndParse(
  filePath: string,
  fileName: string,
  parser: (data: string) => NodeJS.ProcessEnv,
  extension?: string | undefined,
  options?: Options
): NodeJS.ProcessEnv | null {
  const encoding = "utf8";
  const debug = (options ? options.debug : undefined) || DEBUG; //WTF1
  const configFile = fileName + (extension ? "." + extension : "");
  const configPath = path.resolve(filePath, configFile);
  try {
    const data = fs.readFileSync(configPath, { encoding });
    return parser(data);
  } catch (e: any) {
    //ts FIX?
    if (e.code === "ENOENT") {
      if (debug) {
        logger.log(e.message);
      }
    } else if (e.code === "PARSEF") {
      logger.error("Parse Erorr", e, "File:", configPath);
    } else {
      logger.error(e);
    }
  }
  return null;
}

function readDotEnvFile(
  filePath: string,
  fileName: string,
  options?: Options
): NodeJS.ProcessEnv | null {
  return readAndParse(filePath, fileName, dotenvDataParser, "env", options);
}
function readYamlFile(
  filePath: string,
  fileName: string,
  options?: Options
): NodeJS.ProcessEnv | null {
  return readAndParse(filePath, fileName, yamlDataParser, "yaml", options);
  return null;
}

export function fromPath(configPath?: string, options?: Options) {
  //WTF options?.debug Dont workF
  const debug = (options ? options.debug : undefined) || DEBUG; //WTF2
  if (!configPath) {
    configPath = path.resolve(process.cwd(), "config");
    if (debug) {
      logger.log("path based on CWD:", configPath);
    }
  } else {
    //FIXME
    if (debug) {
      logger.log("search config in:", configPath);
    }
  }

  let envEniromnent =
    parseEnvName(process.env.ENVIRONMENT) ||
    parseEnvName(process.env.ENV) ||
    parseEnvName(process.env.NODE_ENV);

  if (!envEniromnent) {
    envEniromnent = EnvironmentType.Development;
  }

  //FIXME
  if (debug) {
    logger.log("Selected env:", envEniromnent);
  }

  // start reading containers
  // priority
  // common + env specific + secret + process.env
  //YAML = DOCKER
  const files: string[] = ["default", envEniromnent, "secret"];
  const container: NodeJS.ProcessEnv = {};
  //const container_from: NodeJS.ProcessEnv = {};

  for (const configFile of files) {
    let fileContainer: NodeJS.ProcessEnv | null;
    fileContainer = readDotEnvFile(configPath, configFile, options);
    if (!fileContainer) {
      fileContainer = readYamlFile(configPath, configFile, options);
    }
    if (fileContainer) {
      for (const key in fileContainer) {
        container[key] = fileContainer[key];
        //container_from[key] = configFile;
      }
    }
  }

  /*export const securedEnv: NodeJS.ProcessEnv = {};
    for( let [name, value] of container){
        if name.match(`_SECRET$`){

        } else {
            securedEnv[name] = value;
        }
    }*/

  for (const key in process.env) {
    container[key] = process.env[key];
  }
  container["ENVIRONMENT"] = String(envEniromnent);
  return from(container);
}

//просто ENV PROXY
//const envConfig = from(process.env);
//export default envConfig;
