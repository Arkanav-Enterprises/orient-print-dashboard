#!/usr/bin/env python3
"""
Orient Jet Branded Offer PDF Generator
Generates branded proposal PDFs matching the real offer template format.

Strategy:
- Pages 2-7 (boilerplate): Extracted from a template PDF (About Us, Orient Jet intro, 
  Client logos, Tech specs with photos)
- Page 1 (Cover): Generated with ReportLab using brand assets
- Page 8 (Machine Spec + Equipment Pricing): Generated with ReportLab using brand assets
- Final: [Cover] + [Boilerplate pages 2-7] + [Pricing page]
"""

import os
import json
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Spacer
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from pypdf import PdfReader, PdfWriter, PdfMerger

# ── PATHS (relative to this script's location) ───────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(_SCRIPT_DIR, "template_assets")
CSERIES_ASSETS = os.path.join(ASSETS_DIR, "cseries")
LP_ASSETS = os.path.join(ASSETS_DIR, "lp_series")

# Template PDFs (boilerplate source) — place these in template_assets/
CSERIES_TEMPLATE_PDF = os.path.join(ASSETS_DIR, "cseries", "25126_template.pdf")
LP_TEMPLATE_PDF = os.path.join(ASSETS_DIR, "lp_series", "24080A_template.pdf")

# Brand asset paths  
COVER_BG_CSERIES = os.path.join(CSERIES_ASSETS, "image3.png")       # Cover+OrientJet intro (full page)
MACHINE_SPEC_BG = os.path.join(CSERIES_ASSETS, "image17.jpg")       # Machine Spec page bg (grey sidebar + dots)
PRICING_BG = os.path.join(CSERIES_ASSETS, "image18.jpg")            # Pricing page bg (T&C sidebar + Thank You)
MACHINE_SPEC_TITLE = os.path.join(CSERIES_ASSETS, "image16.jpeg")   # "Machine Specification" text image
EQUIPMENT_PRICING_TITLE = os.path.join(CSERIES_ASSETS, "image19.jpeg")  # "Equipment Pricing" text image
ORIENTJET_CSERIES_LOGO = os.path.join(CSERIES_ASSETS, "image6.png") # OrientJet C-Series logo

# ── COLORS ─────────────────────────────────────────────────────────
RED_ORIENT = HexColor("#D42B2B")
GREY_DARK = HexColor("#555555")
GREY_MED = HexColor("#777777")
GREY_LIGHT = HexColor("#999999")
BLACK = HexColor("#000000")
WHITE = HexColor("#FFFFFF")

# ── FONTS ──────────────────────────────────────────────────────────
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("DejaVu", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Oblique", os.path.join(FONT_DIR, "DejaVuSans-Oblique.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-BoldOblique", os.path.join(FONT_DIR, "DejaVuSans-BoldOblique.ttf")))
pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold",
                               italic="DejaVu-Oblique", boldItalic="DejaVu-BoldOblique")

PAGE_W, PAGE_H = A4  # 595.27 x 841.89


def fmt_inr(amount):
    """Format number in Indian numbering system with ₹ symbol."""
    s = str(int(amount))
    if len(s) <= 3:
        return f"₹ {s}"
    last3 = s[-3:]
    rest = s[:-3]
    parts = []
    while len(rest) > 2:
        parts.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        parts.insert(0, rest)
    return f"₹ {','.join(parts)},{last3}"


def fmt_usd(amount):
    """Format number as USD."""
    return f"$ {amount:,.2f}"


