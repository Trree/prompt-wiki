import { readConfig } from "./config";

export const OWNER_SESSION_COOKIE = "nexus_owner_session";

async function getOwnerToken() {
  const config = await readConfig();
  return config.OWNER_TOKEN;
}

export async function isOwnerTokenConfigured() {
  return (await getOwnerToken()).length > 0;
}

export async function isAuthorizedOwnerToken(token?: string) {
  const ownerToken = await getOwnerToken();
  return ownerToken.length > 0 && token === ownerToken;
}

async function sha256Hex(input: string) {
  const payload = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createOwnerSessionValue() {
  const ownerToken = await getOwnerToken();

  if (!ownerToken) {
    return "";
  }

  return sha256Hex(`nexus-owner-session:${ownerToken}`);
}

export async function isAuthorizedOwnerSession(sessionValue?: string | null) {
  if (!sessionValue || !(await isOwnerTokenConfigured())) {
    return false;
  }

  return sessionValue === (await createOwnerSessionValue());
}
