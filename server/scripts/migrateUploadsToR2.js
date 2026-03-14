const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/database");
const Product = require("../models/Product");
const {
  ensureR2Configured,
  isLegacyUploadUrl,
  resolveLegacyUploadAbsolutePath,
  uploadFileFromDiskToR2,
} = require("../services/storageService");

dotenv.config();

const APPLY_CHANGES = process.argv.includes("--apply");

const fileExists = async (filePath = "") => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};

const asString = (value = "") => String(value || "").trim();

const migrateAssetUrl = async (
  sourceUrl,
  {
    apply = false,
    folder = "products/images",
    cache = new Map(),
    counters,
  } = {},
) => {
  const originalUrl = asString(sourceUrl);
  if (!isLegacyUploadUrl(originalUrl)) {
    return {
      changed: false,
      nextUrl: originalUrl,
    };
  }

  const localPath = resolveLegacyUploadAbsolutePath(originalUrl);
  if (!localPath) {
    counters.skipped += 1;
    return {
      changed: false,
      nextUrl: originalUrl,
    };
  }

  const absolutePath = path.resolve(localPath);
  const exists = await fileExists(absolutePath);
  if (!exists) {
    counters.missingLocalFiles += 1;
    return {
      changed: false,
      nextUrl: originalUrl,
    };
  }

  counters.legacyAssetsDetected += 1;

  if (!apply) {
    counters.wouldMigrate += 1;
    return {
      changed: false,
      nextUrl: originalUrl,
    };
  }

  const cacheKey = `${folder}|${absolutePath}`;
  if (cache.has(cacheKey)) {
    counters.migratedFromCache += 1;
    return {
      changed: true,
      nextUrl: cache.get(cacheKey),
    };
  }

  try {
    const uploadResult = await uploadFileFromDiskToR2(absolutePath, {
      folder,
      originalName: path.basename(absolutePath),
    });

    const nextUrl = asString(uploadResult?.url);
    if (!nextUrl) {
      counters.failedUploads += 1;
      return {
        changed: false,
        nextUrl: originalUrl,
      };
    }

    cache.set(cacheKey, nextUrl);
    counters.uploadedToR2 += 1;

    return {
      changed: true,
      nextUrl,
    };
  } catch (error) {
    counters.failedUploads += 1;
    return {
      changed: false,
      nextUrl: originalUrl,
      error,
    };
  }
};

const run = async () => {
  ensureR2Configured();
  await connectDB();

  const counters = {
    productsTotal: 0,
    productsWithLegacyAssets: 0,
    productsUpdated: 0,
    legacyAssetsDetected: 0,
    wouldMigrate: 0,
    uploadedToR2: 0,
    migratedFromCache: 0,
    failedUploads: 0,
    missingLocalFiles: 0,
    skipped: 0,
  };

  const cache = new Map();

  const products = await Product.find(
    {},
    { _id: 1, name: 1, slug: 1, images: 1, datasheet: 1 },
  ).lean();
  counters.productsTotal = products.length;

  console.log(`[media-migration] Mode: ${APPLY_CHANGES ? "APPLY" : "DRY-RUN"}`);
  console.log(`[media-migration] Products scanned: ${products.length}`);

  for (const product of products) {
    const currentImages = Array.isArray(product?.images) ? product.images : [];
    const currentDatasheet = asString(product?.datasheet);

    let hasLegacyAsset = false;
    let hasProductChanges = false;

    const nextImages = [];
    for (const imageEntry of currentImages) {
      if (typeof imageEntry !== "string") {
        nextImages.push(imageEntry);
        continue;
      }

      const migrated = await migrateAssetUrl(imageEntry, {
        apply: APPLY_CHANGES,
        folder: "products/images",
        cache,
        counters,
      });

      if (isLegacyUploadUrl(imageEntry)) {
        hasLegacyAsset = true;
      }

      if (migrated.changed) {
        hasProductChanges = true;
      }

      nextImages.push(migrated.nextUrl || imageEntry);
    }

    let nextDatasheet = currentDatasheet;
    if (currentDatasheet) {
      const migratedDatasheet = await migrateAssetUrl(currentDatasheet, {
        apply: APPLY_CHANGES,
        folder: "products/datasheets",
        cache,
        counters,
      });

      if (isLegacyUploadUrl(currentDatasheet)) {
        hasLegacyAsset = true;
      }

      if (migratedDatasheet.changed) {
        hasProductChanges = true;
      }

      nextDatasheet = migratedDatasheet.nextUrl || currentDatasheet;
    }

    if (hasLegacyAsset) {
      counters.productsWithLegacyAssets += 1;
    }

    if (APPLY_CHANGES && hasProductChanges) {
      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            images: nextImages,
            datasheet: nextDatasheet,
          },
        },
      );
      counters.productsUpdated += 1;
    }
  }

  console.log("[media-migration] Summary:");
  console.log(`  - productsTotal: ${counters.productsTotal}`);
  console.log(
    `  - productsWithLegacyAssets: ${counters.productsWithLegacyAssets}`,
  );
  console.log(`  - legacyAssetsDetected: ${counters.legacyAssetsDetected}`);
  console.log(`  - uploadedToR2: ${counters.uploadedToR2}`);
  console.log(`  - migratedFromCache: ${counters.migratedFromCache}`);
  console.log(`  - productsUpdated: ${counters.productsUpdated}`);
  console.log(`  - failedUploads: ${counters.failedUploads}`);
  console.log(`  - missingLocalFiles: ${counters.missingLocalFiles}`);
  console.log(`  - skipped: ${counters.skipped}`);

  if (!APPLY_CHANGES) {
    console.log(
      `  - wouldMigrate (existing local files): ${counters.wouldMigrate}`,
    );
    console.log(
      "[media-migration] Re-run with --apply to upload files and update product URLs.",
    );
  }
};

run()
  .catch((error) => {
    console.error("[media-migration] Failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      // ignore close errors
    }
  });
