import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidGoogleMapsUrlError,
  parseAllowedGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from './googleMapsUrl.js';

test('accepts only Google Maps HTTPS hosts', () => {
  assert.equal(parseAllowedGoogleMapsUrl('https://maps.app.goo.gl/example').hostname, 'maps.app.goo.gl');
  assert.equal(parseAllowedGoogleMapsUrl('https://www.google.com/maps/place/Kuramae').hostname, 'www.google.com');
  assert.equal(parseAllowedGoogleMapsUrl('https://www.google.co.jp/maps/place/Kuramae').hostname, 'www.google.co.jp');
  assert.throws(() => parseAllowedGoogleMapsUrl('http://maps.app.goo.gl/example'), InvalidGoogleMapsUrlError);
  assert.throws(() => parseAllowedGoogleMapsUrl('https://google.com.evil.example/maps'), InvalidGoogleMapsUrlError);
  assert.throws(() => parseAllowedGoogleMapsUrl('https://127.0.0.1/internal'), InvalidGoogleMapsUrlError);
});

test('blocks redirects outside the Google Maps allowlist', async () => {
  const fetchImpl = async () => ({
    status: 302,
    headers: new Headers({ location: 'https://169.254.169.254/latest/meta-data' }),
  });

  const result = await resolveGoogleMapsUrl('https://maps.app.goo.gl/example', fetchImpl);
  assert.equal(result, 'https://maps.app.goo.gl/example');
});

test('follows allowed redirects manually', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: url.href, options });
    if (calls.length === 1) {
      return { status: 302, headers: new Headers({ location: 'https://www.google.com/maps/place/Kuramae' }) };
    }
    return { status: 200, headers: new Headers() };
  };

  assert.equal(
    await resolveGoogleMapsUrl('https://maps.app.goo.gl/example', fetchImpl),
    'https://www.google.com/maps/place/Kuramae'
  );
  assert.deepEqual(calls.map(({ options }) => options.redirect), ['manual', 'manual']);
});
