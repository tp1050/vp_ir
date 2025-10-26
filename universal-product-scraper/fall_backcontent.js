(function() {
  'use strict';

  console.log('Universal Scraper: Content script loaded on', window.location.href);

  if (window.location.href.includes('torob.com')) {
    console.log('Universal Scraper: Skipping torob.com');
    return;
  }

  function sanitizeFilename(name, url) {
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

  function escapeCsvField(field) {
    if (!field) return '""';
    let str = field.toString()
      .replace(/"/g, '&quot;')
      .replace(/\n|\r\n/g, '<br>')
      .replace(/\t/g, ' ')
      .trim();
    return `"${str}"`;
  }

  function escapeImageUrl(url) {
    if (!url) return '';
    return url.replace(/"/g, '&quot;').trim();
  }

  function downloadFile(content, filename, mimeType) {
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

  function extractJsonLd(doc) {
    let data = { name: '', price: '', brand: '', description: '', images: [], specs: {} };
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        if (parsed['@type'] === 'Product') {
          data.name = parsed.name || '';
          data.description = parsed.description || '';
          data.brand = parsed.brand?.name || '';
          data.images = Array.isArray(parsed.image) ? parsed.image : [parsed.image].filter(Boolean);
          if (parsed.offers) {
            if (Array.isArray(parsed.offers)) {
              data.price = parsed.offers[0]?.price || '';
            } else if (parsed.offers.lowPrice) {
              data.price = parsed.offers.lowPrice;
            } else {
              data.price = parsed.offers.price || '';
            }
          }
          if (Array.isArray(parsed.additionalProperty)) {
            parsed.additionalProperty.forEach(prop => {
              if (prop.name && prop.value) {
                data.specs[prop.name] = prop.value;
              }
            });
          }
          console.log('Universal Scraper: JSON-LD extracted:', data);
          break;
        }
      } catch (e) {
        console.warn('Universal Scraper: JSON-LD parse failed:', e);
      }
    }
    return data;
  }

  function extractWooCommerce(doc) {
    let data = { name: '', description: '', brand: '', specs: {} };
    const wooPanel = doc.querySelector('.woocommerce-Tabs-panel--additional_information');
    if (wooPanel) {
      const titleEl = wooPanel.querySelector('.title .product_seo_title');
      data.name = titleEl?.textContent.trim() || '';
      const wooSpecs = wooPanel.querySelectorAll('.spec-list .clearfix');
      console.log('Universal Scraper: WooCommerce specs found:', wooSpecs.length);
      wooSpecs.forEach((li, idx) => {
        const keyEl = li.querySelector('.technicalspecs-title');
        const valueEl = li.querySelector('.technicalspecs-value');
        if (keyEl && valueEl) {
          const key = keyEl.textContent.trim();
          let value = valueEl.textContent.trim();
          if (valueEl.innerHTML.includes('<br>')) {
            value = valueEl.innerHTML
              .replace(/<br\s*\/?>/gi, '<br>')
              .replace(/<[^>]+>/g, '')
              .trim();
          }
          if (key && value) {
            data.specs[key] = value;
            if (key === 'برند') data.brand = value;
            if (key === 'ویژگی') data.description = value;
            console.log(`Universal Scraper: WooCommerce spec ${idx + 1}: "${key}" -> "${value}"`);
          }
        }
      });
    }
    return data;
  }

  function extractOpenGraph(doc) {
    let data = { name: '', description: '', price: '', brand: '', url: '', images: [] };
    const metas = doc.querySelectorAll('meta[property^="og:"], meta[property^="product:"]');
    let isProduct = false;
    metas.forEach(meta => {
      const prop = meta.getAttribute('property');
      const content = meta.getAttribute('content')?.trim() || '';
      if (prop === 'og:type' && content === 'product') isProduct = true;
      if (prop === 'og:title') data.name = content;
      if (prop === 'og:description') data.description = content;
      if (prop === 'og:url') data.url = content;
      if (prop === 'og:image') data.images.push(content);
      if (prop === 'product:brand') data.brand = content;
      if (prop === 'product:price:amount') data.price = content.replace(/[^0-9]/g, '');
    });
    if (!isProduct) {
      console.log('Universal Scraper: No og:type="product" found—skipping OG.');
      return { name: '', description: '', price: '', brand: '', url: '', images: [] };
    }
    data.images = [...new Set(data.images)].filter(src => src && typeof src === 'string');
    console.log('Universal Scraper: Open Graph extracted:', data);
    return data;
  }

  const jsonLdData = extractJsonLd(document);
  const wooData = extractWooCommerce(document);
  const ogData = extractOpenGraph(document);

  let name = jsonLdData.name || wooData.name || ogData.name || document.title.split(/[-|]/)[0].trim();
  const urlFull = jsonLdData.url || ogData.url || window.location.href;
  let price = jsonLdData.price || ogData.price || '';
  let brand = jsonLdData.brand || wooData.brand || ogData.brand || '';
  let description = jsonLdData.description || wooData.description || ogData.description || '';
  let images = jsonLdData.images.length ? jsonLdData.images : ogData.images;
  const specs = { ...jsonLdData.specs, ...wooData.specs };

  images = [...new Set(images)].filter(src => src && typeof src === 'string');
  console.log('Universal Scraper: Merged data - Name:', name, 'Price:', price || 'N/A', 'Images:', images.length, 'Specs:', Object.keys(specs).length);

  if (!name && !description && !price && !images.length && !Object.keys(specs).length) {
    console.log('Universal Scraper: No meaningful product data—skipping.');
    return;
  }

  const data = { name, url: urlFull, price, brand, description, images, ...specs };
  console.log('Universal Scraper: JSON data built:', data);

  const filename = sanitizeFilename(name, urlFull);

  downloadFile(JSON.stringify(data, null, 2), `scraped-products/jsons/${filename}.json`, 'application/json');

  console.log('Universal Scraper: Generating CSV for webzi import...');
  const baseHeaders = ['title', 'description', 'visible', 'price', 'inventory', 'quantity', 'weight'];
  const specKeys = Object.keys(specs);
  const specHeaders = specKeys.flatMap((_, i) => [
    `extraInfoTitle${i + 1}`,
    `extraInfoContent${i + 1}`
  ]);
  const imageHeaders = ['extraInfoTitle' + (specKeys.length + 1), 'extraInfoContent' + (specKeys.length + 1)];
  const csvHeaders = [...baseHeaders, ...specHeaders, ...imageHeaders];
  console.log('Universal Scraper: CSV headers:', csvHeaders);

  const baseRow = [
    escapeCsvField(name),
    escapeCsvField(description),
    'TRUE',
    price || '',
    'Track',
    '1',
    '0.1'
  ];
  const specRow = specKeys.flatMap(key => [
    escapeCsvField(key),
    escapeCsvField(specs[key])
  ]);
  const imageContent = images.map(url => `<img src="${escapeImageUrl(url)}">`).join('');
  const imageRow = [
    escapeCsvField('image'),
    imageContent || ''
  ];
  const csvRows = [
    csvHeaders.join(','),
    [...baseRow, ...specRow, ...imageRow].join(',')
  ];
  const csvContent = csvRows.join('\n');
  console.log('Universal Scraper: CSV content generated:', csvContent);

  downloadFile(csvContent, `scraped-products/csvs/${filename}.csv', 'text/csv;charset=utf-8');
})();