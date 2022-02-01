import { RandomUUIDOptions } from "crypto";
import { v4 as UUID } from "uuid";

import { Knex } from "knex";
import dbConnection from "./knexConnector";
import { UserConsentType } from "../consts";

export type UserId = string;

interface UserOptions {
  email: string;
}
export interface IUser {
  userId: UserId;
  email: string;
}

export interface UserConsent {
  userId: UserId;
  type: UserConsentType;
  enabled: boolean;
}

export interface UserConsentHistoryEvent extends UserConsent {
  updated_at: Date;
}

export class EmailAlreadyUsedError extends Error {}

export class DbUser {
  constructor(protected knex: Knex = dbConnection) {}

  /*
   * @throws {EmailAlreadyUsedError}
   */
  protected interceptAlreadyUsedEmail(e: any, email?: string) {
    //console.error({ error: e }, "INTERCEPTOR");
    if (String(e.message).includes("users_email_unique")) {
      throw new EmailAlreadyUsedError(
        `Email ${email} already used by some one`
      );
    }
  }

  /*
   *
   * @throws {EmailAlreadyUsedError}
   */
  async create(user: UserOptions) {
    const toCreate = { email: user.email, userId: "" };
    const db = this.knex;
    let createdUserId: string | undefined;
    let tryCounter = 0;

    while (!createdUserId) {
      if (tryCounter > 2) {
        throw new Error("Cannot create user; db error");
      }
      let uuid = UUID();
      toCreate.userId = uuid;
      try {
        const created = await db<IUser>("users")
          .insert(toCreate)
          .returning("userId");
        createdUserId = created[0];
      } catch (e: any) {
        this.interceptAlreadyUsedEmail(e, toCreate.email);
        throw e;
      }
      tryCounter++;
    }
    return createdUserId;
  }
  async update(user: IUser) {
    const userId = user.userId;
    const toUpdate = { email: user.email };
    const db = this.knex;
    try {
      await db<IUser>("users").where({ userId }).update(toUpdate);
    } catch (e: any) {
      this.interceptAlreadyUsedEmail(e, toUpdate.email);
      throw e;
    }
  }
  async delete(userId: UserId) {
    const db = this.knex;
    await db("users").where({ userId }).delete();
  }
  async get(userId: UserId) {
    //logger.debug("Fetcheng by userID:", userId);
    const user = await this.knex<IUser>("users").where({ userId }).first();
    return user;
  }

  async getUserConsents(userId: UserId): Promise<UserConsent[]> {
    const db = this.knex;
    const consents = await db<UserConsent>("user_consents").where({ userId });
    return consents.sort((a, b) => a.type.localeCompare(b.type));
  }
  async getUserConsentsHistory(userId: UserId, offset = 0, limit = 20) {
    const db = this.knex;
    const consents = await db<UserConsentHistoryEvent>("user_consents_history")
      .where({ userId })
      .orderBy("updated_at", "desc")
      .limit(limit)
      .offset(offset);
    return consents;
  }
  async setUserConsent(consent: UserConsent) {
    const db = this.knex;
    await db.transaction(async (trx) => {
      await trx("user_consents_history").insert(consent);
      await trx("user_consents")
        .insert(consent)
        .onConflict(["user_id", "type"])
        .merge({ enabled: consent.enabled });
    });
    //auto commit expected
  }
}

export default new DbUser();
