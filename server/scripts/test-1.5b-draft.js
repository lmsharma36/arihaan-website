// Quick test of ai-draft endpoint with qwen2.5:1.5b
const https = require("https");
const http = require("http");

const TEST_TIMEOUT_MS = 780000; // 13 minutes

async function testAiDraft() {
  console.log("=== Testing ai-draft with qwen2.5:1.5b ===\n");

  const startTime = Date.now();

  try {
    // Step 1: Login
    console.log("Step 1: Logging in...");
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@arihaanenterprises.com",
        password: "admin123",
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log("✓ Login successful\n");

    // Step 2: Get first product
    console.log("Step 2: Fetching products...");
    const productsResponse = await fetch("http://localhost:5000/api/products", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const productsData = await productsResponse.json();
    const productId = productsData.products[0]._id;
    console.log(`✓ Got product ID: ${productId}\n`);

    // Step 3: Test ai-draft with simple text
    console.log("Step 3: Calling ai-draft endpoint...");
    console.log("Timeout: 780s (13 minutes)");
    console.log("Model: qwen2.5:1.5b\n");

    const draftStartTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    const draftResponse = await fetch(
      `http://localhost:5000/api/products/${productId}/ai-draft`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceText:
            "Safety Lanyard with energy absorber, webbing strap, maximum load 100kg, steel karabiner hooks, adjustable length.",
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    const draftElapsed = ((Date.now() - draftStartTime) / 1000).toFixed(1);

    if (!draftResponse.ok) {
      throw new Error(`ai-draft failed: ${draftResponse.status}`);
    }

    const draftData = await draftResponse.json();

    console.log("\n=== RESULTS ===");
    console.log(`Elapsed: ${draftElapsed}s`);
    console.log(`Used AI: ${draftData.usedAI}`);
    console.log(`Provider: ${draftData.provider}`);
    console.log(`Draft Name: ${draftData.draft?.name || "N/A"}`);

    if (draftData.warnings && draftData.warnings.length > 0) {
      console.log("\nWarnings:");
      draftData.warnings.forEach((w) => console.log(`  - ${w}`));
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nTotal test time: ${totalElapsed}s`);

    if (draftData.usedAI) {
      console.log("\n✅ SUCCESS: AI extraction worked!");
      process.exit(0);
    } else {
      console.log("\n❌ FAILED: Fell back to heuristic parser");
      process.exit(1);
    }
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ ERROR after ${elapsed}s:`);
    console.error(`Name: ${error.name}`);
    console.error(`Message: ${error.message}`);
    if (error.cause) {
      console.error(
        `Cause: ${error.cause.message || error.cause.code || error.cause}`,
      );
    }
    process.exit(1);
  }
}

testAiDraft();
