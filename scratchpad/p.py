import csv
from urllib.parse import urljoin

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
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            header = next(csv_reader)  # Read header
            
            # Find column indices
            images_url_index = header.index('images_url') if 'images_url' in header else None
            description_index = header.index('description') if 'description' in header else None
            
            if images_url_index is None:
                print("❌ Error: 'images_url' column not found!")
                return False
            if description_index is None:
                print("❌ Error: 'description' column not found!")
                return False
            
            updated_rows.append(header)  # Add header to output
            
            for row_num, row in enumerate(csv_reader, start=2):
                row = list(row)  # Convert to list for modification
                
                # Get images_url and description (handle missing values)
                images_url = row[images_url_index] if images_url_index < len(row) else ""
                description = row[description_index] if description_index < len(row) else ""
                
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
                
                # Insert images based on position
                if img_tags:
                    if position == 'append':
                        # Add images at the END of description
                        if description.strip():
                            description += '\n\n'
                        description += '\n'.join(img_tags)
                    elif position == 'prepend':
                        # Add images at the BEGINNING of description
                        if description.strip():
                            description = '\n'.join(img_tags) + '\n\n' + description
                        else:
                            description = '\n'.join(img_tags)
                
                # Update the description in the row
                row[description_index] = description
                updated_rows.append(row)
                
                print(f"✅ Row {row_num}: Added {len(img_tags)} images ({position}d)")
            
            # Write updated CSV
            with open(output_file_path, 'w', newline='', encoding='utf-8') as file:
                csv_writer = csv.writer(file)
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
    INPUT_FILE = "product.csv"      # Your input file
    OUTPUT_FILE = "product_updated.csv"      # Output file
    
    # Customizable options
    IMG_STYLE = None  # Use default or set custom: 'width: 300px; height: auto; border-radius: 8px;'
    POSITION = 'append'  # 'append' or 'prepend'
    
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
        print("💡 Check your updated CSV file!")
        print("="*50)