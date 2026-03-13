#!/usr/bin/env python3
"""
Orient Jet Offer Pipeline — Single CLI tool
Parses structured text output from the Claude Project and generates a branded 8-page PDF.

Usage:
    python3 run_offer.py input.txt              # Parse + generate PDF
    python3 run_offer.py input.txt -o output.pdf  # Specify output path
    python3 run_offer.py --paste                 # Paste from clipboard (reads stdin)

The input is the structured text output (Sections A–E) from the Claude Enterprise Project.
"""

import sys
import os
import re
import argparse
import json

# Add generator to path — run_offer.py sits alongside generate_branded_offer.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = SCRIPT_DIR
sys.path.insert(0, PROJECT_DIR)

from generate_branded_offer import generate_branded_offer


def parse_amount(s):
    """Parse a currency amount string like '₹ 5,79,52,500' or '$ 125,000.00' to a number."""
    s = s.strip()
    # Remove currency symbols and whitespace
    s = re.sub(r'[₹$\s]', '', s)
    # Remove commas
    s = s.replace(',', '')
    # Remove bold markers
    s = s.replace('**', '')
    if not s or s == '0' or s == '-':
        return 0
    try:
        return float(s) if '.' in s else int(s)
    except ValueError:
        return 0


def parse_cover_data(text):
    """Parse SECTION A: COVER PAGE DATA from code block."""
    data = {}
    # Find the code block after SECTION A
    cover_match = re.search(r'SECTION\s*A.*?```\s*(.*?)```', text, re.DOTALL | re.IGNORECASE)
    if not cover_match:
        # Try without code block — just key: value lines
        cover_match = re.search(r'SECTION\s*A.*?\n((?:(?:SERIES|DATE|PROFORMA|CUSTOMER|ORDER).*\n?)+)', text, re.IGNORECASE)

    block = cover_match.group(1) if cover_match else text

    patterns = {
        'series': r'SERIES\s*:\s*(.+)',
        'date': r'DATE\s*:\s*(.+)',
        'proforma_no': r'PROFORMA_NO\s*:\s*(.+)',
        'customer_name': r'CUSTOMER_NAME\s*:\s*(.+)',
        'customer_address': r'CUSTOMER_ADDRESS\s*:\s*(.+)',
        'order_type': r'ORDER_TYPE\s*:\s*(.+)',
    }

    for key, pattern in patterns.items():
        m = re.search(pattern, block, re.IGNORECASE)
        if m:
            data[key] = m.group(1).strip()

    return data


def parse_machine_spec(text):
    """Parse SECTION B: MACHINE SPECIFICATION — description + spec table."""
    result = {'machine_description': '', 'specifications': []}

    # Find machine description
    desc_match = re.search(r'MACHINE_DESCRIPTION\s*:\s*(.+)', text, re.IGNORECASE)
    if desc_match:
        desc = desc_match.group(1).strip().strip('"').strip("'")
        result['machine_description'] = desc

    # Find the specification table (Component | Details)
    # Look for lines that match table row pattern: | something | something |
    section_b = re.search(r'SECTION\s*B.*?(?=SECTION\s*C|$)', text, re.DOTALL | re.IGNORECASE)
    if not section_b:
        return result

    b_text = section_b.group(0)

    # Parse markdown table rows
    table_rows = re.findall(r'\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|', b_text)

    specs = []
    for name, details in table_rows:
        name = name.strip()
        details = details.strip()

        # Skip header rows and separator rows
        if name.lower() in ('component', '---', ''):
            continue
        if re.match(r'^-+$', name):
            continue

        # Split details by semicolons into separate lines
        detail_lines = [d.strip() for d in details.split(';') if d.strip()]

        specs.append({
            'name': name,
            'details': detail_lines
        })

    result['specifications'] = specs
    return result


