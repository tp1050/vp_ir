export function extractWooCommerce(doc) {
  console.log('Universal Scraper: woocommerce.js loaded');
  let data = { name: '', description: '', brand: '', specs: {}, images: [] };
  const wooPanel = doc.querySelector('.woocommerce-Tabs-panel--additional_information');
  if (wooPanel) {
    const titleEl = wooPanel.querySelector('.title .product_seo_title');
    data.name = titleEl?.textContent.trim() || '';
    const wooSpecs = doc.querySelectorAll('.spec-list .clearfix, table.shop_attributes tr.woocommerce-product-attributes-item');
    console.log('Universal Scraper: WooCommerce specs found:', wooSpecs.length);
    wooSpecs.forEach((item, idx) => {
      let keyEl, valueEl;
      if (item.classList.contains('clearfix')) {
        keyEl = item.querySelector('.technicalspecs-title');
        valueEl = item.querySelector('.technicalspecs-value');
      } else {
        keyEl = item.querySelector('th.woocommerce-product-attributes-item__label');
        valueEl = item.querySelector('td.woocommerce-product-attributes-item__value');
      }
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

  // Fallbacks for additional WooCommerce fields
  if (!data.description) {
    const shortDesc = doc.querySelector('.woocommerce-product-details__short-description');
    data.description = shortDesc ? shortDesc.textContent.trim() : '';
  }
  if (!data.name) {
    const productTitle = doc.querySelector('.product_title');
    data.name = productTitle ? productTitle.textContent.trim() : '';
  }
  if (!data.price) {
    const priceEl = doc.querySelector('.woocommerce-Price-amount');
    data.price = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
  }
  // Try both gallery selectors
  const galleryImages = doc.querySelectorAll(
    '.woocommerce-product-gallery__wrapper .woocommerce-product-gallery__image img, ' +
    '.woocommerce-product-gallery__wrapper .product-image-wrap img'
  );
  galleryImages.forEach(img => {
    if (img?.src) data.images.push(img.src);
  });
  data.images = [...new Set(data.images)].filter(src => src && typeof src === 'string');
  console.log('Universal Scraper: WooCommerce extracted:', data);
  return data;
}