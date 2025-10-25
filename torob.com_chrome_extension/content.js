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
      let fullSrc = img.src.replace(/\/280x280\./, '/560x560.');
      if (fullSrc === img.src) fullSrc = img.src;
      images.push(fullSrc);
    }
  });
  images = [...new Set(images)].filter(src => src);
  console.log('Torob Scraper: Images from DOM:', images.length, 'URLs:', images.slice(0, 3));

  if (images.length === 0 && ldJson?.image) {
    images = [ldJson.image];
    console.log('Torob Scraper: Added LD fallback image:', images[0]);
  }

  // Specs: Flatten key-value pairs
  const specs = {};
  const specsContent = document.querySelector('.specs-content');
  if (specsContent) {
    console.log('Torob Scraper: Specs container found');
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
    const keyContainers = specsContent.querySelectorAll('.key-specs-container');
    console.log('Torob Scraper: Key spec containers found:', keyContainers.length);
    keyContainers.forEach((container, idx) => {
      const titleSpan = container.querySelector('div.keys-values span');
      const valueDiv = container.querySelector('div[dir="auto"].keys-values');
      if (titleSpan && valueDiv) {
        const key = titleSpan.textContent.trim();
        const val = valueDiv.textContent.trim();
        if (key && val) {
          specs[key] = val;
          console.log(`Torob Scraper: Key spec ${idx + 1}: "${key}" -> "${val}"`);
        }
      }
    });
  } else {
    console.warn('Torob Scraper: No specs container found');
  }
  console.log('Torob Scraper: Total specs extracted:', Object.keys(specs).length);

  // Build JSON data
  const data = {
    name,
    url: urlFull,
    price,
    brand,
    description,
    images,
    ...specs
  };
  console.log('Torob Scraper: JSON data built:', data);

  // Sanitize filename: Keep Persian, swap invalids + spaces
  let filename = name
    .replace(/[\\\/:*?"<>|]/g, '_')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 150);
  if (!filename) filename = productHash;
  console.log('Torob Scraper: Sanitized filename base:', filename);

  // Download JSON
  const jsonStr = JSON.stringify(data, null, 2);
  console.log('Torob Scraper: Triggering JSON download...');
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `torob/products/jsons/${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Torob Scraper: JSON download triggered');
  } catch (e) {
    console.error('Torob Scraper: JSON download failed:', e);
  }

  // CSV Generation for webzi
  console.log('Torob Scraper: Generating CSV for webzi import...');

  // Escape function for CSV fields
  function escapeCsvField(field) {
    if (!field) return '""';
    let str = field.toString()
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/\n|\r\n/g, '<br>') // Newlines to <br>
      .replace(/\t/g, ' ') // Tabs to space
      .trim();
    return `"${str}"`; // Wrap in quotes
  }

  // CSV headers: Base template + spec columns + image columns
  const baseHeaders = ['title', 'description', 'visible', 'price', 'inventory', 'quantity', 'weight'];
  const specKeys = Object.keys(specs);
  const specHeaders = specKeys.flatMap((_, i) => [
    `extraInfoTitle${i + 1}`,
    `extraInfoContent${i + 1}`
  ]);
  const imageHeaders = ['extraInfoTitle' + (specKeys.length + 1), 'extraInfoContent' + (specKeys.length + 1)];
  const csvHeaders = [...baseHeaders, ...specHeaders, ...imageHeaders];
  console.log('Torob Scraper: CSV headers:', csvHeaders);

  // CSV data row
  const baseRow = [
    escapeCsvField(name), // title
    escapeCsvField(description), // description
    '"TRUE"', // visible
    escapeCsvField(price), // price
    '"Track"', // inventory
    '"1"', // quantity
    '"0.1"' // weight
  ];
  const specRow = specKeys.flatMap(key => [
    escapeCsvField(key), // extraInfoTitleN
    escapeCsvField(specs[key]) // extraInfoContentN
  ]);
  // Image row: single pair with all <img> tags
  const imageContent = images.map(url => `<img src="${url}">`).join('');
  const imageRow = [
    'image', // extraInfoTitleN
    imageContent // extraInfoContentN
  ];
  const csvRows = [
    csvHeaders.join(','), // Header row
    [...baseRow, ...specRow, ...imageRow].join(',') // Data row
  ];
  const csvContent = csvRows.join('\n');
  console.log('Torob Scraper: CSV content generated:', csvContent);

  // Download CSV
  console.log('Torob Scraper: Triggering CSV download...');
  try {
    const blob = new Blob([new TextEncoder().encode(csvContent)], { type: 'text/csv;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `torob/products/csvs/${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Torob Scraper: CSV download triggered');
  } catch (e) {
    console.error('Torob Scraper: CSV download failed:', e);
  }

})();