import csv
from urllib.parse import urljoin

buybutton = """
<div class="wzc86 wz-partial-template">
    <div class="wzc86-bg">&nbsp;</div>
    <a class="wz-shop-product-add-cart flashing-button" data-id="<PR_ID>" href="#"><span
            class="wzc86-content wz-element-content">افزودن به سبد خرید</span> </a>
    <style type="text/css">
        .flashing-button {
            display: inline-block;
            width: 140px;
            /* Slightly wider to fit larger text without wrapping */
            height: 40px;
            /* Increased for better vertical space */
            line-height: 40px;
            text-align: center;
            background-color: red;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            animation: flash 1s infinite alternate;
            font-size: 21px;
            /* Bumped up for larger, more readable text */
        }

        @keyframes flash {
            0% {
                background-color: red;
            }

            100% {
                background-color: orange;
            }
        }
    </style>
</div>
"""
buybutton=buybutton.replace('\n',' ')
def augment_description_with_images_advanced(csv_file_path, output_file_path, 
                                           img_style=None, 
                                           position='append'):
    """
    Advanced CSV processor that augments description with <img> tags for each image URL.
    
    Parameters:
    -----------
    csv_file_path : str
        Path to input CSV file
    output_file_path : str
        Path to output CSV file
    img_style : str, optional
        Custom CSS style for images (default: responsive styling)
    position : str, optional
        Where to place images: 'append' (end) or 'prepend' (beginning)
    """
    
    default_style = 'max-width: 100%; height: auto; margin: 10px 0; display: block;'
    img_style = img_style or default_style
    
    updated_rows = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8-sig') as file:  # Use utf-8-sig to handle BOM properly
            csv_reader = csv.reader(file)
            header = next(csv_reader)  # Read header
            print(header)
            
            # Find column indices (handle potential BOM in header)
            def find_column_index(headers, col_name):
                for i, h in enumerate(headers):
                    if h.strip('\ufeff').lower() == col_name.lower():
                        return i
                return None
            
            images_url_index = find_column_index(header, 'images_url')
            description_index = find_column_index(header, 'description')
            id_index = find_column_index(header, 'id')
            
            if images_url_index is None:
                print("❌ Error: 'images_url' column not found!")
                return False
            if description_index is None:
                print("❌ Error: 'description' column not found!")
                return False
            if id_index is None:
                print("❌ Error: 'id' column not found!")
                return False
            
            updated_rows.append(header)  # Add header to output
            
            for row_num, row in enumerate(csv_reader, start=2):
                row = list(row)  # Convert to list for modification
                
                # Get images_url and description (handle missing values)
                images_url = row[images_url_index] if images_url_index < len(row) else ""
                description = row[description_index] if description_index < len(row) else ""
                pr_id = row[id_index] if id_index < len(row) else ""  # Get actual product ID per row
                
                # Split images_url by comma and clean each URL
                image_urls = []
                if images_url:
                    image_urls = [url.strip() for url in images_url.split(',') if url.strip()]
                
                # Create <img> tags for each URL
                img_tags = []
                for i, url in enumerate(image_urls, 1):
                    # Ensure URL is valid (starts with http or is a path)
                    if url and (url.startswith(('http://', 'https://')) or '/' in url):
                        img_tag = f'<img src="{url}" alt="Product Image {i}" style="{img_style}" />'
                        img_tags.append(img_tag)
                
                # Prepare buy button HTML with actual product ID
                buy_button_html = buybutton.replace("<PR_ID>", str(pr_id))
                
                # Insert images and buy button based on position
                if img_tags:
                    if position == 'append':
                        # Add images at the END of description
                        if description.strip():
                            description += '\n\n'
                        description += '\n'.join(img_tags)
                        
                    elif position == 'prepend':
                        # Add buy button and images at the BEGINNING of description
                        prepend_content = buy_button_html
                        if img_tags:
                            prepend_content += '\n\n' + '\n'.join(img_tags)
                        
                        if description.strip():
                            description = prepend_content + '\n\n' + description
                        else:
                            description = prepend_content
                
                # Update the description in the row
                row[description_index] = description
                updated_rows.append(row)
                
                print(f"✅ Row {row_num}: Added {len(img_tags)} images ({position}d) with buy button (ID: {pr_id})")
            
            # Write updated CSV with explicit quoting for multi-line fields
            with open(output_file_path, 'w', newline='', encoding='utf-8') as file:
                csv_writer = csv.writer(file, quoting=csv.QUOTE_MINIMAL)  # Ensures fields with newlines are quoted
                csv_writer.writerows(updated_rows)
            
            print(f"\n🎉 SUCCESS! Updated CSV saved to: {output_file_path}")
            print(f"📊 Processed {len(updated_rows)-1} rows")
            return True
            
    except FileNotFoundError:
        print(f"❌ Error: File '{csv_file_path}' not found!")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

# =====================================================================
# MAIN EXECUTION
# =====================================================================

if __name__ == "__main__":
    # File paths
    INPUT_FILE = "vipderma_product.csv"      # Your input file
    OUTPUT_FILE = "product_updated2.csv"      # Output file
    
    # Customizable options
    IMG_STYLE = None  # Use default or set custom: 'width: 300px; height: auto; border-radius: 8px;'
    POSITION = 'prepend'  # 'append' or 'prepend'
    
    # Run the function
    success = augment_description_with_images_advanced(
        csv_file_path=INPUT_FILE,
        output_file_path=OUTPUT_FILE,
        img_style=IMG_STYLE,
        position=POSITION
    )
    
    if success:
        print("\n" + "="*50)
        print("✨ PROCESSING COMPLETE!")
        print(f"📁 Input:  {INPUT_FILE}")
        print(f"📁 Output: {OUTPUT_FILE}")
        print("💡 Check your updated CSV file! Open in a UTF-8 compatible editor like VS Code or Notepad++.")
        print("💡 If using Excel, import as UTF-8 CSV to preserve Persian text and multi-line fields.")
        print("="*50)