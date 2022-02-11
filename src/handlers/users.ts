import { FastifyReply, FastifyRequest } from "fastify";
import logger from "../logger";

import DefaultApiUser, {
  APIUser,
  NotFoundError,
  UserRepo,
  ValidationError,
} from "../domian/User";
import { UserNewConsentEventsInput } from "../schema";

interface UserIdParams {
  UserId: string;
}
interface UserCreateBody {
  email: string;
}

class UserHandler {
  protected user: APIUser;
  constructor(costomUser?: APIUser) {
    this.user = costomUser || DefaultApiUser;
  }

  @fastifyEnvelop
  async getUser(
    request: FastifyRequest<{ Params: UserIdParams }>,
    h: FastifyReply
  ) {
    const id = requiredId(request.params.UserId);

    return await this.user.apiGetUser(id);
  }
  @fastifyEnvelop
  async createUser(request: FastifyRequest, h: FastifyReply) {
    const payload = request.body as UserCreateBody;
    console.log("CREATED USER IN", payload);

    const email = payload.email;

    return await this.user.apiCreateUser({ email });
  }
  @fastifyEnvelop
  async deleteUser(
    request: FastifyRequest<{ Params: UserIdParams }>,
    h: FastifyReply
  ) {
    const id = requiredId(request.params.UserId);
    return await this.user.apiDeleteUser(id);
  }

  @fastifyEnvelop
  async postConsent(request: FastifyRequest, h: FastifyReply) {
    const payload = request.body as UserNewConsentEventsInput;

    const userId = payload.user.id;
    const consents = payload.consents;
    return this.user.apiPostConsentsEvents(userId, consents);
  }
  @fastifyEnvelop
  async anyOk(requiest: FastifyRequest, h: FastifyReply) {
    h.status(201);

    return { ok: "ok" };
  }

  @fastifyEnvelop
  async anyNull(requiest: FastifyRequest, h: FastifyReply) {}
}

export default new UserHandler();

class RequiredFieldError extends Error {
  statusCode = 422;
}

function requiredId(id: any) {
  if (typeof id === "string" && id.length > 0) {
    return id;
  }
  throw new RequiredFieldError("id param as uuid string required");
}
function requiredEmail(email: any) {
  if (typeof email === "string") {
    return email;
  }
  throw new RequiredFieldError("email param required");
}

function fastifyEnvelop(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  let method = descriptor.value!;
  descriptor.value = async function (request: FastifyRequest, h: FastifyReply) {
    try {
      const response = await method.apply(this, arguments);
      //console.info("Envelop response SEND", response);
      // on answer
      // { ok: true }
      // get unknown error "status" is required
      // problem is this case hard to detect and locate
      /*           at $main (eval at build (/Users/mac/dev/didomi_hapi_backend/node_modules/fast-json-stringify/index.js:155:20), <anonymous>:182:15)
          at serialize (/Users/mac/dev/didomi_hapi_backend/node_modules/fastify/lib/reply.js:733:12)
          at preserializeHookEnd (/Users/mac/dev/didomi_hapi_backend/node_modules/fastify/lib/reply.js:373:15) 
      */
      h.send(response);
    } catch (e: any) {
      let statusCode = 500;
      if (e.statusCode) {
        statusCode = e.statusCode;
      }
      if (e instanceof ValidationError) {
        statusCode = 422;
        h.code(statusCode).send({
          error: "Validation Error",
          message: e.message,
          statusCode: statusCode,
        });
      } else if (e instanceof NotFoundError) {
        statusCode = 404;
        h.code(statusCode).send({
          error: "Not Found",
          message: e.message,
          statusCode: statusCode,
        });
      } else {
        logger.error({ error: e }, "Intercepted error");
        h.code(statusCode).send({
          error: "Server Error",
          message: e.message,
          statusCode: statusCode,
        });
      }
    }
  };
}
