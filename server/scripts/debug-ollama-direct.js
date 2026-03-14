require("dotenv").config();

const productDraftService = require("../services/productDraftService");

async function main() {
  const startedAt = Date.now();
  console.log("Starting direct Ollama service test...");

  const messages = [
    {
      role: "system",
      content:
        "Extract product data from text and return valid JSON with keys name, brand, category, specifications.",
    },
    {
      role: "user",
      content: [
        "Product Name: Safety Lanyard",
        "Brand: Karam",
        "Category: Fall Protection",
        "Material: Polyester",
        "Length: 1.8m",
        "Breaking Strength: 22kN",
      ].join("\n"),
    },
  ];

  try {
    const result = await productDraftService.requestJsonFromOllama(
      messages,
      "text",
    );
    console.log("SUCCESS");
    console.log("provider=", result.provider);
    console.log("model=", result.model);
    console.log("elapsedMs=", Date.now() - startedAt);
    console.log("draftKeys=", Object.keys(result.draft || {}));
    console.log(
      "draftPreview=",
      JSON.stringify(result.draft || {}, null, 2).slice(0, 1200),
    );
  } catch (error) {
    console.log("FAILED");
    console.log("elapsedMs=", Date.now() - startedAt);
    console.log("name=", error?.name);
    console.log("statusCode=", error?.statusCode);
    console.log("message=", error?.message);
    console.log("isOllamaTimeout=", Boolean(error?.isOllamaTimeout));
    console.log(
      "isOllamaConnectionError=",
      Boolean(error?.isOllamaConnectionError),
    );
    console.log(
      "isOllamaTransientServerError=",
      Boolean(error?.isOllamaTransientServerError),
    );
    console.log("ollamaStatus=", error?.ollamaStatus);
    process.exit(1);
  }
}

main();
