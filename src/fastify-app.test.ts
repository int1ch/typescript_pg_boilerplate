import { EMAIL_NOTIFICATION, SMS_NOTIFICATION } from "./consts";
import { closeConnection } from "./db/knexConnector";
import dbUser, { DbUser, UserConsent } from "./db/User";
import appBuilder from "./fastify-app";
import { fixEmailIn, fixUuidIn, userCreatorHelper } from "./test-helpers";

const app = appBuilder({});

const rand = Math.ceil(Math.random() * 10000);
const emailToCreate = `fastify-app${rand}@test.com`;
const emailToCreateForAll = `fastify-gar${rand}@test.com`;
const emailForConsents = `fastify2-app${rand}@test.com`;
let createdUserId: string | undefined;
let createdForAllUserId: string | undefined;

const createdUsersIds: string[] = [];
const fakeUserUd = "d290f1ee-6c54-4b01-90e6-d701748f0000";

beforeAll(async () => {
  const userId = await dbUser.create({ email: emailToCreateForAll });
  createdForAllUserId = userId;
  createdUsersIds.push(userId);
});

afterAll(async () => {
  await cleanUp();
  await userCreatorHelper.cleanUp();
  await closeConnection();
});

async function cleanUp() {
  for (const userId of createdUsersIds) {
    await dbUser.delete(userId);
  }
}

describe("HEALTH", () => {
  it("status ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/status",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });
});

describe("POST USERS / create", () => {
  it("BAD EMAIL", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/users/",
      payload: {
        email: "thisIs@email",
      },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchSnapshot();
  });
  it("NO EMAIL", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/users/",
      payload: {},
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchSnapshot();
  });

  it("CREATED BY EMAIL", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/users/",
      payload: {
        email: emailToCreate,
      },
    });
    expect(response.statusCode).toBe(200);
    const jsonResponse = response.json();
    expect(jsonResponse).toBeTruthy();
    createdUserId = jsonResponse.id;

    expect(createdUserId).toBeTruthy();
    createdUsersIds.push(createdUserId!);
    fixUuidIn(jsonResponse, "id");
    fixEmailIn(jsonResponse, "email");
    expect(jsonResponse).toMatchSnapshot();
  });
});
describe("GET USERS", () => {
  it("BAD ID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/users/",
    });
    expect(response.statusCode).toBe(422);
    //expect(response.json()).toMatchSnapshot();
  });
  it("BAD ID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/users/1",
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchSnapshot();
  });
  it("404 by UUID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/users/d290f1ee-6c54-4b01-90e6-d701748f0851",
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchSnapshot();
  });
  it("200 by UUID", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/users/${createdForAllUserId}`,
    });
    expect(response.statusCode).toBe(200);
    const responseJson = response.json();
    fixUuidIn(responseJson, "id");
    fixEmailIn(responseJson, "email");
    expect(responseJson).toMatchSnapshot();

    expect(responseJson.id).toBeTruthy();
    expect(responseJson.email).toBeTruthy();
    expect(responseJson.consents).toHaveLength(0);
  });
});

describe("POST USER CONSENT EVENT", () => {
  it("user created", () => {
    expect(createdUserId).toBeTruthy();
  });

  it.each([
    ["sms_notification", true],
    ["email_notification", true],
    ["sms_validation", false],
  ])("EVENT VALIDATION consent %s isValid: %s", async (consentId, isValid) => {
    const response = await app.inject({
      method: "POST",
      url: `/events`,
      payload: {
        user: {
          id: createdForAllUserId,
        },
        consents: [
          {
            id: consentId,
            enabled: true,
          },
        ],
      },
    });
    if (isValid) {
      expect(response.statusCode).toEqual(200);
    } else {
      expect(response.statusCode).toEqual(422);
    }
  });
  it("POST USER CONSENT EVENT check insert insert", async () => {
    const userId = await userCreatorHelper.create();
    interface event {
      id: string;
      enabled: boolean;
    }
    async function postEvents(userId: string, events: event | event[]) {
      if (!Array.isArray(events)) {
        events = [events];
      }
      return await app.inject({
        method: "POST",
        url: `/events`,
        payload: {
          user: {
            id: userId,
          },
          consents: events,
        },
      });
    }
    const response1 = await postEvents(userId, {
      id: SMS_NOTIFICATION,
      enabled: true,
    });
    expect(response1.statusCode).toBe(200);
    let loggedEvents = await dbUser.getUserConsentsHistory(userId);
    expect(loggedEvents).toHaveLength(1);
    const response2 = await postEvents(userId, {
      id: EMAIL_NOTIFICATION,
      enabled: false,
    });
    expect(response2.statusCode).toBe(200);
    loggedEvents = await dbUser.getUserConsentsHistory(userId);
    expect(loggedEvents).toHaveLength(2);
    let consents = await dbUser.getUserConsents(userId);
    fixUuidInConents(consents);
    expect(consents).toMatchSnapshot();

    const response3 = await postEvents(userId, [
      { id: SMS_NOTIFICATION, enabled: false },
      {
        id: EMAIL_NOTIFICATION,
        enabled: true,
      },
    ]);
    expect(response3.statusCode).toBe(200);
    consents = await dbUser.getUserConsents(userId);
    fixUuidInConents(consents);
    expect(consents).toMatchSnapshot();
    expect(consents[0].enabled).toBe(true); //EMAIL
    expect(consents[1].enabled).toBe(false); //SMS
    loggedEvents = await dbUser.getUserConsentsHistory(userId);
    expect(loggedEvents).toHaveLength(4);
  });
});

describe("DELETE USERS", () => {
  const emailForDelete = `fastify-del${rand}@test.com`;

  async function createUser() {
    const userId = await dbUser.create({ email: emailForDelete });
    createdUsersIds.push(userId);
    return userId;
  }
  const promiseForUserId = createUser();

  it("NO ID", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/users/",
    });
    expect(response.statusCode).toBe(422);
    //expect(response.json()).toMatchSnapshot();
  });
  it("BAD ID", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/users/d290f1ee-6c54-4b01-90e6-d701748f0851---",
    });
    expect(response.statusCode).toBe(422);
    //expect(response.json()).toMatchSnapshot();
  });
  it("404", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/users/d290f1ee-6c54-4b01-90e6-d701748f0851",
    });
    expect(response.statusCode).toBe(404);
    //expect(response.json()).toMatchSnapshot();
  });
  it("200 by UUID", async () => {
    const userId = await promiseForUserId;
    const response = await app.inject({
      method: "DELETE",
      url: `/users/${userId}`,
    });
    expect(response.statusCode).toBe(200);
    const responseJson = response.json();
    //simple ok response
    expect(responseJson).toMatchSnapshot();
    const responseCheck = await app.inject({
      method: "GET",
      url: `/users/${userId}`,
    });
    expect(responseCheck.statusCode).toBe(404);
  });
});

export function fixUuidInConents(consents: UserConsent[]) {
  for (const c of consents) {
    fixUuidIn(c, "userId");
  }
}
