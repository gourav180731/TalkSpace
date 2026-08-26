import crypto from "crypto";
import UserMOdel from "../models/user.model";

export const hashContact = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

export const matchHashedContacts = async (hashes: string[]) => {
  // User model does not store contact hashes directly; we match against email and username hashes
  // For privacy, we hash on the fly and compare. This is illustrative; in production a separate contactHash field would be indexed.
  const users = await UserMOdel.find({}, { email: 1, username: 1, avatar: 1 }).lean();
  const hashSet = new Set(hashes);
  const matched: any[] = [];
  for (const u of users) {
    const emailHash = hashContact(u.email);
    const usernameHash = hashContact(u.username);
    if (hashSet.has(emailHash) || hashSet.has(usernameHash)) {
      matched.push({ _id: u._id, username: u.username, avatar: u.avatar, email: u.email });
    }
  }
  return matched;
};

export const normalizePhone = (phone: string): string => {
  return phone.replace(/[^\d+]/g, "");
};
