export const OWNER_SESSION_COOKIE = "nexus_owner_session";

function getOwnerToken() {
  return process.env.OWNER_TOKEN?.trim() ?? "";
}

export function getOwnerUsername() {
  return process.env.OWNER_USERNAME?.trim() || "owner";
}

export function isOwnerTokenConfigured() {
  return getOwnerToken().length > 0;
}

export function isAuthorizedOwnerToken(token?: string) {
  const ownerToken = getOwnerToken();
  return ownerToken.length > 0 && token === ownerToken;
}

async function sha256Hex(input: string) {
  const payload = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createOwnerSessionValue() {
  const ownerToken = getOwnerToken();

  if (!ownerToken) {
    return "";
  }

  return sha256Hex(`nexus-owner-session:${ownerToken}`);
}

export async function isAuthorizedOwnerSession(sessionValue?: string | null) {
  if (!sessionValue || !isOwnerTokenConfigured()) {
    return false;
  }

  return sessionValue === (await createOwnerSessionValue());
}
