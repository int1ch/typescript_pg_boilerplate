export const SMS_NOTIFICATION = "sms_notification";
export const EMAIL_NOTIFICATION = "email_notification";

export const UserConsentTypeVariants = [
  SMS_NOTIFICATION,
  EMAIL_NOTIFICATION,
] as const;
export type UserConsentType = typeof UserConsentTypeVariants[number];
