# Orient Jet Digital Machine Pricing Logic

## How to Select the Right Price Sheet

The Excel file `KNOWLEDGE_Price_List_Digital.xlsx` contains 5 sheets:

| Sheet Name | Machine Series | Resolution | Print Head Options |
|---|---|---|---|
| C Series_PH 600 dpi | C-Series | 600x600 dpi | Kyocera RC, Kyocera Katana, Epson D, Epson I, Epson S |
| C Series_PH 1200 dpi | C-Series | 1200 dpi | Kyocera RC |
| L&P Series PH 600 dpi | L&P Series | 600x600 dpi | Kyocera Katana, Epson D |
| L&P Series PH 1200 dpi | L&P Series | 1200 dpi | Kyocera Katana, Epson D |
| 1 Extra Colour | L&P Series | Extra colour add-on | Kyocera Katana, Epson D |

**Step 1**: Match machine series (C-Series or L&P Series) + resolution (600 or 1200 dpi) to pick the sheet.
**Step 2**: Within the sheet, match the print head technology. Each head technology is a separate column group.

**Default print head**: Unless specified, use the FIRST column group (Kyocera RC for C-Series, Kyocera Katana for L&P).

## Sheet Structure (Each Column Group)

Each print head column group contains these columns in order:
- **Particulars** (row labels)
- **Quantity**
- **Unit Price** (base cost)
- **Actual** (unit price with markup, typically 1.1x or 1.3x of unit price)
- **Total Cost** (Quantity × Actual)

### Row Structure

**Header rows (rows 0-6)**:
- Row 0: Title / resolution confirmation
- Row 1: Print Width (mm)
- Row 2: Duplex/Simplex (2 = duplex, 1 = simplex) — C-Series only
- Row 3: No. of Colours
- Row 4: Print head model + max width
- Row 5: Head price per unit
- Row 6: Total heads required

**Core cost rows (rows 8-11)**:
- Row 8: IDS (Ink Delivery System) boards
- Row 9: Total head cost
- Row 10: Total electronics cost
- Row 11: **Subtotal** (IDS + heads + electronics)

**Add-on component rows (rows 12-21)** — each configurable by quantity:
- Row 12: Unwind Unit
- Row 13: Printing Unit
- Row 14: IR Drying
- Row 15: Extra for Wide Web
- Row 16: Coating + Drying
- Row 17: Rewind Unit
- Row 18: RIP + Server + Imp Software
- Row 19: Sheeter
- Row 20: Miscellaneous
- Row 21: Installation

**Final pricing rows**:
- Row 22: **Total Cost** = Subtotal + all add-ons
- Row 23: **GM Price** = Total Cost / (1 - GM%) where GM% is typically 0.20 (20%)
- Row 24: **Partner/General Price** = GM Price / (1 - Partner%) where Partner% is typically 0.10 (10%)

## How to Calculate for a Different Print Width

The sheet defaults show one configuration. When the user specifies a different print width:

### Head Count Calculation
1. **Kyocera RC** heads cover **108mm** of width each
2. **Kyocera Katana** heads — check width column in row 4 to determine coverage
3. **Epson D** heads cover approximately **~21.4mm** each (857mm / 40 heads)

**Formula**: `heads_per_color_per_side = ceil(print_width / head_coverage_mm)`

**Total heads** = `heads_per_color_per_side × num_colors × duplex_factor`

Where:
- `num_colors` = from user spec (typically 4 for CMYK)
- `duplex_factor` = 2 for duplex, 1 for simplex

### Core Cost Recalculation
- **IDS boards** = num_colors × duplex_factor (typically 8 for 4-color duplex)
- **Total head cost** = total_heads × actual_head_price
- **Total electronics cost** = (total_heads / 2) × actual_elec_price [ratio: 1 electronics unit per 2 heads for Kyocera RC]

### Add-on Costs
Add-on prices are FIXED (not affected by width). Just use the quantity from the user's specification × the "Actual" price from the sheet.

## Final Price to Quote

The **MRP / Offer Price** to present to the customer is the **GM Price** (row 23).

The Partner/General Price (row 24) is an internal number and should NOT appear on offers.

## Currency

- **Domestic offers**: Prices in INR (Indian Rupees, ₹)
- **International offers**: Prices in USD ($) — convert using current exchange rate or as specified

## Important Notes

- All prices exclude GST (for domestic) or applicable taxes/duties (for international)
- Prices are Ex Works (EXW) - TPH's plant at Ballabhgarh
- Prices valid for 30 days
- Standard delivery: 4 months from date of advance (domestic), can be adjusted per order
