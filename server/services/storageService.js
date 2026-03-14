const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const LOCAL_UPLOAD_ROOT = path.join(__dirname, "../public/uploads");

const MIME_TO_EXTENSION = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const asTrimmedString = (value = "") => String(value || "").trim();

const normalizeBaseUrl = (value = "") =>
  asTrimmedString(value).replace(/\/+$/, "");

const normalizeR2Endpoint = (value = "") => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
};

const normalizePathSegment = (value = "") =>
  asTrimmedString(value)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const sanitizeFileBaseName = (originalName = "") => {
  const basename = path.basename(
    String(originalName || ""),
    path.extname(String(originalName || "")),
  );
  const cleaned = basename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return cleaned || "file";
};

const resolveFileExtension = (originalName = "", mimetype = "") => {
  const extFromName = path.extname(String(originalName || "")).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/i.test(extFromName)) {
    return extFromName;
  }

  const fromMime = MIME_TO_EXTENSION[String(mimetype || "").toLowerCase()];
  return fromMime || "";
};

const resolveMimeType = (
  filePath = "",
  fallback = "application/octet-stream",
) => {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  return EXTENSION_TO_MIME[ext] || fallback;
};

const encodeObjectKeyForUrl = (objectKey = "") =>
  String(objectKey || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildR2PublicUrl = (baseUrl = "", objectKey = "") => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const encodedKey = encodeObjectKeyForUrl(objectKey);

  if (!normalizedBaseUrl || !encodedKey) {
    return "";
  }

  return `${normalizedBaseUrl}/${encodedKey}`;
};

const getR2Config = () => {
  const accountId =
    asTrimmedString(process.env.R2_ACCOUNT_ID) ||
    asTrimmedString(process.env.CF_R2_ACCOUNT_ID);
  const endpointFromEnv =
    asTrimmedString(process.env.R2_ENDPOINT) ||
    asTrimmedString(process.env.CF_R2_ENDPOINT);
  const endpoint = endpointFromEnv
    ? normalizeR2Endpoint(endpointFromEnv)
    : accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : "";

  const accessKeyId =
    asTrimmedString(process.env.R2_ACCESS_KEY_ID) ||
    asTrimmedString(process.env.CF_R2_ACCESS_KEY_ID);
  const secretAccessKey =
    asTrimmedString(process.env.R2_SECRET_ACCESS_KEY) ||
    asTrimmedString(process.env.CF_R2_SECRET_ACCESS_KEY);
  const bucket =
    asTrimmedString(process.env.R2_BUCKET) ||
    asTrimmedString(process.env.CF_R2_BUCKET);
  const publicBaseUrl = normalizeBaseUrl(
    asTrimmedString(process.env.R2_PUBLIC_BASE_URL) ||
      asTrimmedString(process.env.CF_R2_PUBLIC_BASE_URL),
  );
  const keyPrefix =
    normalizePathSegment(asTrimmedString(process.env.R2_KEY_PREFIX)) ||
    normalizePathSegment(asTrimmedString(process.env.CF_R2_KEY_PREFIX)) ||
    "uploads";

  return {
    accountId,
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    keyPrefix,
  };
};

const getMissingR2ConfigKeys = () => {
  const config = getR2Config();
  const missing = [];

  if (!config.endpoint) missing.push("R2_ENDPOINT or R2_ACCOUNT_ID");
  if (!config.bucket) missing.push("R2_BUCKET");
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!config.publicBaseUrl) missing.push("R2_PUBLIC_BASE_URL");

  return missing;
};

const isR2Configured = () => getMissingR2ConfigKeys().length === 0;

const getStorageProvider = () => {
  const requested = asTrimmedString(
    process.env.ASSET_STORAGE_PROVIDER,
  ).toLowerCase();

  if (requested === "r2") {
    return "r2";
  }

  if (requested === "local") {
    return "local";
  }

  return isR2Configured() ? "r2" : "local";
};

const ensureR2Configured = () => {
  const missing = getMissingR2ConfigKeys();

  if (missing.length > 0) {
    throw new Error(
      `Cloudflare R2 is not fully configured. Missing: ${missing.join(", ")}`,
    );
  }
};

let r2Client = null;
let r2ClientSignature = "";

const getR2Client = () => {
  ensureR2Configured();
  const config = getR2Config();
  const signature = `${config.endpoint}|${config.accessKeyId}|${config.bucket}`;

  if (r2Client && r2ClientSignature === signature) {
    return r2Client;
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  r2ClientSignature = signature;

  return r2Client;
};

const createUniqueName = (originalName = "", mimetype = "") => {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const baseName = sanitizeFileBaseName(originalName);
  const extension = resolveFileExtension(originalName, mimetype);
  return `${suffix}-${baseName}${extension}`;
};

const buildR2ObjectKey = ({
  folder = "products",
  originalName = "",
  mimetype = "",
} = {}) => {
  const config = getR2Config();
  const safeFolder = normalizePathSegment(folder);
  const fileName = createUniqueName(originalName, mimetype);

  return [config.keyPrefix, safeFolder, fileName].filter(Boolean).join("/");
};

const ensureLocalUploadRoot = async () => {
  await fs.promises.mkdir(LOCAL_UPLOAD_ROOT, { recursive: true });
};

const uploadBufferToLocal = async (
  {
    buffer,
    originalName = "",
    mimetype = "application/octet-stream",
    size = 0,
  } = {},
  { folder = "products" } = {},
) => {
  await ensureLocalUploadRoot();

  const fileName = createUniqueName(
    `${normalizePathSegment(folder).replace(/\//g, "-")}-${originalName}`,
    mimetype,
  );
  const absolutePath = path.join(LOCAL_UPLOAD_ROOT, fileName);
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    provider: "local",
    key: fileName,
    filename: fileName,
    url: `/uploads/${encodeURIComponent(fileName)}`,
    mimetype,
    size,
    uploadedAt: new Date().toISOString(),
  };
};

