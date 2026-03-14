const fs = require("fs");
(async () => {
  const base = "http://localhost:5000";
  const out = { base, steps: [] };
  const push = (step, data) => out.steps.push({ step, ...data });
  try {
    const rootRes = await fetch(`${base}/`);
    push("root", { status: rootRes.status });
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@arihaanenterprises.com", password: "admin123" }),
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    push("login", { status: loginRes.status, ok: loginRes.ok, hasToken: Boolean(loginBody?.token) });
    if (!loginBody?.token) throw new Error("Login failed");
    const productsRes = await fetch(`${base}/api/products`);
    const productsBody = await productsRes.json().catch(() => ({}));
    const productId = productsBody?.products?.[0]?._id;
    push("products", { status: productsRes.status, hasProductId: Boolean(productId) });
    if (!productId) throw new Error("No productId available");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${loginBody.token}` };
    const imagesRes = await fetch(`${base}/api/products/${productId}/images`, { method: "PUT", headers, body: JSON.stringify({ images: ["/uploads/test.jpg"] }) });
    const imagesText = await imagesRes.text();
    push("put_images", { status: imagesRes.status, ok: imagesRes.ok, bodyPreview: imagesText.slice(0, 220) });
    const datasheetRes = await fetch(`${base}/api/products/${productId}/datasheet`, { method: "PUT", headers, body: JSON.stringify({ datasheet: "/uploads/test.pdf" }) });
    const datasheetText = await datasheetRes.text();
    push("put_datasheet", { status: datasheetRes.status, ok: datasheetRes.ok, bodyPreview: datasheetText.slice(0, 220) });
  } catch (error) {
    out.error = { name: error?.name, message: error?.message };
  }
  fs.writeFileSync(".tmp_fetch_diag.json", JSON.stringify(out, null, 2));
})();
