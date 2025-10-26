export function extractJsonLd(doc) {
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