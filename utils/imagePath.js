const DEFAULT_IMAGE_PATH = "assets/images/default.png";

function getFileName(pathValue) {
  const fileName = String(pathValue || "").split("/").filter(Boolean).pop() || "";

  try {
    return decodeURIComponent(fileName);
  } catch (_err) {
    return fileName;
  }
}

function normalizeStoredImagePath(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    try {
      const parsed = new URL(raw);
      const parsedUploadsIndex = parsed.pathname.toLowerCase().indexOf("/uploads/");
      const parsedAssetsIndex = parsed.pathname.toLowerCase().indexOf("/assets/");
      const isLocalUpload = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (isLocalUpload && parsedUploadsIndex >= 0) {
        return parsed.pathname.substring(parsedUploadsIndex + 1);
      }
      if (isLocalUpload && parsedAssetsIndex >= 0) {
        return parsed.pathname.substring(parsedAssetsIndex + 1);
      }
    } catch (_err) {
      return raw;
    }

    return raw;
  }

  const normalized = raw.replace(/\\/g, "/").replace(/^file:\/+/, "");
  const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
  const assetsIndex = normalized.toLowerCase().indexOf("/assets/");

  if (uploadsIndex >= 0) {
    return normalized.substring(uploadsIndex + 1);
  }

  if (assetsIndex >= 0) {
    return normalized.substring(assetsIndex + 1);
  }

  if (normalized.toLowerCase().startsWith("uploads/")) {
    return normalized;
  }

  if (normalized.toLowerCase().startsWith("assets/")) {
    return normalized;
  }

  if (/^[A-Za-z]:\//.test(normalized) || raw.startsWith("file:///")) {
    const fileName = getFileName(normalized);
    return fileName ? `uploads/${fileName}` : "";
  }

  return normalized.replace(/^\/+/, "");
}

module.exports = {
  normalizeStoredImagePath,
  DEFAULT_IMAGE_PATH
};