def generate_cover_page(c, offer_data):
    """Generate page 1: Cover page with date, proforma no, series, customer."""
    c.setPageSize(A4)
    
    # Top-left decorative bars (grey + red)
    c.setFillColor(GREY_DARK)
    c.rect(45, PAGE_H - 80, 6, 60, fill=1, stroke=0)
    c.setFillColor(RED_ORIENT)
    c.rect(53, PAGE_H - 75, 6, 50, fill=1, stroke=0)
    
    # Date and Proforma number
    y = PAGE_H - 130
    c.setFont("DejaVu", 10)
    c.setFillColor(BLACK)
    c.drawString(120, y, f"Date : {offer_data['date']}")
    c.drawString(120, y - 16, f"Proforma Invoice No. : {offer_data['proforma_no']}")
    
    # "Proposal for" heading
    y = PAGE_H - 310
    c.setFont("DejaVu", 24)
    c.setFillColor(GREY_MED)
    c.drawString(100, y, "Proposal for")
    
    # OrientJet logo
    logo_path = ORIENTJET_CSERIES_LOGO
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 80, y - 80, width=300, height=43, 
                     preserveAspectRatio=True, mask='auto')
    
    # Series name
    series = offer_data.get('series', 'C SERIES')
    y_series = y - 110
    c.setFont("DejaVu-Bold", 20)
    c.setFillColor(RED_ORIENT)
    c.drawString(80, y_series, series)
    c.setFont("DejaVu-BoldOblique", 20)
    c.setFillColor(GREY_DARK)
    c.drawString(80 + c.stringWidth(series + " ", "DejaVu-Bold", 20), y_series, 
                 "Digital Inkjet Press")
    
    # "Proposal for:-" and customer name
    y_cust = PAGE_H - 560
    c.setFont("DejaVu-Bold", 12)
    c.setFillColor(BLACK)
    c.drawString(100, y_cust, "Proposal for:-")
    
    c.setFont("DejaVu-Bold", 12)
    c.drawString(100, y_cust - 22, f"M/s. {offer_data.get('customer_name', '[Customer Name]')}")
    
    if offer_data.get('customer_address'):
        c.setFont("DejaVu", 9)
        c.setFillColor(GREY_DARK)
        addr_lines = offer_data['customer_address'].split('\n')
        for i, line in enumerate(addr_lines[:3]):
            c.drawString(100, y_cust - 42 - (i * 14), line)
    
    # Bottom-right decorative element (grey triangle + red lines)
    c.setFillColor(HexColor("#E0E0E0"))
    c.saveState()
    path = c.beginPath()
    path.moveTo(PAGE_W - 100, 0)
    path.lineTo(PAGE_W, 0)
    path.lineTo(PAGE_W, 120)
    path.close()
    c.clipPath(path, stroke=0)
    c.setFillColor(HexColor("#DDDDDD"))
    c.rect(PAGE_W - 120, -10, 140, 140, fill=1, stroke=0)
    c.restoreState()
    
    # Red diagonal lines at bottom-right
    c.setStrokeColor(RED_ORIENT)
    c.setLineWidth(2)
    c.line(PAGE_W - 50, 15, PAGE_W - 15, 70)
    c.line(PAGE_W - 40, 10, PAGE_W - 5, 65)
    c.line(PAGE_W - 30, 5, PAGE_W + 5, 60)
    
    c.showPage()


