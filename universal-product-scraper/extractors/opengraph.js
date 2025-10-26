export function extractOpenGraph(doc) {
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
    if (prop === 'product:price:amount') data.price = content.replace(/[^0-9]/g, ''); // Normalize
  });
  // Only return data if og:type is product
  if (!isProduct) {
    console.log('Universal Scraper: No og:type="product" found—skipping OG.');
    return { name: '', description: '', price: '', brand: '', url: '', images: [] };
  }
  data.images = [...new Set(data.images)].filter(src => src && typeof src === 'string');
  console.log('Universal Scraper: Open Graph extracted:', data);
  return data;
}