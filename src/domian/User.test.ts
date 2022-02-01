import { closeConnection } from "../db/knexConnector";
import { EmailAlreadyUsedError } from "../db/User";
import userRepo, {
  checkEmail,
  convertCatchedDbError,
  ValidationError,
} from "./User";


class UnknonwCustomError extends Error {}
class NewUnknonwCustomError extends UnknonwCustomError {}

const rand = Math.round(Math.random() * 100000);
const emails = ["a", "b"].map((e) => e + rand + "@other.com");

afterAll(async () => {
  closeConnection();
});

describe("user crud", () => {
  it("create", async () => {
    const newUserResponse = await userRepo.apiCreateUser({ email: emails[0] });
  });
});

describe("helpers", () => {
  describe("DB Errors", () => {
    it("EMAIL ALREADY USED", () => {
      const used = new EmailAlreadyUsedError("WAT WAT");
      const custom = new NewUnknonwCustomError("new on");
      expect(() => {
        convertCatchedDbError(used);
      }).toThrowError(ValidationError);
      expect(() => {
        convertCatchedDbError(used);
      }).toThrowError(ValidationError);

      expect(() => {
        convertCatchedDbError(custom);
      }).toThrowError(UnknonwCustomError);
      expect(() => {
        convertCatchedDbError(custom);
      }).toThrowError(NewUnknonwCustomError);
      expect(() => {
        convertCatchedDbError(custom);
      }).toThrowError(Error);
      expect(() => {
        convertCatchedDbError(custom);
      }).not.toThrowError(ValidationError);
    });
    it("validate email", () => {
      expect(checkEmail("mike@mellior.ru")).toBe(true);
      expect(checkEmail("12321321321@mail.com.tw")).toBe(true);

      expect(checkEmail("12321321321")).toBe(false);
      expect(checkEmail("x@x")).toBe(false);
      expect(checkEmail("12@x@x.com")).toBe(false);
    });
  });
});
