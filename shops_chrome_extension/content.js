(function() {
  'use strict';

  console.log('Universal Scraper: Content script loaded on', window.location.href);

  // Skip Torob.com
  if (window.location.href.includes('torob.com')) {
    console.log('Universal Scraper: Skipping torob.com');
    return;
  }

  // Extract all JSON-LD scripts
  let ldJson = null;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent);
      if (parsed['@type'] === 'Product') {
        ldJson = parsed;
        console.log('Universal Scraper: Product JSON-LD found');
        break;
      }
    } catch (e) {
      console.warn('Universal Scraper: JSON-LD parse failed:', e);
    }
  }
  if (!ldJson) {
    console.log('Universal Scraper: No Product JSON-LD found—skipping.');
    return;
  }

  // Extract data
  let name = ldJson.name || '';
  console.log('Universal Scraper: Name:', name);

  const urlFull = window.location.href;
  console.log('Universal Scraper: URL:', urlFull);

  // Price: From offers (first or lowPrice)
  let price = '';
  if (ldJson.offers) {
    if (Array.isArray(ldJson.offers)) {
      price = ldJson.offers[0]?.price || '';
    } else if (ldJson.offers.lowPrice) {
      price = ldJson.offers.lowPrice;
    } else {
      price = ldJson.offers.price || '';
    }
  }
  console.log('Universal Scraper: Price:', price || 'N/A');

  // Brand
  const brand = ldJson.brand?.name || '';
  console.log('Universal Scraper: Brand:', brand || 'N/A');

  // Description
  const description = ldJson.description || '';
  console.log('Universal Scraper: Description length:', description.length || 0);

  // Images: Array, dedupe/filter
  let images = Array.isArray(ldJson.image) ? ldJson.image : [ldJson.image].filter(Boolean);
  images = [...new Set(images)].filter(src => src && typeof src === 'string');
  console.log('Universal Scraper: Images found:', images.length, 'URLs:', images.slice(0, 3));

  // Specs: Flatten additionalProperty
  const specs = {};
  if (Array.isArray(ldJson.additionalProperty)) {
    ldJson.additionalProperty.forEach(prop => {
      if (prop.name && prop.value) {
        specs[prop.name] = prop.value;
      }
    });
  }
  console.log('Universal Scraper: Total specs extracted:', Object.keys(specs).length);

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
  console.log('Universal Scraper: JSON data built:', data);

  // Sanitize filename: Keep Persian, swap invalids + spaces
  let filename = name
    .replace(/[\\\/:*?"<>|]/g, '_')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 150);
  if (!filename) {
    const hash = urlFull.split('/').pop() || 'product';
    filename = hash.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  console.log('Universal Scraper: Sanitized filename base:', filename);

  // Download JSON
  const jsonStr = JSON.stringify(data, null, 2);
  console.log('Universal Scraper: Triggering JSON download...');
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `scraped-products/jsons/${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Universal Scraper: JSON download triggered');
  } catch (e) {
    console.error('Universal Scraper: JSON download failed:', e);
  }

  // CSV Generation for webzi
  console.log('Universal Scraper: Generating CSV for webzi import...');

  // Escape function for CSV text fields
  function escapeCsvField(field) {
    if (!field) return '""';
    let str = field.toString()
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/\n|\r\n/g, '<br>') // Newlines to <br>
      .replace(/\t/g, ' ') // Tabs to space
      .trim();
    return `"${str}"`; // Wrap in quotes
  }

  // Escape for image URLs (minimal)
  function escapeImageUrl(url) {
    if (!url) return '';
    return url.replace(/"/g, '&quot;').trim();
  }

  // CSV headers: Base + specs + images
  const baseHeaders = ['title', 'description', 'visible', 'price', 'inventory', 'quantity', 'weight'];
  const specKeys = Object.keys(specs);
  const specHeaders = specKeys.flatMap((_, i) => [
    `extraInfoTitle${i + 1}`,
    `extraInfoContent${i + 1}`
  ]);
  const imageHeaders = ['extraInfoTitle' + (specKeys.length + 1), 'extraInfoContent' + (specKeys.length + 1)];
  const csvHeaders = [...baseHeaders, ...specHeaders, ...imageHeaders];
  console.log('Universal Scraper: CSV headers:', csvHeaders);

  // CSV data row
  const baseRow = [
    escapeCsvField(name), // title (quoted)
    escapeCsvField(description), // description (quoted)
    'TRUE', // visible (unquoted)
    price || '', // price (unquoted)
    'Track', // inventory (unquoted)
    '1', // quantity (unquoted)
    '0.1' // weight (unquoted)
  ];
  const specRow = specKeys.flatMap(key => [
    escapeCsvField(key), // extraInfoTitleN (quoted)
    escapeCsvField(specs[key]) // extraInfoContentN (quoted)
  ]);
  // Image row
  const imageContent = images.map(url => `<img src="${escapeImageUrl(url)}">`).join('');
  const imageRow = [
    escapeCsvField('image'), // extraInfoTitleN (quoted)
    imageContent ? `"${imageContent}"` : '""' // extraInfoContentN (quoted)
  ];
  const csvRows = [
    csvHeaders.join(','), // Header row
    [...baseRow, ...specRow, ...imageRow].join(',') // Data row
  ];
  const csvContent = csvRows.join('\n');
  console.log('Universal Scraper: CSV content generated:', csvContent);

  // Download CSV
  console.log('Universal Scraper: Triggering CSV download...');
  try {
    const blob = new Blob([new TextEncoder().encode(csvContent)], { type: 'text/csv;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `scraped-products/csvs/${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    console.log('Universal Scraper: CSV download triggered');
  } catch (e) {
    console.error('Universal Scraper: CSV download failed:', e);
  }

})();