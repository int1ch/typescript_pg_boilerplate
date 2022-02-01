import { userInfo } from "os";
import dbUser, { DbUser } from "./db/User";

export function fixUuidIn(body: any, field: string) {
  try {
    body[field] = "uuid0000-fixe-df04-test-reason6922cd";
  } catch (e) {}
}

export function fixEmailIn(body: any, field: string) {
  try {
    body[field] = "fixed@email.ru";
  } catch (e) {}
}

function randInt(max = 100000) {
  Math.ceil(Math.random() * 10000);
}

export class UserCreator {
  protected dbUser: DbUser;
  protected createdIds: string[];
  protected n = 0;
  constructor() {
    this.dbUser = dbUser;
    this.createdIds = [];
  }
  async create(options?: { email?: string }) {
    const rand = randInt();
    const email = options?.email || `cr-${this.n++}-${rand}@test-cr.com`;

    const userId = await this.dbUser.create({ email: email });
    this.createdIds.push(userId);
    return userId;
  }
  async cleanUp() {
    for (const userId of this.createdIds) {
      await this.dbUser.delete(userId);
    }
  }
}

export const userCreatorHelper = new UserCreator();
