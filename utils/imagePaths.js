const path = require("path");

const DEFAULT_IMAGE_PATH = "assets/images/default.png";

function getUploadRelativePath(fileName = "") {
  const safeName = path.basename(String(fileName || "").trim());
  return safeName ? `uploads/${safeName}` : "";
}

function normalizeStoredImagePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/\\/g, "/");

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      const pathname = parsed.pathname || "";
      if (pathname.includes("/uploads/")) {
        return pathname.substring(pathname.indexOf("/uploads/") + 1);
      }
      if (pathname.includes("/assets/")) {
        return pathname.substring(pathname.indexOf("/assets/") + 1);
      }
      return normalized;
    } catch (_err) {
      return normalized;
    }
  }

  if (normalized.startsWith("file:///") || /^[A-Za-z]:\//.test(normalized)) {
    return getUploadRelativePath(normalized.split("/").pop());
  }

  if (normalized.includes("/uploads/")) {
    return normalized.substring(normalized.indexOf("/uploads/") + 1);
  }

  if (normalized.includes("/assets/")) {
    return normalized.substring(normalized.indexOf("/assets/") + 1);
  }

  if (normalized.startsWith("uploads/")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/")) {
    return normalized.replace(/^\/+/, "");
  }

  if (normalized.startsWith("assets/")) {
    return normalized;
  }

  if (normalized.startsWith("/assets/")) {
    return normalized.replace(/^\/+/, "");
  }

  if (normalized.startsWith("../assets/") || normalized.startsWith("./assets/")) {
    return normalized.replace(/^(\.\.\/|\.\/)+/, "");
  }

  const fileName = path.basename(normalized);
  return fileName ? getUploadRelativePath(fileName) : normalized;
}

function buildPublicFileUrl(req, storedPath) {
  const normalized = normalizeStoredImagePath(storedPath);
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

function serializeProductForResponse(req, productDoc) {
  const product = productDoc && typeof productDoc.toObject === "function"
    ? productDoc.toObject()
    : { ...(productDoc || {}) };

  if (product.current) {
    product.current.image = buildPublicFileUrl(req, product.current.image);
    product.current.categoryIcon = buildPublicFileUrl(req, product.current.categoryIcon);
  }

  if (Array.isArray(product.history)) {
    product.history = product.history.map((entry) => ({
      ...entry,
      image: buildPublicFileUrl(req, entry.image),
      categoryIcon: buildPublicFileUrl(req, entry.categoryIcon)
    }));
  }

  return product;
}

function serializeImageForResponse(req, imageDoc) {
  const image = imageDoc && typeof imageDoc.toObject === "function"
    ? imageDoc.toObject()
    : { ...(imageDoc || {}) };

  const normalizedPath = normalizeStoredImagePath(image.path);
  return {
    ...image,
    path: normalizedPath,
    url: buildPublicFileUrl(req, normalizedPath)
  };
}

module.exports = {
  DEFAULT_IMAGE_PATH,
  buildPublicFileUrl,
  getUploadRelativePath,
  normalizeStoredImagePath,
  serializeImageForResponse,
  serializeProductForResponse
};
