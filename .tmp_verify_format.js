const base = "http://localhost:5000";
(async () => {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@arihaanenterprises.com",
      password: "admin123",
    }),
  });
  const login = await loginRes.json();
  if (!login?.token) throw new Error("Login failed");

  const productsRes = await fetch(`${base}/api/products`);
  const products = await productsRes.json();
  const productId = products?.products?.[0]?._id;

  const fd = new FormData();
  fd.append(
    "sourceText",
    [
      "Product Name: safety lanyard",
      "Brand: karam",
      "Category: fall protection",
      "Lanyard Length: 1.8 m",
      "Webbing Width: 45 mm",
      "Breaking Strength: 22 kn",
      "Max Load: 140 kg",
      "Hook Type: scaffolding hook",
      "Hook Model: SH-60 scaffolding hook",
    ].join("\n"),
  );

  const res = await fetch(`${base}/api/products/${productId}/ai-draft`, {
    method: "POST",
    headers: { Authorization: `Bearer ${login.token}` },
    body: fd,
    signal: AbortSignal.timeout(180000),
  });
  const body = await res.json();

  const draft = body?.draft || body?.data || body?.extraction?.draft || {};
  const specs = draft?.specifications || {};

  console.log("status=", res.status);
  console.log("usedAI=", body?.extraction?.usedAI);
  console.log("warnings=", JSON.stringify(body?.extraction?.warnings || []));
  console.log("name=", draft?.name);
  console.log("brand=", draft?.brand);
  console.log("connectors=", JSON.stringify(specs.connectors || {}));
  console.log("dimensions=", JSON.stringify(specs.dimensions || {}));
  console.log("physical=", JSON.stringify(specs.physical_performance || {}));
})().catch((error) => {
  console.error("error=", error?.message || String(error));
  process.exit(1);
});
