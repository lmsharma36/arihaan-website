const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const Product = require("../models/Product");

dotenv.config();

const shouldApply = process.argv.includes("--apply");

const needsBackfillQuery = {
  $or: [
    { certification: { $exists: false } },
    { specifications: { $exists: false } },
    { certification: null },
    { specifications: null },
    { $expr: { $not: { $isArray: "$certification" } } },
    { $expr: { $ne: [{ $type: "$specifications" }, "object"] } },
  ],
};

const updatePipeline = [
  {
    $set: {
      certification: {
        $switch: {
          branches: [
            {
              case: { $isArray: "$certification" },
              then: "$certification",
            },
            {
              case: { $eq: [{ $type: "$certification" }, "string"] },
              then: ["$certification"],
            },
          ],
          default: [],
        },
      },
      specifications: {
        $cond: [
          { $eq: [{ $type: "$specifications" }, "object"] },
          "$specifications",
          {},
        ],
      },
    },
  },
];

const run = async () => {
  try {
    await connectDB();

    const matchedCount = await Product.countDocuments(needsBackfillQuery);
    const sample = await Product.find(needsBackfillQuery)
      .select("_id sku name certification specifications")
      .limit(5)
      .lean();

    console.log(`\nProducts needing backfill: ${matchedCount}`);
    if (sample.length > 0) {
      console.log("Sample impacted docs:");
      sample.forEach((doc, index) => {
        console.log(
          `${index + 1}. ${doc._id} | ${doc.sku || "N/A"} | ${doc.name || "N/A"}`,
        );
      });
    }

    if (!shouldApply) {
      console.log("\nDry run complete. No data changed.");
      console.log("Run with --apply to perform the migration.");
      return;
    }

    const result = await Product.updateMany(needsBackfillQuery, updatePipeline);

    console.log("\nBackfill applied successfully.");
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);

    const remainingCount = await Product.countDocuments(needsBackfillQuery);
    console.log(`Remaining needing backfill: ${remainingCount}\n`);
  } catch (error) {
    console.error("\nBackfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
