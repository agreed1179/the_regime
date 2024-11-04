// src/utils/assetHelper.js
export function getAssetPath(assetType, filename, assetPaths) {
  if (!filename) return '';
  
  const typeMap = {
    'character': 'characters',
    'background': 'backgrounds',
    'sound': 'sounds',
    'music': 'music',
    'style': 'styles'
    // Remove 'full' and 'close' if they're no longer used
  };

  const pathType = typeMap[assetType];

  if (pathType && assetPaths[pathType]) {
    // Remove any leading and trailing slashes to ensure relative paths
    const sanitizedPath = assetPaths[pathType].replace(/^\/+|\/+$/g, '');
    //console.log(`${sanitizedPath}/${filename}`)
    return `${sanitizedPath}/${filename}`;
  }

  console.warn(`Asset type "${assetType}" is not defined in assetPaths.`);
  return filename; // Fallback to filename if pathType not found
}