def parse_pricing(text):
    """Parse SECTION C: EQUIPMENT PRICING — pricing table + ink + terms."""
    result = {
        'pricing_items': [],
        'pricing_note': '',
        'ink_prices': [],
        'installation_terms': '',
        'service_commitment': '',
    }

    section_c = re.search(r'SECTION\s*C.*?(?=SECTION\s*D|$)', text, re.DOTALL | re.IGNORECASE)
    if not section_c:
        return result

    c_text = section_c.group(0)

    # Parse the pricing table: | Sr. No. | Particulars | Qty | Amount |
    # Look for 4-column table rows
    table_rows = re.findall(r'\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|', c_text)

    total_price = 0
    for sr, particulars, qty, amount in table_rows:
        sr = sr.strip()
        particulars = particulars.strip().replace('**', '')
        qty = qty.strip()
        amount = amount.strip().replace('**', '')

        # Skip headers, separators
        if sr.lower() in ('sr. no.', 'sr.no.', 'sr no', '---', ''):
            if particulars.lower() in ('particulars', '---', ''):
                continue
        if re.match(r'^-+$', sr):
            continue

        # Parse amount
        price = parse_amount(amount)

        # Skip zero-qty items and subtotal rows
        if 'subtotal' in particulars.lower():
            continue
        if 'TOTAL OFFER PRICE' in particulars.upper() or 'total offer' in particulars.lower():
            total_price = price
            continue

        if price > 0:
            result['pricing_items'].append({
                'description': particulars,
                'price': price
            })

    # If we found a total but no line items, create a single line item
    if total_price > 0 and not result['pricing_items']:
        result['pricing_items'].append({
            'description': 'Total Equipment',
            'price': total_price
        })

    # If we found line items but no explicit total, add total as summary
    if result['pricing_items'] and total_price > 0:
        # Add total as the last item with a special marker
        result['total_price'] = total_price

    # Pricing note
    note_match = re.search(r'Pricing\s*Note\s*:?\s*\*{0,2}\s*(.*?)\s*\*{0,2}\s*(?:\n|$)', c_text, re.IGNORECASE)
    if note_match:
        note = note_match.group(1).strip().strip('*').strip()
        if note:
            result['pricing_note'] = f"*{note}"

    # Ink pricing
    ink_patterns = [
        (r'(?:Uncoated\s+Media\s+per\s+ltr\s+for\s+Black)\s*:?\s*([₹$]\s*[\d,]+(?:\.\d+)?)', 'Uncoated Media per ltr for Black'),
        (r'(?:Uncoated\s+Media\s+per\s+ltr\s+for\s+Cyan.*?Yellow)\s*:?\s*([₹$]\s*[\d,]+(?:\.\d+)?)', 'Uncoated Media per ltr for Cyan, Magenta, Yellow'),
        (r'(?:Coated\s+Media\s+HD\s+Ink\s+per\s+ltr)\s*:?\s*([₹$]\s*[\d,]+(?:\.\d+)?)', 'Coated Media HD Ink per ltr'),
    ]

    for pattern, desc in ink_patterns:
        m = re.search(pattern, c_text, re.IGNORECASE)
        if m:
            result['ink_prices'].append({
                'description': desc,
                'price': parse_amount(m.group(1))
            })

    # Installation terms
    install_match = re.search(r'Installation\s*(?:Terms)?\s*:?\s*\n?\s*(Installation:.*?)(?:\n\n|\*\*|$)', c_text, re.DOTALL | re.IGNORECASE)
    if not install_match:
        install_match = re.search(r'(Installation\s*:\s*By\s+Factory.*?Engineers\.)', c_text, re.DOTALL | re.IGNORECASE)
    if install_match:
        result['installation_terms'] = install_match.group(1).strip()

    # Service commitment — look in full text, not just section C
    svc_match = re.search(r'Service\s*Commitment\s*:?\s*\*{0,2}\s*\n?\s*(We\s+commit.*?)(?:\n\n|###|$)', text, re.DOTALL | re.IGNORECASE)
    if not svc_match:
        svc_match = re.search(r'(We\s+commit\s+to\s+providing\s+exceptional\s+service.*?cost\.)', text, re.DOTALL | re.IGNORECASE)
    if svc_match:
        result['service_commitment'] = svc_match.group(1).strip()

    return result


def parse_claude_output(text):
    """
    Parse the full structured output from the Claude Project into an offer_data dict
    compatible with generate_branded_offer().
    """
    # Parse each section
    cover = parse_cover_data(text)
    spec = parse_machine_spec(text)
    pricing = parse_pricing(text)

    # Determine currency and series type
    order_type = cover.get('order_type', 'DOMESTIC').upper()
    currency = 'USD' if 'INTERNATIONAL' in order_type else 'INR'

    series = cover.get('series', 'C SERIES')
    series_type = 'lp' if 'L&P' in series.upper() or 'L & P' in series.upper() else 'cseries'

    # Build offer_data dict
    offer_data = {
        'series_type': series_type,
        'series': series,
        'date': cover.get('date', ''),
        'proforma_no': cover.get('proforma_no', ''),
        'customer_name': cover.get('customer_name', '[Customer Name]'),
        'customer_address': cover.get('customer_address', '[Address]'),
        'machine_description': spec.get('machine_description', ''),
        'currency': currency,
        'specifications': spec.get('specifications', []),
        'pricing_items': pricing.get('pricing_items', []),
        'pricing_note': pricing.get('pricing_note', ''),
        'ink_prices': pricing.get('ink_prices', []),
        'installation_terms': pricing.get('installation_terms', ''),
        'service_commitment': pricing.get('service_commitment', ''),
    }

    return offer_data


def main():
    parser = argparse.ArgumentParser(
        description='Orient Jet Offer Pipeline — Parse Claude output → Generate branded PDF')
    parser.add_argument('input', nargs='?', help='Path to text file with Claude Project output')
    parser.add_argument('-o', '--output', help='Output PDF path (default: auto-generated)')
    parser.add_argument('--paste', action='store_true', help='Read from stdin (paste mode)')
    parser.add_argument('--json', action='store_true', help='Output parsed offer_data as JSON (no PDF)')
    parser.add_argument('--debug', action='store_true', help='Print parsed data before generating')

    args = parser.parse_args()

    # Read input
    if args.paste or (not args.input and not sys.stdin.isatty()):
        print("Reading from stdin... (paste Claude output, then Ctrl+D)")
        text = sys.stdin.read()
    elif args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        parser.print_help()
        sys.exit(1)

    if not text.strip():
        print("Error: Empty input")
        sys.exit(1)

    # Parse
    offer_data = parse_claude_output(text)

    if args.debug or args.json:
        print("=== Parsed offer_data ===")
        print(json.dumps(offer_data, indent=2, ensure_ascii=False))

    if args.json:
        return

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        # Auto-generate name from proforma number and customer
        proforma = offer_data.get('proforma_no', 'XXXXX').replace('/', '-')
        customer = offer_data.get('customer_name', 'Customer').replace(' ', '_')[:20]
        output_path = os.path.join(PROJECT_DIR, f"Offer_{proforma}_{customer}.pdf")

    # Generate
    print(f"\nGenerating branded PDF...")
    print(f"  Series: {offer_data['series']} ({offer_data['series_type']})")
    print(f"  Customer: {offer_data['customer_name']}")
    print(f"  Currency: {offer_data['currency']}")
    print(f"  Items: {len(offer_data['pricing_items'])} pricing lines")
    print(f"  Specs: {len(offer_data['specifications'])} specification sections")

    result = generate_branded_offer(offer_data, output_path)
    print(f"\nDone! PDF saved to: {result}")


if __name__ == "__main__":
    main()
