(function() {
  'use strict';

  console.log('Torob Scraper: Content script loaded on', window.location.href);

  // Quick check: Is this a product page with UUID hash?
  const url = window.location.href;
  const hashMatch = url.match(/\/p\/([a-f0-9-]{36})\//);
  if (!hashMatch) {
    console.log('Torob Scraper: Not a product page (no UUID hash)—skipping scrape.');
    return;
  }
  const productHash = hashMatch[1];
  console.log('Torob Scraper: Valid product page detected, hash:', productHash);

  // Extract LD+JSON for easy structured data
  let ldJson = null;
  const script = document.querySelector('script[type="application/ld+json"]');
  if (script) {
    try {
      ldJson = JSON.parse(script.textContent);
      console.log('Torob Scraper: LD+JSON parsed successfully');
    } catch (e) {
      console.warn('Torob Scraper: LD+JSON parse failed:', e);
    }
  } else {
    console.warn('Torob Scraper: No LD+JSON script found');
  }

  // Name from DOM (fallback to LD)
  let name = ldJson?.name || '';
  const nameEl = document.querySelector('.Showcase_name__hrttI h1');
  if (nameEl) {
    name = nameEl.textContent.trim();
    console.log('Torob Scraper: Name extracted from DOM:', name);
  } else if (name) {
    console.log('Torob Scraper: Name from LD+JSON:', name);
  } else {
    console.warn('Torob Scraper: No name found—using hash as fallback');
    name = productHash;
  }

  // URL
  const urlFull = url;
  console.log('Torob Scraper: URL:', urlFull);

  // Price: lowPrice from LD
  const price = ldJson?.offers?.lowPrice || '';
  console.log('Torob Scraper: Price:', price || 'N/A');

  // Brand from LD
  const brand = ldJson?.brand?.name || '';
  console.log('Torob Scraper: Brand:', brand || 'N/A');

  // Description from LD (optional)
  const description = ldJson?.description || '';
  console.log('Torob Scraper: Description length:', description.length || 0);

  // Images: array from DOM (updated selector for gallery thumbs + main)
  let images = [];
  const galleryImgs = document.querySelectorAll('.Showcase_gallery__clBEu img');
  galleryImgs.forEach(img => {
    if (img.src && img.src.includes('image.torob.com')) {
      // Upgrade to full-res: swap /280x280 to /560x560 if present
      let fullSrc = img.src.replace(/\/280x280\./, '/560x560.');
      if (fullSrc === img.src) fullSrc = img.src;  // No swap needed
      images.push(fullSrc);
    }
  });
  // Dedupe
  images = [...new Set(images)].filter(src => src);
  console.log('Torob Scraper: Images from DOM:', images.length, 'URLs:', images.slice(0, 3));

  // Fallback/add LD main image if empty
  if (images.length === 0 && ldJson?.image) {
    images = [ldJson.image];
    console.log('Torob Scraper: Added LD fallback image:', images[0]);
  }

  // Specs: Flatten key-value pairs
  const specs = {};
  const specsContent = document.querySelector('.specs-content');
  if (specsContent) {
    console.log('Torob Scraper: Specs container found');

    // General detail-title/value pairs
    const detailTitles = specsContent.querySelectorAll('.detail-title');
    console.log('Torob Scraper: Detail titles found:', detailTitles.length);
    detailTitles.forEach((title, idx) => {
      const value = title.nextElementSibling;
      if (value && value.classList.contains('detail-value')) {
        const key = title.textContent.trim();
        const val = value.textContent.trim();
        if (key && val) {
          specs[key] = val;
          console.log(`Torob Scraper: Spec ${idx + 1}: "${key}" -> "${val}"`);
        }
      }
    });

    // Key specs (alternative format)
    const keyContainers = specsContent.querySelectorAll('.key-specs-container');
    console.log('Torob Scraper: Key spec containers found:', keyContainers.length);
    keyContainers.forEach((container, idx) => {
      const titleSpan = container.querySelector('div.keys-values span');
      const valueDiv = container.querySelector('div[dir="auto"].keys-values');
      if (titleSpan && valueDiv) {
        const key = titleSpan.textContent.trim();
        const val = valueDiv.textContent.trim();
        if (key && val) {
          specs[key] = val;  // Overwrite if dupes
          console.log(`Torob Scraper: Key spec ${idx + 1}: "${key}" -> "${val}"`);
        }
      }
    });
  } else {
    console.warn('Torob Scraper: No specs container found');
  }
  console.log('Torob Scraper: Total specs extracted:', Object.keys(specs).length);

  // Build flat JSON
  const data = {
    name,
    url: urlFull,
    price,
    brand,
    description,
    images,  // Array, as it's multi
    ...specs  // Flattened specs
  };
  console.log('Torob Scraper: JSON data built:', data);

  // Sanitize filename: Keep Persian, swap invalids + spaces
  let filename = name
    .replace(/[\\\/:*?"<>|]/g, '_')  // Filesystem no-gos to _
    .trim()
    .replace(/\s+/g, '_')  // Multi-spaces to single _
    .substring(0, 150);  // Cap length (room for Persian)
  if (!filename) filename = productHash;
  filename += '.json';
  console.log('Torob Scraper: Sanitized filename:', filename);

  // Download via <a> + blob (no background/messaging)
  const jsonStr = JSON.stringify(data, null, 2);
  console.log('Torob Scraper: Triggering download via blob link...');
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `torob/products/jsons/${filename}`;
    document.body.appendChild(a);  // Temp add
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Torob Scraper: Download triggered successfully');
  } catch (e) {
    console.error('Torob Scraper: Download failed:', e);
  }

})();