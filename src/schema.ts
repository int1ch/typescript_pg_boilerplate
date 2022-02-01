export { default as Joi } from "joi";
import Joi from "joi";

import { UserConsentType, UserConsentTypeVariants } from "./consts";
import { UserId } from "./db/User";
import { join } from "path/posix";

const UserConsentsJoiSchema = Joi.object({
  id: Joi.string().valid(...UserConsentTypeVariants),
  enabled: Joi.boolean(),
}).meta({ className: "UserConsent" });

interface UserConsentInput {
  id: UserConsentType;
  enabled: boolean;
}
export interface UserNewConsentEventsInput {
  user: {
    id: UserId;
  };
  consents: UserConsentInput[];
}

export const UserWithConsentsJoiSchema = Joi.object({
  id: Joi.string().required().uuid().description("User UUID"),
  email: Joi.string().required().email().description("User Email"),
  consents: Joi.array().items(UserConsentsJoiSchema),
}).meta({ className: "PostUserConsents" });

export const NewUserConsentsJoiSchema = Joi.object({
  user: Joi.object({
    id: Joi.string().uuid().required(),
  }).required(),
  consents: Joi.array().items(UserConsentsJoiSchema),
});

export const SimpleOkJoiSchema = Joi.object({
  ok: Joi.boolean().only().allow(true),
});

export const SimpleOkSwaggeredPluginResponse = {
  "hapi-swaggered": {
    responses: {
      default: {
        description: "All Ok",
        schema: SimpleOkJoiSchema,
      },
    },
  },
};
