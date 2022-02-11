import Fastify, {
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";

import openapiGlue from "fastify-openapi-glue";

import logger from "./logger";
import service from "./handlers/users";
import { ValidationError } from "./domian/User";
import { log } from "console";

function build(options: FastifyServerOptions = {}) {
  const fastify = Fastify(options);

  const specFile = `${__dirname}/../schema/api.yaml`;
  logger.debug(`load OpenApi spec from ${specFile}`);

  const glueOptions = {
    specification: specFile,
    service: service,
    //securityHandlers: new Security(),
    //prefix: "v1",
    noAdditional: true,
    ajvOptions: {
      formats: {
        "custom-format": /\d{2}-\d{4}/,
      },
    },
  };
  fastify.register(openapiGlue, glueOptions);

  // Declare a route
  fastify.get("/", async (request, reply) => {
    return { hello: "world" };
  });
  fastify.get("/status", async (request, reply) => {
    return { ok: true };
  });

  fastify.get("/oops", {
    handler(req, rep) {
      rep.send({ boom: true });
    },
    schema: {
      response: {
        200: {
          status: { type: "boolean", require: true },
        },
      },
    },
  });
  fastify.get("/oopps", {
    handler(req, rep) {
      rep.send({ boom: true });
    },
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            name: { type: "string" },
            power: { type: "string" },
          },
          required: ["name"],
        },
      },
    },
  });

  const errorHandler = (
    error: any,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    //console.log({ err: error }, "Error intercepted in handler");
    let statusCode = error.statusCode;
    let response: { message: string; errors: any[]; statusCode?: number };

    const { validation, validationContext } = error;

    // check if we have a validation error from schema validator
    if (validation || error instanceof ValidationError) {
      statusCode ||= 422;
      // validationContext will be 'body' or 'params' or 'headers' or 'query'
      /* 
       validataion: {"instancePath":"/q2","schemaPath":"#/properties/q2/type","keyword":"type","params":{"type":"number"},"message":"must be number"}
      */
      response = {
        message: `A validation error: ${error.message}`,
        errors: [error.message],
      };
    } else if (error.serialization) {
      request.log.error(
        { serialization: error.serialization },
        "Serialization failed: " + error.message
      );
      response = {
        message: "Serializaation failed",
        errors: [error.message],
      };
    } else {
      request.log.error({ err: error }, "Error intercepted in handler");
      response = {
        message: "An error occurred...",
        errors: [error.message],
      };
    }

    // any additional work here, eg. log error
    // ...
    if (statusCode) {
      response.statusCode = statusCode;
    }

    reply.status(statusCode || 500).send(response);
  };

  fastify.setErrorHandler(errorHandler);
  return fastify;
}

export default build;