def generate_machine_spec_pricing_page(c, offer_data):
    """Generate final page: Machine Specification + Equipment Pricing.

    Uses the pricing background image (image18.jpg) which includes:
    - Grey sidebar with 'Terms & Conditions' text
    - Red/grey decorative elements at top-right corner
    - Red/grey dotted pattern at bottom-left
    - 'THANK YOU' graphic at bottom-right
    """
    c.setPageSize(A4)

    # Draw pricing page background (includes T&C sidebar + Thank You graphic)
    if os.path.exists(PRICING_BG):
        c.drawImage(PRICING_BG, 0, 0, width=PAGE_W, height=PAGE_H)

    # Draw the dot decoration from Machine Spec bg at top-right only
    # (The pricing bg already has the sidebar + thank you, we just add dots)
    # Instead, draw dots manually for top-right decoration
    c.saveState()
    dot_color = HexColor("#AAAAAA")
    c.setFillColor(dot_color)
    dot_start_x = PAGE_W - 85
    dot_start_y = PAGE_H - 15
    for row in range(7):
        for col in range(10):
            x = dot_start_x + col * 8
            y_dot = dot_start_y - row * 8
            c.circle(x, y_dot, 1.8, fill=1, stroke=0)
    c.restoreState()

    # "Machine Specification" title image
    if os.path.exists(MACHINE_SPEC_TITLE):
        c.drawImage(MACHINE_SPEC_TITLE, 55, PAGE_H - 75, width=190, height=52,
                     preserveAspectRatio=True, mask='auto')

    # Machine spec description line
    y = PAGE_H - 100
    spec_desc = offer_data.get('machine_description',
        '4 Col, Duplex printing unit 540 mm (Print width)')
    c.setFont("DejaVu-Bold", 10)
    c.setFillColor(BLACK)
    c.drawString(160, y, spec_desc)

    # Spec bullet points
    specs = offer_data.get('specifications', [])
    y -= 22

    for spec in specs:
        # Diamond bullet
        c.setFillColor(RED_ORIENT)
        c.setFont("DejaVu", 7)
        c.drawString(165, y, "❖")
        c.setFillColor(BLACK)

        # Spec name (bold, underlined)
        c.setFont("DejaVu-Bold", 8)
        name = spec.get('name', '')
        name_w = c.stringWidth(name, "DejaVu-Bold", 8)
        c.drawString(180, y, name)
        c.setStrokeColor(BLACK)
        c.setLineWidth(0.5)
        c.line(180, y - 1.5, 180 + name_w, y - 1.5)

        # Spec details
        details = spec.get('details', [])
        y -= 12
        for detail in details:
            c.setFont("DejaVu", 7)
            c.setFillColor(GREY_DARK)
            c.drawString(185, y, detail)
            y -= 10

        y -= 4  # gap between spec sections

        if y < 120:
            break

    # ── "Equipment Pricing" section ──
    # Always position pricing in the lower portion with enough clearance
    pricing_y = min(y - 30, PAGE_H * 0.40)

    # Equipment Pricing title image - right-aligned like the real template
    if os.path.exists(EQUIPMENT_PRICING_TITLE):
        c.drawImage(EQUIPMENT_PRICING_TITLE, PAGE_W - 260, pricing_y + 5,
                     width=190, height=55, preserveAspectRatio=True, mask='auto')

    pricing_y -= 20

    # Pricing lines
    pricing_items = offer_data.get('pricing_items', [])
    currency = offer_data.get('currency', 'INR')

    for item in pricing_items:
        desc = item.get('description', '')
        price = item.get('price', 0)

        c.setFont("DejaVu-Bold", 9)
        c.setFillColor(BLACK)
        c.drawString(100, pricing_y, desc)

        if price > 0:
            if currency == 'USD':
                price_str = fmt_usd(price)
            else:
                price_str = fmt_inr(price)
            c.setFont("DejaVu-Bold", 9)
            price_w = c.stringWidth(price_str, "DejaVu-Bold", 9)
            c.drawString(PAGE_W - 100 - price_w, pricing_y, price_str)

        pricing_y -= 15
    
    # Additional pricing note (e.g., "*C&F Till Mumbai Port")
    if offer_data.get('pricing_note'):
        c.setFont("DejaVu-Bold", 8)
        c.setFillColor(BLACK)
        c.drawString(100, pricing_y, offer_data['pricing_note'])
        pricing_y -= 20
    
    # Ink pricing section
    ink_prices = offer_data.get('ink_prices', [])
    if ink_prices:
        pricing_y -= 5
        c.setFont("DejaVu-Bold", 9)
        c.setFillColor(BLACK)
        c.drawString(100, pricing_y, "Ink Price :-")
        pricing_y -= 16
        
        for ink in ink_prices:
            c.setFont("DejaVu", 8.5)
            c.drawString(100, pricing_y, ink.get('description', ''))
            if currency == 'USD':
                ink_str = fmt_usd(ink.get('price', 0))
            else:
                ink_str = fmt_inr(ink.get('price', 0))
            ink_w = c.stringWidth(ink_str, "DejaVu", 8.5)
            c.drawString(PAGE_W - 100 - ink_w, pricing_y, ink_str)
            pricing_y -= 14
    
    # Installation terms
    if offer_data.get('installation_terms'):
        pricing_y -= 10
        c.setFont("DejaVu-Bold", 8)
        c.setFillColor(BLACK)
        # Word wrap the installation terms
        terms = offer_data['installation_terms']
        max_width = PAGE_W - 200
        words = terms.split()
        lines = []
        current_line = ""
        for word in words:
            test = current_line + " " + word if current_line else word
            if c.stringWidth(test, "DejaVu-Bold", 8) < max_width:
                current_line = test
            else:
                lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        
        for line in lines[:3]:
            c.drawString(100, pricing_y, line)
            pricing_y -= 12
    
    # Service commitment
    if offer_data.get('service_commitment'):
        pricing_y -= 8
        c.setFont("DejaVu-Bold", 8)
        c.setFillColor(BLACK)
        commitment = offer_data['service_commitment']
        words = commitment.split()
        lines = []
        current_line = ""
        max_width = PAGE_W - 200
        for word in words:
            test = current_line + " " + word if current_line else word
            if c.stringWidth(test, "DejaVu-Bold", 8) < max_width:
                current_line = test
            else:
                lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        for line in lines[:2]:
            c.drawString(100, pricing_y, line)
            pricing_y -= 12
    
    # T&C links
    pricing_y -= 10
    c.setFont("DejaVu-Bold", 8)
    c.setFillColor(BLACK)
    c.drawString(100, pricing_y, "General Terms and Conditions")
    c.setFont("DejaVu", 7.5)
    c.drawString(100 + c.stringWidth("General Terms and Conditions ", "DejaVu-Bold", 8), 
                 pricing_y, "are applicable as published on")
    pricing_y -= 12
    c.setFillColor(HexColor("#0066CC"))
    c.drawString(100, pricing_y, "www.tphorient.com")
    c.setFillColor(BLACK)
    c.setFont("DejaVu", 7.5)
    c.drawString(100 + c.stringWidth("www.tphorient.com ", "DejaVu", 7.5), pricing_y,
                 "website on the following link")
    pricing_y -= 12
    c.setFillColor(HexColor("#0066CC"))
    c.setFont("DejaVu", 7)
    c.drawString(100, pricing_y, "https://tphorient.com/assets/pdf/domestic.pdf")
    c.setFillColor(BLACK)
    c.setFont("DejaVu", 7)
    c.drawString(100 + c.stringWidth("https://tphorient.com/assets/pdf/domestic.pdf ", "DejaVu", 7),
                 pricing_y, "for any orders in India and on the")
    pricing_y -= 12
    c.drawString(100, pricing_y, "following link ")
    c.setFillColor(HexColor("#0066CC"))
    c.drawString(100 + c.stringWidth("following link ", "DejaVu", 7), pricing_y,
                 "https://tphorient.com/assets/pdf/International.pdf")
    c.setFillColor(BLACK)
    c.drawString(100 + c.stringWidth("following link https://tphorient.com/assets/pdf/International.pdf ", "DejaVu", 7),
                 pricing_y, "for any orders outside of India.")
    
    # Thank You graphic (bottom-right) - draw from background image
    # The background image18.jpg already has the Thank You graphic
    
    c.showPage()


