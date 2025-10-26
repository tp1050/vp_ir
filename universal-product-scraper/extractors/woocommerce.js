export function extractWooCommerce(doc) {
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