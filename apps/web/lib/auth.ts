export const OWNER_TOKEN_COOKIE = "nexus_owner_token";

export function getOwnerToken() {
  return process.env.OWNER_TOKEN?.trim() ?? "";
}

export function isOwnerTokenConfigured() {
  return getOwnerToken().length > 0;
}

export function isAuthorizedOwnerToken(token?: string) {
  const ownerToken = getOwnerToken();
  return ownerToken.length > 0 && token === ownerToken;
}
