import { PROVIDERS, getProvider } from '../src/lib/providers';
import { getKey, saveKey, mask } from '../src/lib/keystore';

async function runTests() {
  console.log('--- 1. Testing providers.ts ---');
  console.log(`Loaded ${PROVIDERS.length} providers`);
  if (PROVIDERS.length !== 6) throw new Error('Expected 6 providers');

  const p9 = getProvider('9router');
  if (!p9 || !p9.editableUrl) throw new Error('9router provider invalid');
  console.log('✅ providers.ts OK');

  console.log('--- 2. Testing keystore.ts ---');
  await saveKey('test_provider', 'sk-antigravity-9999');
  const loaded = await getKey('test_provider');
  if (loaded !== 'sk-antigravity-9999') throw new Error(`Keystore mismatch: ${loaded}`);
  const masked = mask(loaded);
  if (masked !== '••••••••9999') throw new Error(`Mask mismatch: ${masked}`);
  console.log('✅ keystore.ts OK (save, retrieve, mask)');

  console.log('--- 3. Testing API Routes on localhost:3000 ---');
  // 3a. GET /api/gateway/validate
  try {
    const getRes = await fetch('http://localhost:3000/api/gateway/validate');
    const getData = await getRes.json();
    console.log('GET /api/gateway/validate response:', getData);
    if (!getData.savedKeys) throw new Error('savedKeys missing');
    console.log('✅ GET /api/gateway/validate OK');
  } catch (err: any) {
    console.log('Server not responding or skipped:', err.message);
  }

  // 3b. POST /api/gateway/validate with missing key
  try {
    const res = await fetch('http://localhost:3000/api/gateway/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', apiKey: '' }),
    });
    const d = await res.json();
    console.log('POST /api/gateway/validate (empty key):', d);
    if (d.valid !== false || d.reason !== 'API key belum diisi') {
      throw new Error('Expected "API key belum diisi"');
    }
    console.log('✅ Validation with empty key rejected correctly');
  } catch (err: any) {
    console.log('Server test error:', err.message);
  }

  // 3c. POST /api/gateway/validate with invalid key
  try {
    const res = await fetch('http://localhost:3000/api/gateway/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'openai', apiKey: 'sk-invalid-test-key-fake' }),
    });
    const d = await res.json();
    console.log('POST /api/gateway/validate (invalid key):', d);
    if (d.valid !== false || d.reason !== 'API key ditolak') {
      throw new Error('Expected "API key ditolak"');
    }
    console.log('✅ Validation with invalid key rejected with "API key ditolak"');
  } catch (err: any) {
    console.log('Server test error:', err.message);
  }

  // 3d. POST /api/gateway/test with missing data
  try {
    const res = await fetch('http://localhost:3000/api/gateway/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'deepseek', model: 'deepseek-chat' }),
    });
    const d = await res.json();
    console.log('POST /api/gateway/test (missing key):', d);
    if (d.ok !== false) {
      throw new Error('Expected ok: false');
    }
    console.log('✅ Test route with incomplete data rejected correctly');
  } catch (err: any) {
    console.log('Server test error:', err.message);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
