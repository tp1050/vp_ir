
console.log('Universal Scraper: helpers.js loaded');
export function sanitizeFilename(name, url) {
  let filename = name
    .replace(/[\\\/:*?"<>|]/g, '_')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 150);
  if (!filename) {
    const hash = url.split('/').pop() || 'product';
    filename = hash.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return filename;
}

export function escapeCsvField(field) {
  if (!field) return '""';
  let str = field.toString()
    .replace(/"/g, '&quot;')
    .replace(/\n|\r\n/g, '<br>')
    .replace(/\t/g, ' ')
    .trim();
  return `"${str}"`;
}

export function escapeImageUrl(url) {
  if (!url) return '';
  return url.replace(/"/g, '&quot;').trim();
}

export function downloadFile(content, filename, mimeType) {
  console.log('Universal Scraper: Triggering download for', filename);
  try {
    const blob = new Blob([new TextEncoder().encode(content)], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Universal Scraper: Download triggered');
  } catch (e) {
    console.error('Universal Scraper: Download failed:', e);
  }
}