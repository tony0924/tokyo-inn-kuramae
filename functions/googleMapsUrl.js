const GOOGLE_MAPS_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.co.jp',
  'www.google.co.jp',
  'maps.google.co.jp',
  'maps.app.goo.gl',
  'goo.gl',
]);
const MAX_REDIRECTS = 5;

export class InvalidGoogleMapsUrlError extends Error {}

export function parseAllowedGoogleMapsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidGoogleMapsUrlError('Google Maps 連結格式不正確。');
  }

  if (url.protocol !== 'https:' || !isAllowedGoogleMapsHost(url.hostname)) {
    throw new InvalidGoogleMapsUrlError('僅接受 Google Maps 的 HTTPS 連結。');
  }

  return url;
}

export function isAllowedGoogleMapsHost(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return GOOGLE_MAPS_HOSTS.has(normalized) || normalized.endsWith('.google.com');
}

export async function resolveGoogleMapsUrl(inputUrl, fetchImpl = fetch) {
  const parsed = parseAllowedGoogleMapsUrl(inputUrl);

  try {
    return await followAllowedRedirects(parsed, 'HEAD', fetchImpl);
  } catch {
    try {
      return await followAllowedRedirects(parsed, 'GET', fetchImpl);
    } catch {
      // The input has already been validated. Some Maps URLs cannot be
      // resolved by HEAD/GET but can still provide usable lookup hints.
      return parsed.href;
    }
  }
}

export async function followAllowedRedirects(initialUrl, method, fetchImpl = fetch) {
  let current = initialUrl;

  for (let count = 0; count <= MAX_REDIRECTS; count += 1) {
    const response = await fetchImpl(current, { method, redirect: 'manual' });

    if (response.status < 300 || response.status >= 400) return current.href;

    const location = response.headers.get('location');
    if (!location) return current.href;
    current = parseAllowedGoogleMapsUrl(new URL(location, current).href);
  }

  throw new InvalidGoogleMapsUrlError('Google Maps 連結的轉址次數過多。');
}
