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

  // Brand from LD (or specs fallback later)
  let brand = ldJson?.brand?.name || '';
  console.log('Torob Scraper: Brand:', brand || 'N/A');

  // Description from LD (optional)
  let description = ldJson?.description || '';
  console.log('Torob Scraper: Description length:', description.length || 0);

  // Images: array from DOM (updated selector for gallery thumbs + main)
  let images = [];
  const galleryImgs = document.querySelectorAll('.Showcase_gallery__clBEu img');
  galleryImgs.forEach(img => {
    if (img.src && img.src.includes('image.torob.com')) {
      // Upgrade to full-res: swap /280x280 to /560x560 if present
      let fullSrc = img.src.replace(/\/280x280\./, '/560x560.');
      if (fullSrc === img.src) fullSrc = img.src;  // No swap needed
      images.push(fullSrc);
    }
  });
  // Dedupe
  images = [...new Set(images)].filter(src => src);
  console.log('Torob Scraper: Images from DOM:', images.length, 'URLs:', images.slice(0, 3));

  // Fallback/add LD main image if empty
  if (images.length === 0 && ldJson?.image) {
    images = [ldJson.image];
    console.log('Torob Scraper: Added LD fallback image:', images[0]);
  }

  // Build enhanced description with first image embedded (raw <img>)
  let enhancedDesc = '';
  if (images.length > 0) {
    enhancedDesc += `<img src="${images[0]}" alt="${name}" style="max-width:100%; height:auto; display:block; margin:0 auto 1em;">\n\n`;
  }
  enhancedDesc += description || '';  // Append original desc if present

  // Specs: Flatten key-value pairs (brand fallback if LD empty)
  const specs = {};
  const specsContent = document.querySelector('.specs-content');
  if (specsContent) {
    console.log('Torob Scraper: Specs container found');

    // General detail-title/value pairs
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
          // Brand fallback from specs (e.g., "برند")
          if (!brand && (key.includes('برند') || key.toLowerCase().includes('brand'))) {
            brand = val;
          }
        }
      }
    });

    // Key specs (alternative format)
    const keyContainers = specsContent.querySelectorAll('.key-specs-container');
    console.log('Torob Scraper: Key spec containers found:', keyContainers.length);
    keyContainers.forEach((container, idx) => {
      const titleSpan = container.querySelector('div.keys-values span');
      const valueDiv = container.querySelector('div[dir="auto"].keys-values');
      if (titleSpan && valueDiv) {
        const key = titleSpan.textContent.trim();
        const val = valueDiv.textContent.trim();
        if (key && val) {
          specs[key] = val;  // Overwrite if dupes
          console.log(`Torob Scraper: Key spec ${idx + 1}: "${key}" -> "${val}"`);
          if (!brand && (key.includes('برند') || key.toLowerCase().includes('brand'))) {
            brand = val;
          }
        }
      }
    });
  } else {
    console.warn('Torob Scraper: No specs container found');
  }
  console.log('Torob Scraper: Total specs extracted:', Object.keys(specs).length);

  // Build flat JSON (enhanced desc)
  const data = {
    name,
    url: urlFull,
    price,
    brand,
    description: enhancedDesc,
    images,
    ...specs
  };
  console.log('Torob Scraper: JSON data built:', data);

  // Sanitize filename: Keep Persian, swap invalids + spaces
  let filenameBase = name
    .replace(/[\\\/:*?"<>|]/g, '_')  // Filesystem no-gos to _
    .trim()
    .replace(/\s+/g, '_')  // Multi-spaces to single _
    .substring(0, 100);  // Cap length
  if (!filenameBase) filenameBase = productHash;
  const jsonFilename = `torob/products/jsons/${filenameBase}.json`;
  const csvFilename = `torob/products/csvs/${filenameBase}.csv`;

  console.log('Torob Scraper: Sanitized base:', filenameBase);

  // Download JSON (unchanged)
  const jsonStr = JSON.stringify(data, null, 2);
  console.log('Torob Scraper: Triggering JSON download...');
  downloadBlob(jsonStr, 'application/json', jsonFilename);

  // Build CSV: Header + \n + data row
  console.log('Torob Scraper: Building CSV for webzi...');

  // Full header row (exact from template)
  const csvHeader = 'id,combination_id,product_type,title,description,slug,meta_title,meta_description,images,images_url,categories,categoryNames,tags,sku,barcode,ribbon,visible,price,inventory,quantity,oversell,weight,saleDiscountMode,saleDiscount,scheduledSaleDiscountMode,scheduledSaleDiscount,scheduledSaleStart,scheduledSaleEnd,productOptionName1,productOptionType1,productOptionValues1,extraInfoTitle1,extraInfoContent1,extraInfoTitle2,extraInfoContent2,extraInfoTitle3,extraInfoContent3,extraInfoTitle4,extraInfoContent4,extraInfoTitle5,extraInfoContent5,extraInfoTitle6,extraInfoContent6,extraInfoTitle7,extraInfoContent7,extraInfoTitle8,extraInfoContent8,extraInfoTitle9,extraInfoContent9,extraInfoTitle10,extraInfoContent10,extraInfoTitle11,extraInfoContent11,extraInfoTitle12,extraInfoContent12,extraInfoTitle13,extraInfoContent13,extraInfoTitle14,extraInfoContent14,extraInfoTitle15,extraInfoContent15,extraInfoTitle16,extraInfoContent16,extraInfoTitle17,extraInfoContent17,extraInfoTitle18,extraInfoContent18,extraInfoTitle19,extraInfoContent19,extraInfoTitle20,extraInfoContent20,extraInfoTitle21,extraInfoContent21,extraInfoTitle22,extraInfoContent22,extraInfoTitle23,extraInfoContent23,extraInfoTitle24,extraInfoContent24,productAttributeName1,productAttributeGroup1,productAttributeValue1,productAttributeName2,productAttributeGroup2,productAttributeValue2,productAttributeName3,productAttributeGroup3,productAttributeValue3,productAttributeName4,productAttributeGroup4,productAttributeValue4,productAttributeName5,productAttributeGroup5,productAttributeValue5,productAttributeName6,productAttributeGroup6,productAttributeValue6,productAttributeName7,productAttributeGroup7,productAttributeValue7,productAttributeName8,productAttributeGroup8,productAttributeValue8,productAttributeName9,productAttributeGroup9,productAttributeValue9,productAttributeName10,productAttributeGroup10,productAttributeValue10,productAttributeName11,productAttributeGroup11,productAttributeValue11,productAttributeName12,productAttributeGroup12,productAttributeValue12,productAttributeName13,productAttributeGroup13,productAttributeValue13,productAttributeName14,productAttributeGroup14,productAttributeValue14,productAttributeName15,productAttributeGroup15,productAttributeValue15,productAttributeName16,productAttributeGroup16,productAttributeValue16,productAttributeName17,productAttributeGroup17,productAttributeValue17,productAttributeName18,productAttributeGroup18,productAttributeValue18,productAttributeName19,productAttributeGroup19,productAttributeValue19,productAttributeName20,productAttributeGroup20,productAttributeValue20,productAttributeName21,productAttributeGroup21,productAttributeValue21,productAttributeName22,productAttributeGroup22,productAttributeValue22,productAttributeName23,productAttributeGroup23,productAttributeValue23,productAttributeName24,productAttributeGroup24,productAttributeValue24,productAttributeName25,productAttributeGroup25,productAttributeValue25,productAttributeName26,productAttributeGroup26,productAttributeValue26,productAttributeName27,productAttributeGroup27,productAttributeValue27,productAttributeName28,productAttributeGroup28,productAttributeValue28,productAttributeName29,productAttributeGroup29,productAttributeValue29,productAttributeName30,productAttributeGroup30,productAttributeValue30,productAttributeName31,productAttributeGroup31,productAttributeValue31,productAttributeName32,productAttributeGroup32,productAttributeValue32,productAttributeName33,productAttributeGroup33,productAttributeValue33,productAttributeName34,productAttributeGroup34,productAttributeValue34,productAttributeName35,productAttributeGroup35,productAttributeValue35,productAttributeName36,productAttributeGroup36,productAttributeValue36,productAttributeName37,productAttributeGroup37,productAttributeValue37,productAttributeName38,productAttributeGroup38,productAttributeValue38,productAttributeName39,productAttributeGroup39,productAttributeValue39,productAttributeName40,productAttributeGroup40,productAttributeValue40,productAttributeName41,productAttributeGroup41,productAttributeValue41,productAttributeName42,productAttributeGroup42,productAttributeValue42,productAttributeName43,productAttributeGroup43,productAttributeValue43,productAttributeName44,productAttributeGroup44,productAttributeValue44,productAttributeName45,productAttributeGroup45,productAttributeValue45,productAttributeName46,productAttributeGroup46,productAttributeValue46,productAttributeName47,productAttributeGroup47,productAttributeValue47,productAttributeName48,productAttributeGroup48,productAttributeValue48,productAttributeName49,productAttributeGroup49,productAttributeValue49,productAttributeName50,productAttributeGroup50,productAttributeValue50,productAttributeName51,productAttributeGroup51,productAttributeValue51,productAttributeName52,productAttributeGroup52,productAttributeValue52,productAttributeName53,productAttributeGroup53,productAttributeValue53,productAttributeName54,productAttributeGroup54,productAttributeValue54,productAttributeName55,productAttributeGroup55,productAttributeValue55,productAttributeName56,productAttributeGroup56,productAttributeValue56,productAttributeName57,productAttributeGroup57,productAttributeValue57,productAttributeName58,productAttributeGroup58,productAttributeValue58,productAttributeName59,productAttributeGroup59,productAttributeValue59,productAttributeName60,productAttributeGroup60,productAttributeValue60,productAttributeName61,productAttributeGroup61,productAttributeValue61,productAttributeName62,productAttributeGroup62,productAttributeValue62,productAttributeName63,productAttributeGroup63,productAttributeValue63,productAttributeName64,productAttributeGroup64,productAttributeValue64,productAttributeName65,productAttributeGroup65,productAttributeValue65,productAttributeName66,productAttributeGroup66,productAttributeValue66,productAttributeName67,productAttributeGroup67,productAttributeValue67,productAttributeName68,productAttributeGroup68,productAttributeValue68,productAttributeName69,productAttributeGroup69,productAttributeValue69,productAttributeName70,productAttributeGroup70,productAttributeValue70,productAttributeName71,productAttributeGroup71,productAttributeValue71,productAttributeName72,productAttributeGroup72,productAttributeValue72,productAttributeName73,productAttributeGroup73,productAttributeValue73,productAttributeName74,productAttributeGroup74,productAttributeValue74,productAttributeName75,productAttributeGroup75,productAttributeValue75,productAttributeName76,productAttributeGroup76,productAttributeValue76,productAttributeName77,productAttributeGroup77,productAttributeValue77,productAttributeName78,productAttributeGroup78,productAttributeValue78,productAttributeName79,productAttributeGroup79,productAttributeValue79,productAttributeName80,productAttributeGroup80,productAttributeValue80,productAttributeName81,productAttributeGroup81,productAttributeValue81,productAttributeName82,productAttributeGroup82,productAttributeValue82,productAttributeName83,productAttributeGroup83,productAttributeValue83,productAttributeName84,productAttributeGroup84,productAttributeValue84,productAttributeName85,productAttributeGroup85,productAttributeValue85,productAttributeName86,productAttributeGroup86,productAttributeValue86,productAttributeName87,productAttributeGroup87,productAttributeValue87,productAttributeName88,productAttributeGroup88,productAttributeValue88,productAttributeName89,productAttributeGroup89,productAttributeValue89,productAttributeName90,productAttributeGroup90,productAttributeValue90,productAttributeName91,productAttributeGroup91,productAttributeValue91,productAttributeName92,productAttributeGroup92,productAttributeValue92,productAttributeName93,productAttributeGroup93,productAttributeValue93,productAttributeName94,productAttributeGroup94,productAttributeValue94,productAttributeName95,productAttributeGroup95,productAttributeValue95,productAttributeName96,productAttributeGroup96,productAttributeValue96,productAttributeName97,productAttributeGroup97,productAttributeValue97,productAttributeName98,productAttributeGroup98,productAttributeValue98,productAttributeName99,productAttributeGroup99,productAttributeValue99,productAttributeName100,productAttributeGroup100,productAttributeValue100,productAttributeName101,productAttributeGroup101,productAttributeValue101,productAttributeName102,productAttributeGroup102,productAttributeValue102,productAttributeName103,productAttributeGroup103,productAttributeValue103,productAttributeName104,productAttributeGroup104,productAttributeValue104';

  // Tags: brand (if any) + fixed
  const tags = (brand ? `${brand}, ` : '') + 'وارداتی, خاص, تخفیف, منطقه آزاد, نایاب, کمیاب';

  let csvDataRow = ',,';  // id,combination_id
  csvDataRow += 'Physical,';  // product_type
  csvDataRow += `${escapeCsv(name)},`;  // title
  csvDataRow += `${escapeCsv(enhancedDesc)},`;  // description
  csvDataRow += ',,,,,,,,';  // 7 empties: slug to categoryNames
  csvDataRow += `${escapeCsv(tags)},`;  // tags
  csvDataRow += ',اوریجنال وارداتی,,TRUE,';  // sku empty ,, barcode ,, ribbon empty ,, visible
  csvDataRow += `${escapeCsv(price)},`;  // price
  csvDataRow += 'Track,1,FALSE,100,PRICE,';  // inventory etc.
  csvDataRow += ',,,,,,';  // 6 empties: saleDiscount to scheduledSaleEnd
  csvDataRow += ',,,';  // 3 empties: productOptionName1,Type1,Values1

  // ExtraInfo: Fill sequentially from specs (title1/content1, etc. up to 24)
  let extraIndex = 1;
  for (let [key, val] of Object.entries(specs)) {
    if (extraIndex > 24) break;  // Cap at 24 pairs
    csvDataRow += `${escapeCsv(key)},`;  // extraInfoTitleN
    csvDataRow += `${escapeCsv(val)},`;  // extraInfoContentN
    extraIndex++;
  }
  // Pad remaining extraInfo to 24 with empties
  while (extraIndex <= 24) {
    csvDataRow += ',,';  // title,content empty
    extraIndex++;
  }

  // ProductAttributes: 300 empty fields (100 groups x 3)
  for (let i = 0; i < 300; i++) {
    csvDataRow += ',';
  }

  // Full CSV: header + \n + data row
  const csvFull = csvHeader + '\n' + csvDataRow;
  console.log('Torob Scraper: CSV full built (header + data, length:', csvFull.length, ')');

  // Download CSV
  console.log('Torob Scraper: Triggering CSV download...');
  downloadBlob(csvFull, 'text/csv;charset=utf-8', csvFilename);

  // Helper: Escape CSV values (quote if needed, escape quotes)
  function escapeCsv(str) {
    if (!str) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // Helper: Download blob
  function downloadBlob(content, type, filename) {
    try {
      const blob = new Blob([content], { type });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      console.log(`Torob Scraper: ${type.split('/')[1].toUpperCase()} download triggered: ${filename}`);
    } catch (e) {
      console.error('Torob Scraper: Download failed:', e);
    }
  }

})();