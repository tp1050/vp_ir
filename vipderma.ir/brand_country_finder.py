import requests
import json
import re

def get_brand_origin(brand):
    """
    Fetches the country of origin for a cosmetics brand using Wikidata's free API (structured data).
    Falls back to Wikipedia parsing if needed. Prints API responses for debugging.
    Requires: pip install requests (if not installed).
    Tailored for cosmetics/beauty: appends 'cosmetics' to search for better matches.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Step 1: Wikidata search for the brand (cosmetics-focused)
    wd_search_url = "https://www.wikidata.org/w/api.php"
    search_params = {
        "action": "wbsearchentities",
        "search": f"{brand} ",
        "language": "en",
        "format": "json",
        "limit": 1
    }
    try:
        response = requests.get(wd_search_url, params=search_params, headers=headers)
        response.raise_for_status()
        wd_data = response.json()
        print("Wikidata search response:")
        print(json.dumps(wd_data, indent=2))
        print("\n---\n")
        
        if not wd_data.get('search'):
            # Fallback search without 'cosmetics'
            search_params["search"] = f"{brand} brand"
            response = requests.get(wd_search_url, params=search_params, headers=headers)
            response.raise_for_status()
            wd_data = response.json()
            print("Wikidata fallback search response:")
            print(json.dumps(wd_data, indent=2))
            print("\n---\n")
            if not wd_data.get('search'):
                print("Falling back to Wikipedia...")
                return get_wikipedia_origin(brand, headers)
        
        qid = wd_data['search'][0]['id']
        
        # Step 2: Get entity claims for country (P17) or HQ location (P159)
        get_entity_params = {
            "action": "wbgetentities",
            "ids": qid,
            "format": "json",
            "props": "claims|labels"
        }
        entity_response = requests.get(wd_search_url, params=get_entity_params, headers=headers)
        entity_response.raise_for_status()
        entity_data = entity_response.json()
        print(f"Wikidata entity data for {qid}:")
        print(json.dumps(entity_data, indent=2))
        print("\n---\n")
        
        entity = entity_data['entities'][qid]
        label = entity.get('labels', {}).get('en', {}).get('value', 'Unknown')
        
        # Check for country of origin (P17)
        if 'claims' in entity and 'P17' in entity['claims']:
            country_qid = entity['claims']['P17'][0]['mainsnak']['datavalue']['value']['id']
            # Get country label
            country_params = {"action": "wbgetentities", "ids": country_qid, "format": "json", "props": "labels"}
            country_resp = requests.get(wd_search_url, params=country_params, headers=headers)
            country_data = country_resp.json()['entities'][country_qid]['labels']['en']['value']
            print(f"Detected country (P17): {country_data}")
            return country_data
        
        # Fallback to HQ location (P159)
        if 'claims' in entity and 'P159' in entity['claims']:
            hq_qid = entity['claims']['P159'][0]['mainsnak']['datavalue']['value']['id']
            hq_params = {"action": "wbgetentities", "ids": hq_qid, "format": "json", "props": "labels"}
            hq_resp = requests.get(wd_search_url, params=hq_params, headers=headers)
            hq_data = hq_resp.json()['entities'][hq_qid]['labels']['en']['value']
            print(f"Detected HQ location: {hq_data}")
            # Simple mapping for known countries (expand as needed)
            country_map = {
                'Germany': 'Germany', 'United States': 'United States', 'France': 'France',
                'United Kingdom': 'United Kingdom', 'Switzerland': 'Switzerland', 'Italy': 'Italy'
                # Add more: e.g., 'New York City' -> 'United States'
            }
            for city, country in country_map.items():
                if city.lower() in hq_data.lower():
                    return country
            return hq_data  # Use as-is if it's a country
        
        print("No country/HQ in Wikidata; falling back to Wikipedia...")
        return get_wikipedia_origin(brand, headers)
    
    except requests.exceptions.RequestException as e:
        print(f"Wikidata request error: {str(e)}")
        print("Falling back to Wikipedia...")
        return get_wikipedia_origin(brand, headers)
    except Exception as e:
        print(f"Error: {str(e)}")
        return "Error fetching data"

def get_wikipedia_origin(brand, headers):
    """Fallback Wikipedia parser with infobox print for debugging."""
    search_url = "https://en.wikipedia.org/w/api.php"
    search_params = {
        "action": "query",
        "list": "search",
        "srsearch": f"{brand} cosmetics brand",
        "format": "json",
        "srlimit": 1
    }
    try:
        response = requests.get(search_url, params=search_params, headers=headers)
        response.raise_for_status()
        data = response.json()
        if not data.get('query', {}).get('search'):
            search_params["srsearch"] = brand
            response = requests.get(search_url, params=search_params, headers=headers)
            response.raise_for_status()
            data = response.json()
            if not data.get('query', {}).get('search'):
                return "No Wikipedia page found"
        
        title = data['query']['search'][0]['title']
        print(f"Wikipedia title: {title}")
        
        parse_params = {
            "action": "parse",
            "page": title,
            "prop": "wikitext",
            "format": "json"
        }
        parse_response = requests.get(search_url, params=parse_params, headers=headers)
        parse_response.raise_for_status()
        wikitext_data = parse_response.json()
        if 'parse' not in wikitext_data or 'wikitext' not in wikitext_data['parse']:
            return f"No wikitext for '{title}'"
        
        wikitext = wikitext_data['parse']['wikitext']['*']
        
        infobox_start = wikitext.find('{{Infobox')
        if infobox_start == -1:
            return "No infobox found"
        
        infobox_end = wikitext.find('}}', infobox_start)
        if infobox_end == -1:
            return "Incomplete infobox"
        
        infobox = wikitext[infobox_start:infobox_end + 2]
        print("Wikipedia infobox content:")
        print(infobox)
        print("\n---\n")
        
        # Enhanced patterns for cosmetics (e.g., 'area served', 'parent company' locations)
        patterns = [
            r'\| *country *=[^{|\n]*?([A-Z][a-zA-Z\s,]+?)(?=\||\n|\})',
            r'\| *origin *=[^{|\n]*?([A-Z][a-zA-Z\s,]+?)(?=\||\n|\})',
            r'\| *(headquarters?|hq|location) *=[^{|\n]*?([A-Z][a-zA-Z\s,]+?)(?=\||\n|\})',
            r'\| *founded *=[^{|\n]*?in[^{|\n]*?([A-Z][a-zA-Z\s,]+?)(?=\||\n|\})',
            r'\| *(area_served|parent) *=[^{|\n]*?([A-Z][a-zA-Z\s,]+?)(?=\||\n|\})'  # For parent co. or served areas
        ]
        
        for pattern in patterns:
            match = re.search(pattern, infobox, re.IGNORECASE | re.DOTALL)
            if match:
                value = match.group(1).strip() if len(match.groups()) > 1 else match.group(1).strip()
                # Strip wiki links more robustly
                value = re.sub(r'\[\[([^|\]]+?(\|[^|\]]+?)?)\]\]', r'\1', value)
                value = re.sub(r'\[\[|\]\]', '', value).strip()
                if ',' in value:
                    country_part = value.split(',')[-1].strip()
                else:
                    country_part = value
                country_keywords = [
                    'United States', 'USA', 'U.S.', 'UK', 'United Kingdom', 'Germany', 'France', 'Japan',
                    'China', 'Italy', 'Spain', 'Canada', 'Australia', 'India', 'Brazil', 'Milwaukee',
                    'New York', 'Wisconsin', 'Hamburg', 'Essen', 'Düsseldorf'  # Added German cities for cosmetics
                ]
                for kw in country_keywords:
                    if kw.lower() in country_part.lower():
                        if kw in ['Milwaukee', 'New York', 'Wisconsin', 'Hamburg', 'Essen', 'Düsseldorf']:
                            if 'Hamburg' in kw or 'Essen' in kw or 'Düsseldorf' in kw:
                                return 'Germany'
                            return 'United States'
                        return kw
                return country_part if len(country_part.split()) <= 3 else "Unknown (check manually)"
        
        return "Country not detected in infobox"
    
    except Exception as e:
        return f"Wikipedia error: {str(e)}"

# Example usage
if __name__ == "__main__":
    brand = input("Enter brand name: ").strip()
    origin = get_brand_origin(brand)
    print(f"\nThe origin country for '{brand}' is: {origin}")