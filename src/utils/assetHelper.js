// src/utils/assetHelper.js
export function getAssetPath(assetType, filename, assetPaths) {
  if (!filename) return '';

  const typeMap = {
    'character': 'characters',   // Added this line
    'background': 'backgrounds',
    'sound': 'sounds',
    'music': 'music',
    'style': 'styles' // If needed
    // Remove 'full' and 'close' if they're no longer used
  };

  const pathType = typeMap[assetType];

  if (pathType && assetPaths[pathType]) {
    // Ensure there's a slash between the path and filename
    // Also, remove any trailing slash from assetPaths[pathType] to prevent double slashes
    const sanitizedPath = assetPaths[pathType].endsWith('/')
      ? assetPaths[pathType].slice(0, -1)
      : assetPaths[pathType];
    return `${sanitizedPath}/${filename}`;
  }

  console.warn(`Asset type "${assetType}" is not defined in assetPaths.`);
  return filename; // Fallback to filename if pathType not found
}
