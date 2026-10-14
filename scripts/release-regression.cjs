const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const axios = require('axios');

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', source)(
    (name) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; },
    module, module.exports, false,
  );
  return module.exports;
}

async function run() {
  const { formatApiError, formatApiDetail } = load('src/utils/apiError.ts', {});
  assert.equal(formatApiDetail([{ loc: ['body', 'phone'], msg: 'Invalid phone' }]), 'phone: Invalid phone');
  assert.equal(formatApiError({ response: { status: 503, data: { detail: 'private stack trace' } } }), 'Our service is temporarily unavailable. Please try again shortly.');
  assert.match(formatApiError({ code: 'ECONNABORTED' }), /check My Rides/);
  assert.match(formatApiError({ code: 'ERR_NETWORK' }), /internet/);
  assert.equal(formatApiError(null, 'Try again'), 'Try again');

  let removed = 0, navigated = 0, refreshed = 0;
  const tokens = new Map([['access_token', 'old'], ['refresh_token', 'refresh']]);
  const storage = {
    getItem: async (key) => tokens.get(key) || null,
    setItem: async (key, value) => tokens.set(key, value),
    multiRemove: async () => { removed++; tokens.clear(); },
  };
  const api = load('src/api/client.ts', {
    axios, '../config': { API_CONFIG: { BASE_URL: 'https://api.jktaxitamilnadu.com', TIMEOUT: 30000 } },
    'expo-router': { router: { replace: () => navigated++ } }, '../utils/storage': storage,
    '../services/connectivity': { connectivity: { noteReachable() {}, noteUnreachable() {} } },
  }).default;
  const originalPost = axios.post;
  function reject401(config) {
    throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401, data: {}, config });
  }
  api.defaults.adapter = async (config) => {
    if (config.headers.Authorization !== 'Bearer new') reject401(config);
    return { status: 200, data: { ok: true }, config, headers: {}, statusText: 'OK' };
  };
  try {
    axios.post = async (_url, _data, config) => {
      refreshed++;
      assert.equal(config.timeout, 30000);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { access_token: 'new', refresh_token: 'rotated' } };
    };
    const responses = await Promise.all([api.get('/api/user/profile'), api.get('/api/v2/bookings/active')]);
    assert.equal(responses.length, 2);
    assert.equal(refreshed, 1, 'Concurrent requests should share one refresh');
    assert.equal(removed, 0);

    tokens.set('access_token', 'expired');
    axios.post = async () => { throw new axios.AxiosError('Network Error', 'ERR_NETWORK'); };
    await assert.rejects(api.get('/api/user/profile'));
    assert.equal(removed, 0, 'An offline refresh must preserve the saved session');
    assert.equal(tokens.get('refresh_token'), 'rotated');

    refreshed = 0;
    axios.post = async () => { refreshed++; return { data: {} }; };
    api.defaults.adapter = async (config) => reject401(config);
    await assert.rejects(api.post('/api/auth/verify-otp', {}));
    assert.equal(refreshed, 0, 'An incorrect OTP must not trigger token refresh');

    axios.post = async () => { throw new axios.AxiosError('Expired refresh', 'ERR_BAD_REQUEST', undefined, null, { status: 401 }); };
    await assert.rejects(api.get('/api/user/profile'));
    assert.equal(removed, 1);
    assert.equal(navigated, 1);
  } finally { axios.post = originalPost; }
  const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_API_URL, 'https://api.jktaxitamilnadu.com');
  for (const profile of Object.values(eas.build)) {
    assert.ok(Object.values(profile.env || {}).every((value) => !value.startsWith('@')), 'No unresolved token placeholders');
  }
  console.log('Release regressions passed: API error messages, refresh concurrency, offline session retention, OTP failures, rejected sessions, and production API/build configuration.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
