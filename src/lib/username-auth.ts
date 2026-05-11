export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const USERNAME_EMAIL_DOMAIN = "users.travel-collab.example.com";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function identifierToAuthEmail(identifier: string) {
  const cleanedIdentifier = identifier.trim();

  if (cleanedIdentifier.includes("@")) {
    return cleanedIdentifier.toLowerCase();
  }

  return usernameToAuthEmail(cleanedIdentifier);
}

export function getUsernameHelpText() {
  return "用户名需要 3-24 位，只能使用小写字母、数字和下划线。";
}
