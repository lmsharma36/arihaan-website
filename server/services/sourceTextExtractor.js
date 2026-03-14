const DEFAULT_MAX_TEXT_CHARS = 18000;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const trimTo = (value = "", maxChars = DEFAULT_MAX_TEXT_CHARS) =>
  String(value || "")
    .split("\u0000")
    .join("")
    .trim()
    .slice(0, maxChars);

const isIgnorablePdfFontWarning = (args = []) => {
  const message = args
    .map((item) => (typeof item === "string" ? item : String(item || "")))
    .join(" ")
    .trim();

  return /warning:\s*tt:\s*undefined function:\s*\d+/i.test(message);
};

class SourceTextExtractor {
  constructor({ maxTextChars = DEFAULT_MAX_TEXT_CHARS } = {}) {
    this.maxTextChars = maxTextChars;
    this.pdfParse = null;
    this.tesseract = null;
  }

  getPdfParser() {
    if (this.pdfParse) {
      return this.pdfParse;
    }

    try {
      this.pdfParse = require("pdf-parse");
      return this.pdfParse;
    } catch (error) {
      throw createHttpError(
        500,
        "pdf-parse dependency is missing. Run npm install in server folder.",
      );
    }
  }

  getTesseract() {
    if (this.tesseract) {
      return this.tesseract;
    }

    try {
      this.tesseract = require("tesseract.js");
      return this.tesseract;
    } catch (error) {
      throw createHttpError(
        500,
        "tesseract.js dependency is missing. Run npm install in server folder.",
      );
    }
  }

  hasPdfParser() {
    try {
      this.getPdfParser();
      return true;
    } catch (error) {
      return false;
    }
  }

  async extractTextFromPdfBuffer(buffer) {
    const pdfParse = this.getPdfParser();
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.warn = (...args) => {
      if (isIgnorablePdfFontWarning(args)) return;
      originalWarn(...args);
    };

    console.log = (...args) => {
      if (isIgnorablePdfFontWarning(args)) return;
      originalLog(...args);
    };

    try {
      const parsed = await pdfParse(buffer, { verbosityLevel: 0 });
      return trimTo(parsed?.text || "", this.maxTextChars);
    } finally {
      console.warn = originalWarn;
      console.log = originalLog;
    }
  }

  async extractTextFromImageBuffer(buffer) {
    if (!buffer) return "";

    const Tesseract = this.getTesseract();
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: () => {},
    });

    try {
      const result = await worker.recognize(buffer);
      return trimTo(result?.data?.text || "", this.maxTextChars);
    } finally {
      await worker.terminate();
    }
  }

  decodeTextFile(buffer) {
    return trimTo(buffer.toString("utf8"), this.maxTextChars);
  }
}

module.exports = SourceTextExtractor;
