function getOwnerToken() {
  return process.env.OWNER_TOKEN?.trim() ?? "";
}

export function getOwnerUsername() {
  return process.env.OWNER_USERNAME?.trim() || "owner";
}

export function isOwnerTokenConfigured() {
  return getOwnerToken().length > 0;
}

function isAuthorizedOwnerToken(token?: string) {
  const ownerToken = getOwnerToken();
  return ownerToken.length > 0 && token === ownerToken;
}

function getBasicAuthCredentials(authorizationHeader?: string | null) {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  try {
    const encodedCredentials = authorizationHeader.slice("Basic ".length);
    const decodedCredentials = atob(encodedCredentials);
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decodedCredentials.slice(0, separatorIndex),
      password: decodedCredentials.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export function isAuthorizedBasicAuth(authorizationHeader?: string | null) {
  const credentials = getBasicAuthCredentials(authorizationHeader);

  if (!credentials) {
    return false;
  }

  return (
    credentials.username === getOwnerUsername() &&
    isAuthorizedOwnerToken(credentials.password)
  );
}
