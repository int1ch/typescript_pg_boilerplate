import DefaultUserStorage, {
  DbUser,
  EmailAlreadyUsedError,
  UserId,
  IUser,
  UserConsent,
} from "../db/User";
import logger from "../logger";

interface createUserOptions {
  email: string;
}

export class UserRepo {
  protected dbUser: DbUser;
  constructor(userStorage?: DbUser) {
    this.dbUser = userStorage || DefaultUserStorage;
    //dependency injection here;
  }

  protected validateUserEmail(user: { email: string }) {
    const email = user.email;
    if (!checkEmail(email)) {
      throw new ValidationError("Email not valid");
    }
  }

  async create(user: createUserOptions) {
    this.validateUserEmail(user);

    let createdId: string;
    try {
      createdId = await this.dbUser.create(user);
    } catch (e: any) {
      throw convertCatchedDbError(e);
    }

    return this.get(createdId);
  }
  async update(user: IUser) {
    this.validateUserEmail(user);
    try {
      await this.dbUser.update(user);
    } catch (e: any) {
      throw convertCatchedDbError(e);
    }
  }
  async delete(id: UserId) {
    await this.dbUser.delete(id);
  }
  async getConsents(id: UserId) {
    return await this.dbUser.getUserConsents(id);
  }
  async get(id: UserId) {
    return await this.dbUser.get(id);
  }

  async updateConsents(id: UserId, consents: any[]) {
    //validatation
    for (const consent of consents) {
      const userConsent = {
        userId: id,
        type: consent.id,
        enabled: consent.enabled,
      };
      await this.dbUser.setUserConsent(userConsent);
    }
  }
}

const defaultUserRepo = new UserRepo();

export class APIUser {
  protected userRepo: UserRepo;
  protected dbUser: DbUser;
  constructor(userRepoParam?: UserRepo) {
    this.userRepo = userRepoParam || defaultUserRepo;
    this.dbUser = DefaultUserStorage;
  }

  async user(id: UserId): Promise<IUser> {
    const user = await this.dbUser.get(id);
    if (!user) {
      throw new NotFoundError(`User not found ${id}`);
    }
    return user;
  }
  async consentsByUserId(id: UserId) {
    return await this.dbUser.getUserConsents(id);
  }
  /******************************************************** */
  async apiGetUser(id: UserId) {
    const user = await this.user(id);
    const consents = await this.consentsByUserId(id);
    return await this.viewUserWithConsents(user, consents);
  }
  async apiCreateUser(userToCreate: { email: string }) {
    //FIXMR validation of Email
    let createdId: UserId;
    try {
      createdId = await this.dbUser.create(userToCreate);
    } catch (e: any) {
      throw convertCatchedDbError(e);
    }

    const user = await this.user(createdId);
    const consents = await this.consentsByUserId(createdId);

    const view = await this.viewUserWithConsents(user, consents);
    console.log("Created USer", user, consents, view);
    return view;
  }
  async apiDeleteUser(id: UserId) {
    const user = await this.dbUser.get(id);
    if (!user) {
      throw new NotFoundError(`User Not found to delete id:'${id}'`);
    }
    await this.dbUser.delete(id);
    return viewSimpleOk();
  }
  async apiPostConsentsEvents(id: UserId, consents: any[]) {
    //FIXME validation
    for (const consent of consents) {
      const userConsent = {
        userId: id,
        type: consent.id,
        enabled: consent.enabled,
      };
      await this.dbUser.setUserConsent(userConsent);
    }
    return viewSimpleOk();
  }

  /********************************************/

  viewUserConsents(consents: UserConsent[]) {
    const userConsentsPrepared = consents.map((consent) => {
      return {
        id: consent.type,
        enabled: consent.enabled,
      };
    });
    return userConsentsPrepared;
  }
  viewUser(user: IUser) {
    return {
      id: user.userId,
      email: user.email,
    };
  }
  viewUserWithConsents(user: IUser, consents: UserConsent[]) {
    const viewUser = this.viewUser(user);
    const viewUserConsents = this.viewUserConsents(consents);
    return {
      ...viewUser,
      consents: viewUserConsents,
    };
  }
}
export default new APIUser();

export class ValidationError extends Error {}
export class NotFoundError extends Error {
  statusCode = 404;
}
export function checkEmail(email: string): boolean {
  if (email.match(/^[^\@\s]+\@([^\@\s]+)\.[^\@\.\s]+$/)) {
    return true;
  }
  return false;
}

export function checkConsent(consent: any) {
  try {
    if (typeof consent.id === "string" && typeof consent.enabled === "boolean")
      return true;
  } catch (e: any) {
    logger.debug({ error: e }, "checkConsent error");
  }
  return false;
}

export function convertCatchedDbError(e: any): Error {
  if (e instanceof EmailAlreadyUsedError) {
    throw new ValidationError(e.message);
  }
  if (e instanceof Error) {
    throw e;
  }

  console.error(
    { error: e, trace: new Error("trace") },
    "catch unknown instance"
  );
  throw new Error("intercepted unknown error");
}
function viewSimpleOk() {
  //FIXME STUPID STATUS
  return {
    ok: true,
    //status: "ok",
  };
}
