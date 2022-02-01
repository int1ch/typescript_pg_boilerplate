import Hapi from "@hapi/hapi";
import { Server } from "@hapi/hapi";
import UserHandlers from "./handlers/users";

import {
  Joi,
  NewUserConsentsJoiSchema,
  SimpleOkJoiSchema,
  SimpleOkSwaggeredPluginResponse,
  UserWithConsentsJoiSchema,
} from "./schema";

export let server: Server;

export const init = async function (): Promise<Server> {
  server = Hapi.server({
    port: process.env.PORT || 4000,
    host: "0.0.0.0",
  });
  await server.register([
    {
      plugin: require("inert"),
    },
    {
      plugin: require("vision"),
    },
  ]);
  await server.register([
    {
      plugin: require("hapi-swaggered"),
      options: {
        tags: {
          user: "User method",
        },
        info: {
          title: "User Consent menagment API",
          description: "",
          version: "1.0",
        },
        requiredTags: ["api"],
      },
    },
    {
      plugin: require("hapi-swaggered-ui"),
      options: {
        title: "User Consent menagment API",
        path: "/docs",
        /*authorization: {
          // see above
          field: "apiKey",
          scope: "query", // header works as well
          // valuePrefix: 'bearer '// prefix incase
          defaultValue: "demoKey",
          placeholder: "Enter your apiKey here",
        },*/
        swaggerOptions: {},
      },
    },
  ]);

  server.validator(Joi);

  server.route([
    {
      method: "GET",
      path: "/users/{userId}",
      options: {
        tags: ["api", "user"],
        description: "Getting user info with consents",
        plugins: {
          "hapi-swaggered": {
            responses: {
              default: {
                description: "User",
                schema: UserWithConsentsJoiSchema,
              },
            },
          },
        },
      },

      handler: UserHandlers.getUser,
    },
    {
      method: "POST",
      path: "/users/",
      options: {
        tags: ["api", "user"],
        description: "Creating user  by email",
        validate: {
          payload: Joi.object({
            email: Joi.string().required().email().description("User Email"),
          }),
        },
        plugins: {
          "hapi-swaggered": {
            responses: {
              default: {
                description: "Newly created user",
                schema: UserWithConsentsJoiSchema,
              },
              500: { description: "Internal Server Error" },
              422: { description: "Invalid Params" },
            },
          },
        },
      },
      handler: UserHandlers.postUser,
    },
    {
      method: "DELETE",
      path: "/users/{UserId}",
      options: {
        tags: ["api", "user"],
        description: "Deleting user by user id",
        plugins: SimpleOkSwaggeredPluginResponse,
      },
      handler: UserHandlers.deleteUser,
    },
  ]);
  server.route({
    method: ["POST"],
    path: "/events",
    options: {
      tags: ["api", "user"],
      description: "Create or Update User Consents",
      validate: {
        payload: NewUserConsentsJoiSchema,
      },
      plugins: SimpleOkSwaggeredPluginResponse,
    },
    handler: UserHandlers.postConsent,
  });

  return server;
};

export const start = async function (): Promise<void> {
  console.log(`Listening on ${server.settings.host}:${server.settings.port}`);
  return await server.start();
};

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection");
  console.error(err);
  process.exit(1);
});
