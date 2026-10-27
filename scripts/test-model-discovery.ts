import { normalizeBaseUrl, UpstreamError } from "../src/lib/ai/models";
import { encryptApiKey, decryptApiKey, maskApiKey } from "../src/lib/crypto";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("  BAGIAN III: MODEL DISCOVERY & SECURITY TESTS");
  console.log("==================================================");

  console.log("\n🧪 1. URL Normalization (PLAN.md Section 29.1)...");
  assert(
    normalizeBaseUrl("https://api.9router.com/v1") === "https://api.9router.com/v1",
    "Preserves /v1 suffix if already present"
  );
  assert(
    normalizeBaseUrl("https://api.deepseek.com") === "https://api.deepseek.com/v1",
    "Appends /v1 if missing"
  );
  assert(
    normalizeBaseUrl("http://localhost:20128/") === "http://localhost:20128/v1",
    "Handles trailing slash properly"
  );
  assert(
    normalizeBaseUrl("https://openrouter.ai/api/v1/") === "https://openrouter.ai/api/v1",
    "Preserves OpenRouter /api/v1 without double v1"
  );

  console.log("\n🧪 2. AES-256-GCM Encryption & Masking (PLAN.md Section 31)...");
  const testKey = "sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz";
  const encrypted = encryptApiKey(testKey);
  assert(encrypted !== testKey, "Encrypted key is not plaintext");
  assert(encrypted.includes(":"), "Encrypted string has iv:authTag:ciphertext format");
  
  const decrypted = decryptApiKey(encrypted);
  assert(decrypted === testKey, "Decrypted key matches original key perfectly");

  const masked = maskApiKey(testKey);
  assert(masked.endsWith("wxyz"), "Masked key reveals last 4 characters");
  assert(masked.startsWith("••••••••"), "Masked key hides internal secret");
  assert(!masked.includes("1234567890"), "Masked key contains no plaintext middle");

  console.log("\n🧪 3. UpstreamError Categorization (PLAN.md Section 29.1)...");
  const authErr = new UpstreamError("AUTH", "API key tidak valid", 401);
  assert(authErr.code === "AUTH", "AUTH error code correctly identified");
  assert(authErr.status === 401, "Status code attached");

  const notFoundErr = new UpstreamError("NOT_FOUND", "Endpoint tidak ditemukan", 404);
  assert(notFoundErr.code === "NOT_FOUND", "NOT_FOUND error code correctly identified");

  const modelErr = new UpstreamError("MODEL_INVALID", "Model tidak tersedia di gateway", 404);
  assert(modelErr.code === "MODEL_INVALID", "MODEL_INVALID error code correctly identified");

  console.log("\n--------------------------------------------------");
  console.log("📊 All Bagian III unit tests passed successfully!");
  console.log("--------------------------------------------------\n");
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
