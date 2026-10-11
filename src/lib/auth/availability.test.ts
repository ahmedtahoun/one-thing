/**
 * Which provider can sign someone in, and why not when it cannot.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { anyProviderReady, availability, type AuthEnvironment } from './availability';

const env = (over: Partial<AuthEnvironment> = {}): AuthEnvironment => ({
  backend: true,
  platform: 'ios',
  googleWebClientId: 'web.apps.googleusercontent.com',
  googleIosClientId: 'ios.apps.googleusercontent.com',
  ...over,
});

describe('provider availability', () => {
  it('needs a backend before anything else', () => {
    // Not "not-configured": the client IDs are beside the point with nowhere
    // to exchange a token.
    assert.equal(availability('apple', env({ backend: false })), 'no-backend');
    assert.equal(availability('google', env({ backend: false, googleWebClientId: undefined })), 'no-backend');
    assert.equal(anyProviderReady(env({ backend: false })), false);
  });

  it('offers Apple on iOS only', () => {
    assert.equal(availability('apple', env()), 'ready');
    assert.equal(availability('apple', env({ platform: 'android' })), 'wrong-platform');
    assert.equal(availability('apple', env({ platform: 'web' })), 'wrong-platform');
  });

  it('runs neither provider on web, where the harness renders', () => {
    const web = env({ platform: 'web' });
    assert.equal(availability('apple', web), 'wrong-platform');
    assert.equal(availability('google', web), 'wrong-platform');
    assert.equal(anyProviderReady(web), false);
  });

  it('wants the web client ID on both phones, and the iOS one on iOS', () => {
    assert.equal(availability('google', env({ googleWebClientId: undefined })), 'not-configured');
    assert.equal(availability('google', env({ googleIosClientId: undefined })), 'not-configured');
    // Android does not need an iOS client.
    assert.equal(availability('google', env({ platform: 'android', googleIosClientId: undefined })), 'ready');
  });

  it('says ready when everything is in place', () => {
    assert.equal(availability('google', env()), 'ready');
    assert.equal(anyProviderReady(env({ platform: 'android' })), true);
  });
});
