const API_PREFIX_SUFFIX = /\/(?:0|api(?:\/v1)?)$/i;

export const normalizeApiBase = (configuredUrl) => {
  let url;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("VITE_API_URL must be an absolute HTTP(S) URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_API_URL must use HTTP or HTTPS.");
  }

  let pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  while (API_PREFIX_SUFFIX.test(pathname)) {
    pathname = pathname.replace(API_PREFIX_SUFFIX, "");
  }

  return `${url.origin}${pathname}`;
};

export const joinApiPath = (apiRoot, path) =>
  `${apiRoot.replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
