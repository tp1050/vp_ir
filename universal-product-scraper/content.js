(async function() {
  'use strict';

  console.log('Universal Scraper: Content script loaded on', window.location.href);

  if (window.location.href.includes('torob.com')) {
    console.log('Universal Scraper: Skipping torob.com');
    return;
  }

  // Create button
  const button = document.createElement('button');
  button.id = 'scraper-button';
  button.textContent = 'Scrape Product';
  document.body.appendChild(button);

  button.addEventListener('click', async () => {
    if (button.classList.contains('scraping')) return;
    
    button.classList.add('scraping');
    button.textContent = 'Scraping...';
    button.disabled = true;

    try {
      // Dynamic load helpers
      const { sanitizeFilename, escapeCsvField, escapeImageUrl, downloadFile } = await import(chrome.runtime.getURL('utils/helpers.js'));
      console.log('Universal Scraper: Helpers loaded:', { sanitizeFilename: typeof sanitizeFilename, escapeCsvField: typeof escapeCsvField, escapeImageUrl: typeof escapeImageUrl, downloadFile: typeof downloadFile });

      // Dynamic load extractors
      const { extractJsonLd } = await import(chrome.runtime.getURL('extractors/jsonld.js'));
      const { extractWooCommerce } = await import(chrome.runtime.getURL('extractors/woocommerce.js'));
      const { extractOpenGraph } = await import(chrome.runtime.getURL('extractors/opengraph.js'));
      console.log('Universal Scraper: Extractors loaded:', { extractJsonLd: typeof extractJsonLd, extractWooCommerce: typeof extractWooCommerce, extractOpenGraph: typeof extractOpenGraph });

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
        button.textContent = 'No Data Found';
        button.classList.remove('scraping');
        setTimeout(() => {
          button.textContent = 'Scrape Product';
          button.disabled = false;
        }, 2000);
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

      downloadFile(csvContent, `scraped-products/csvs/${filename}.csv`, 'text/csv;charset=utf-8');

      button.textContent = 'Scraped!';
      button.classList.remove('scraping');
      setTimeout(() => {
        button.textContent = 'Scrape Product';
        button.disabled = false;
      }, 2000);
    } catch (e) {
      console.error('Universal Scraper: Scrape failed:', e);
      button.textContent = 'Error';
      button.classList.remove('scraping');
      setTimeout(() => {
        button.textContent = 'Scrape Product';
        button.disabled = false;
      }, 2000);
    }
  });
})();