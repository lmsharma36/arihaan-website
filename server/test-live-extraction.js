// Test actual AI extraction with minimal source text
const BASE_URL = "http://localhost:5000";

async function testExtraction() {
  console.log("🔍 Testing AI Extraction Endpoint\n");

  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@arihaanenterprises.com",
      password: "admin123",
    }),
  });

  const login = await loginRes.json();
  if (!login.token) {
    throw new Error("Login failed");
  }
  console.log("✅ Login successful\n");

  // Get first product
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const products = await productsRes.json();
  const productId = products?.products?.[0]?._id;

  if (!productId) {
    throw new Error("No products found");
  }
  console.log(`✅ Product ID: ${productId}\n`);

  // Test AI extraction
  console.log("🧠 Starting AI extraction...\n");
  const startTime = Date.now();

  // Simulate form data using URLSearchParams for simpler test
  const body = new URLSearchParams();
  body.append(
    "sourceText",
    "Product: Safety Lanyard. Brand: Karam. Model: PN-123.",
  );

  const draftRes = await fetch(
    `${BASE_URL}/api/products/${productId}/ai-draft`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${login.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  const result = await draftRes.json();
  const elapsedMs = Date.now() - startTime;

  console.log(
    `⏱️  Elapsed time: ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s)\n`,
  );
  console.log(`Status: ${draftRes.status}\n`);

  if (result.success) {
    console.log("✅ SUCCESS!");
    console.log(`   usedAI: ${result.usedAI}`);
    console.log(`   provider: ${result.provider}`);
    console.log(`   model: ${result.model}`);
    console.log(`   warnings: ${result.warnings?.length || 0}`);

    if (result.warnings && result.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      result.warnings.forEach((w) => console.log(`   - ${w}`));
    }
  } else {
    console.log("❌ FAILED!");
    console.log(`   message: ${result.message}`);
  }
}

testExtraction().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});