const uploadBufferToR2 = async (
  {
    buffer,
    originalName = "",
    mimetype = "application/octet-stream",
    size = 0,
  } = {},
  { folder = "products" } = {},
) => {
  ensureR2Configured();

  const config = getR2Config();
  const objectKey = buildR2ObjectKey({ folder, originalName, mimetype });
  const contentType =
    asTrimmedString(mimetype) ||
    resolveMimeType(originalName, "application/octet-stream");

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = buildR2PublicUrl(config.publicBaseUrl, objectKey);

  return {
    provider: "r2",
    key: objectKey,
    filename: path.basename(objectKey),
    url,
    mimetype: contentType,
    size,
    uploadedAt: new Date().toISOString(),
  };
};

const uploadMediaFile = async (file = {}, options = {}) => {
  const {
    buffer,
    originalname,
    mimetype = "application/octet-stream",
    size = 0,
  } = file;

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Upload payload is missing file buffer");
  }

  const provider = getStorageProvider();

  if (provider === "r2") {
    return uploadBufferToR2(
      {
        buffer,
        originalName: originalname,
        mimetype,
        size,
      },
      options,
    );
  }

  return uploadBufferToLocal(
    {
      buffer,
      originalName: originalname,
      mimetype,
      size,
    },
    options,
  );
};

const isAbsoluteHttpUrl = (value = "") =>
  /^https?:\/\//i.test(asTrimmedString(value));

const extractLegacyUploadRelativePath = (value = "") => {
  const rawValue = asTrimmedString(value);
  if (!rawValue) return "";

  let pathname = rawValue;
  let absoluteHost = "";
  if (isAbsoluteHttpUrl(rawValue)) {
    try {
      const parsedUrl = new URL(rawValue);
      pathname = parsedUrl.pathname || "";
      absoluteHost = asTrimmedString(parsedUrl.hostname).toLowerCase();
    } catch (error) {
      pathname = rawValue;
    }
  }

  if (absoluteHost) {
    try {
      const r2PublicHost = asTrimmedString(
        new URL(getR2Config().publicBaseUrl || "").hostname,
      ).toLowerCase();

      if (r2PublicHost && absoluteHost === r2PublicHost) {
        return "";
      }
    } catch (error) {
      // ignore URL parsing errors and continue legacy detection
    }
  }

  const normalized = pathname.replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);

  const relativePath =
    markerIndex >= 0
      ? normalized.slice(markerIndex + marker.length).replace(/^\/+/, "")
      : normalized.toLowerCase().startsWith("uploads/")
        ? normalized.slice("uploads/".length).replace(/^\/+/, "")
        : "";

  if (!relativePath) return "";

  try {
    return decodeURIComponent(relativePath);
  } catch (error) {
    return relativePath;
  }
};

const isLegacyUploadUrl = (value = "") =>
  Boolean(extractLegacyUploadRelativePath(value));

const resolveLegacyUploadAbsolutePath = (value = "") => {
  const relativePath = extractLegacyUploadRelativePath(value);
  if (!relativePath) return "";

  const normalizedRelativePath = normalizePathSegment(relativePath).replace(
    /\.\.+/g,
    "",
  );
  return path.join(LOCAL_UPLOAD_ROOT, normalizedRelativePath);
};

const uploadFileFromDiskToR2 = async (
  filePath,
  { folder = "products", originalName = "" } = {},
) => {
  ensureR2Configured();

  const absoluteFilePath = path.resolve(String(filePath || ""));
  const fileBuffer = await fs.promises.readFile(absoluteFilePath);
  const stats = await fs.promises.stat(absoluteFilePath);
  const resolvedName = originalName || path.basename(absoluteFilePath);
  const mimetype = resolveMimeType(absoluteFilePath);

  return uploadBufferToR2(
    {
      buffer: fileBuffer,
      originalName: resolvedName,
      mimetype,
      size: stats.size,
    },
    { folder },
  );
};

module.exports = {
  LOCAL_UPLOAD_ROOT,
  getStorageProvider,
  getR2Config,
  isR2Configured,
  ensureR2Configured,
  uploadMediaFile,
  uploadFileFromDiskToR2,
  isAbsoluteHttpUrl,
  isLegacyUploadUrl,
  resolveLegacyUploadAbsolutePath,
};