def generate_branded_offer(offer_data, output_path):
    """
    Main function: generates the full branded offer PDF.
    
    offer_data dict should contain:
        - series: "C SERIES" or "L&P Series"
        - date: "DD/MM/YYYY"
        - proforma_no: "26XXX"
        - customer_name: str
        - customer_address: str (newline-separated)
        - machine_description: str (e.g., "4 Col, Duplex printing unit 540 mm (Print width)")
        - specifications: [{name, details: [str]}]
        - pricing_items: [{description, price}]
        - pricing_note: str (e.g., "*C&F Till Mumbai Port")
        - ink_prices: [{description, price}]
        - installation_terms: str
        - service_commitment: str
        - currency: "INR" or "USD"
    """
    
    series_type = offer_data.get('series_type', 'cseries')  # 'cseries' or 'lp'
    
    # Select template PDF based on series
    if series_type == 'lp':
        template_pdf = LP_TEMPLATE_PDF
        boilerplate_start = 1   # page index 1 = page 2 (About Us)
        boilerplate_end = 7     # page index 7 = page 8 (up to but not including pricing)
    else:
        template_pdf = CSERIES_TEMPLATE_PDF
        boilerplate_start = 1   # page index 1 = page 2 (About Us)
        boilerplate_end = 7     # page index 7 = page 8 (everything except cover and last page)
    
    # Step 1: Generate dynamic pages (cover + pricing) as a temp PDF
    temp_cover = io.BytesIO()
    c = canvas.Canvas(temp_cover, pagesize=A4)
    generate_cover_page(c, offer_data)
    c.save()
    temp_cover.seek(0)
    
    temp_pricing = io.BytesIO()
    c2 = canvas.Canvas(temp_pricing, pagesize=A4)
    generate_machine_spec_pricing_page(c2, offer_data)
    c2.save()
    temp_pricing.seek(0)
    
    # Step 2: Extract boilerplate pages from template PDF
    template_reader = PdfReader(template_pdf)
    
    # Step 3: Merge everything
    writer = PdfWriter()
    
    # Page 1: Generated cover
    cover_reader = PdfReader(temp_cover)
    writer.add_page(cover_reader.pages[0])
    
    # Pages 2-7: Boilerplate from template
    for i in range(boilerplate_start, min(boilerplate_end, len(template_reader.pages))):
        writer.add_page(template_reader.pages[i])
    
    # Last page: Generated Machine Spec + Pricing
    pricing_reader = PdfReader(temp_pricing)
    writer.add_page(pricing_reader.pages[0])
    
    # Write final PDF
    with open(output_path, 'wb') as f:
        writer.write(f)
    
    print(f"Generated: {output_path}")
    print(f"Total pages: {len(writer.pages)}")
    return output_path


