import { EMAIL_NOTIFICATION, SMS_NOTIFICATION } from "../consts";
import { fixUuidIn } from "../test-helpers";
import { closeConnection } from "./knexConnector";
import dbUser, { UserConsent } from "./User";

//@ts-ignore
const knex = dbUser.knex;

const email1 = "one@email.com";
const email2 = "two@mail.ru";
const email3 = "three@gmail.ru";
const email_for_chaenge = "changed@hotmail.com";
const emails = [email1, email2, email3];

afterAll(async () => {
  await closeConnection();
});
beforeAll(async () => {
  await knex("users")
    .whereIn("email", [...emails, email_for_chaenge])
    .delete();
});
const uuids: string[] = [];
describe("users", () => {
  it("create", async () => {
    for (const email of emails) {
      const uuid = await dbUser.create({ email: email });
      expect(uuid).toHaveLength(36);
      uuids.push(uuid);
    }
  });

  it("double create protection", async () => {
    await expect(async () => {
      await dbUser.create({ email: email1 });
    }).rejects.toThrowError("Email one@email.com already used by some one");
  });
  it("update email protection", async () => {
    await expect(async () => {
      await dbUser.update({ userId: uuids[1], email: email1 });
    }).rejects.toThrowError("Email one@email.com already used by some one");
  });

  it("get normally", async () => {
    const user = await dbUser.get(uuids[0]);
    //expect(user);
    expect(user!.userId).toEqual(uuids[0]);
    expect(user!.email).toEqual(emails[0]);
  });

  it("update email ok", async () => {
    dbUser.update({ userId: uuids[1], email: email_for_chaenge });
    const user = await dbUser.get(uuids[1]);
    //expect(user);
    expect(user!.email).toEqual(email_for_chaenge);
  });

  describe("users consent", () => {
    it("set consent", async () => {
      await dbUser.setUserConsent({
        userId: uuids[1],
        type: EMAIL_NOTIFICATION,
        enabled: true,
      });

      const consents = await dbUser.getUserConsents(uuids[1]);
      expect(consents).toHaveLength(1);
      fixUuidInConsents(consents);
      expect(consents).toMatchSnapshot();

      const consentsHistory = await dbUser.getUserConsentsHistory(uuids[1]);
      expect(consentsHistory).toHaveLength(1);
    });
    it("set second consent", async () => {
      await dbUser.setUserConsent({
        userId: uuids[1],
        type: SMS_NOTIFICATION,
        enabled: true,
      });

      const consents = await dbUser.getUserConsents(uuids[1]);
      expect(consents).toHaveLength(2);
      fixUuidInConsents(consents);
      expect(consents).toMatchSnapshot();

      const consentsHistory = await dbUser.getUserConsentsHistory(uuids[1]);
      expect(consentsHistory).toHaveLength(2);
    });
    it("rewrite consent", async () => {
      await dbUser.setUserConsent({
        userId: uuids[1],
        type: SMS_NOTIFICATION,
        enabled: false,
      });

      const consents = await dbUser.getUserConsents(uuids[1]);
      expect(consents).toHaveLength(2);
      fixUuidInConsents(consents);
      expect(consents).toMatchSnapshot();

      const consentsHistory = await dbUser.getUserConsentsHistory(uuids[1]);
      expect(consentsHistory).toHaveLength(3);
      const lastEvent = consentsHistory[0];
      expect(lastEvent.type).toBe(SMS_NOTIFICATION);
      expect(lastEvent.enabled).toBe(false);
    });
  });
});

function fixUuidInConsents(consents: UserConsent[]) {
  for (const consent of consents) {
    fixUuidIn(consent, "userId");
  }
  return consents;
}
