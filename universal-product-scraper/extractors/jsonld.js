export function extractJsonLd(doc) {
  console.log('Universal Scraper: jsonld.js loaded');
  let data = { name: '', description: '', brand: '', price: '', url: '', images: [], specs: {} };

  // Get all script tags (not just application/ld+json)
  const scripts = doc.querySelectorAll('script');
  let jsonLdData = null;

  // Regex to find JSON-LD-like objects
  const jsonLdRegex = /({.*"@context"\s*:\s*"https:\/\/schema\.org".*})/;
  for (const script of scripts) {
    let scriptContent = script.textContent || script.innerHTML;
    if (!scriptContent) continue;

    // Try parsing as direct JSON-LD
    if (script.type === 'application/ld+json') {
      try {
        jsonLdData = JSON.parse(scriptContent);
      } catch (e) {
        console.error('Universal Scraper: Failed to parse JSON-LD:', e);
      }
    } else {
      // Handle Next.js SSR (e.g., __next_f.push)
      const match = scriptContent.match(jsonLdRegex);
      if (match && match[1]) {
        try {
          // Clean and parse the matched JSON
          let cleanedJson = match[1]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          jsonLdData = JSON.parse(cleanedJson);
        } catch (e) {
          console.error('Universal Scraper: Failed to parse Next.js JSON-LD:', e);
        }
      }
    }

    if (jsonLdData) {
      // Handle arrays or single objects
      const products = Array.isArray(jsonLdData) ? jsonLdData : [jsonLdData];
      for (const item of products) {
        if (item['@type'] === 'Product') {
          data.name = item.name || data.name;
          data.description = item.description || data.description;
          data.brand = item.brand?.name || data.brand;
          data.url = item.url || item.offers?.url || data.url;
          data.price = item.offers?.price ? String(item.offers.price) : data.price;
          data.images = Array.isArray(item.image) ? item.image : item.image ? [item.image] : data.images;

          // Extract specs from secondary_attributes if present (Next.js specific)
          if (item['@type'] === 'Product' && item.secondary_attributes) {
            item.secondary_attributes.forEach(attr => {
              if (attr.name && attr.value) {
                data.specs[attr.name] = attr.value;
              }
            });
          }
        }
      }
    }
  }

  data.images = [...new Set(data.images)].filter(src => src && typeof src === 'string');
  console.log('Universal Scraper: JSON-LD extracted:', data);
  return data;
}