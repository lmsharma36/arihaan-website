const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TEST_TIMEOUT_MS = Number.parseInt(
  process.env.TEST_TIMEOUT_MS || "900000",
  10,
);

async function main() {
  const startedAt = Date.now();

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@arihaanenterprises.com",
      password: "admin123",
    }),
  });
  const login = await loginRes.json();

  if (!loginRes.ok || !login?.token) {
    throw new Error(`Login failed: ${JSON.stringify(login)}`);
  }

  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const products = await productsRes.json();
  const productId = products?.products?.[0]?._id;

  if (!productId) {
    throw new Error("No product found for test run.");
  }

  const formData = new FormData();
  formData.append(
    "sourceText",
    "Product Name: Safety Lanyard. Brand: Karam. Category: fall-protection. Model: PN-123.",
  );

  const draftRes = await fetch(
    `${BASE_URL}/api/products/${productId}/ai-draft`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${login.token}`,
      },
      body: formData,
      signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
    },
  );

  const rawBody = await draftRes.text();

  console.log(`status=${draftRes.status}`);
  console.log(`elapsedMs=${Date.now() - startedAt}`);
  console.log(`body=${rawBody.slice(0, 1600)}`);
}

main().catch((error) => {
  const details = {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    causeMessage: error?.cause?.message,
    causeCode: error?.cause?.code,
  };

  console.error(JSON.stringify(details, null, 2));
  process.exit(1);
});