# ── DEMO: Generate offer matching the 540mm C-Series spec ──
if __name__ == "__main__":
    demo_data = {
        "series_type": "cseries",
        "series": "C SERIES",
        "date": "13/ 03/ 2026",
        "proforma_no": "26XXX",
        "customer_name": "[Customer Name]",
        "customer_address": "[Address Line 1]\n[City, State, PIN]\n[Country]",
        "machine_description": "4 Col, Duplex printing unit 540 mm (Print width)",
        "currency": "INR",
        "specifications": [
            {
                "name": "PRINT HEAD: (Kyocera Recirculating Head)",
                "details": [
                    "5 Print Heads X 4 Col X 2 Arrays",
                    "Printing Speed upto @ native 600 X 600 dpi 100 mtr/min;",
                    "(Printing speed as per specification provided by Kyocera)"
                ]
            },
            {
                "name": "ELECTRONIC",
                "details": ["Meteor, UK"]
            },
            {
                "name": "WEB TRANSPORT",
                "details": [
                    "Web Guide : E+L",
                    "Web Cleaner : Kelva",
                    "Antistatic",
                    "Media support: Coated & Uncoated Paper 40 to 240 g/m²*",
                    "IR dryer for duplex"
                ]
            },
            {
                "name": "UNWINDER",
                "details": [
                    "OD : 1000mm",
                    "Auto lift"
                ]
            },
            {
                "name": "INK DELIVERY SYSTEM",
                "details": [
                    "Orientjet Multi Level IDS",
                    "Aqueous based ink"
                ]
            },
            {
                "name": "RIP + Server",
                "details": [
                    "Harlequin RIP with VDP capability",
                    "HP/ Dell Server (Limited capacity for data handling)",
                    "*Conditions Applied"
                ]
            },
            {
                "name": "Inline customized finishing as per customers' specifications.",
                "details": [
                    "In-Line Sheeter / Offline Sheeter / Folder with Gathering"
                ]
            }
        ],
        "pricing_items": [
            {"description": "4Col Duplex 540mm Printing Unit with Book-block Sheeter", "price": 0},
            {"description": "600 x 600 dpi", "price": 57952500},
        ],
        "pricing_note": "*C&F Till Mumbai Port",
        "ink_prices": [
            {"description": "Uncoated Media per ltr for Black", "price": 3000},
            {"description": "Uncoated Media per ltr for Cyan, Magenta, Yellow", "price": 3200},
            {"description": "Coated Media HD Ink per ltr", "price": 4000},
        ],
        "installation_terms": "Installation: By Factory Trained Engineers @ ₹5000 per Day. However, The Buyer Has To Bear Expenses For Stay In Hotel, Food, Local, Transport and Medical Expenses For The Deputed Installation Engineers.",
        "service_commitment": "We commit to providing exceptional service for this machine over the next 7 years, including all spare parts and consumables, offered at a competitive cost.",
    }
    
    output = os.path.join(_SCRIPT_DIR, "DEMO_Branded_Offer.pdf")
    generate_branded_offer(demo_data, output)
