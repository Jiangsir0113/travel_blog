export type UserRole = "admin" | "author" | "reader";

export function isAdmin(role: UserRole | null | undefined) {
  return role === "admin";
}

export function canWriteTrips(role: UserRole | null | undefined) {
  return role === "admin" || role === "author";
}
