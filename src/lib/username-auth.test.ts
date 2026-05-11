import { describe, expect, it } from "vitest";

import {
  getUsernameHelpText,
  identifierToAuthEmail,
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from "./username-auth";

describe("username auth helpers", () => {
  it("normalizes usernames before validation and auth email generation", () => {
    expect(normalizeUsername("  Alice_01 ")).toBe("alice_01");
    expect(isValidUsername("Alice_01")).toBe(true);
    expect(usernameToAuthEmail(" Alice_01 ")).toBe("alice_01@users.travel-collab.example.com");
  });

  it("rejects usernames that are too short, too long, or contain unsupported characters", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(25))).toBe(false);
    expect(isValidUsername("alice-01")).toBe(false);
    expect(isValidUsername("阿青")).toBe(false);
  });

  it("allows existing email identifiers for backward-compatible admin login", () => {
    expect(identifierToAuthEmail("USER@EXAMPLE.COM")).toBe("user@example.com");
    expect(identifierToAuthEmail("traveler")).toBe("traveler@users.travel-collab.example.com");
  });

  it("keeps a user-facing hint for the shared username rule", () => {
    expect(getUsernameHelpText()).toContain("3-24");
  });
});
