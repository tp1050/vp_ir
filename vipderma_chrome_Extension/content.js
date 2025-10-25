(function() {
  'use strict';

  // Wait for DOM to be ready, but since run_at is document_end, we're good.
  function getProductId() {
    // Try meta tag first
    const meta = document.querySelector('meta[name="product_id"]');
    if (meta && meta.content) {
      return meta.content;
    }

    // Fallback to URL: look for /P\d+/
    const url = window.location.href;
    const match = url.match(/\/P(\d+)\//);
    return match ? match[1] : null;
  }

  function injectButton(id) {
    if (!id) return; // Bail if no ID

    const button = document.createElement('button');
    button.textContent = 'Edit Product';
    button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: #007cba;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    button.addEventListener('click', () => {
      const editUrl = `https://660e731603650.mywebzi.ir/admin11397e41a33aef/shop/products/edit/${id}/`;
      window.open(editUrl, '_blank');
    });

    // Hover effects for polish
    button.addEventListener('mouseenter', () => {
      button.style.background = '#005a87';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#007cba';
    });

    document.body.appendChild(button);
  }

  // Run it
  const productId = getProductId();
  if (productId) {
    injectButton(productId);
  } else {
    console.log('No product ID found—skipping button injection.');
  }
})();