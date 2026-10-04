# Package Calculator Catalog — User Guide

This guide explains how to use the catalog system that imports your **Package Calculator** Google Sheet (exported as `.xlsx`) into QMS, and how to use the in-editor product picker when building quotations.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Importing the Excel sheet](#2-importing-the-excel-sheet)
3. [What the import produces](#3-what-the-import-produces)
4. [Starting the dev server](#4-starting-the-dev-server)
5. [Using the Catalog Picker in the editor](#5-using-the-catalog-picker-in-the-editor)
6. [Updating the catalog with a new sheet](#6-updating-the-catalog-with-a-new-sheet)
7. [How pricing works after a pick](#7-how-pricing-works-after-a-pick)
8. [FAQ & troubleshooting](#8-faq--troubleshooting)

---

## 1. Prerequisites

- **Node.js 20+** installed
- **npm** installed
- QMS dependencies installed:
  ```
  cd QMS
  npm install
  ```
- Your **Package Calculator.xlsx** file (exported from Google Sheets → Download as Microsoft Excel)

---

## 2. Importing the Excel sheet

The importer reads the `.xlsx` file and converts it into JSON files that QMS uses at runtime.

### Step-by-step

1. **Export the Google Sheet** — open `Package Calculator` in Google Sheets, go to **File → Download → Microsoft Excel (.xlsx)**. Save the file somewhere on your computer (e.g. `C:\Users\LENOVO\Downloads\Package Calculator.xlsx`).

2. **Run the import script** — open a terminal in the `QMS` folder and run:

   ```
   npx tsx scripts/import-package-calculator.ts
   ```

   By default it looks for the file at `C:\Users\LENOVO\Downloads\Package Calculator.xlsx`. If your file is in a different location, pass the path as an argument:

   ```
   npx tsx scripts/import-package-calculator.ts "D:\My Files\Package Calculator.xlsx"
   ```

3. **Check the output** — you should see something like:

   ```
   Importing: C:/Users/LENOVO/Downloads/Package Calculator.xlsx

   Wrote 523 products (deduped from 530 source rows).
   Locations : Abu Dhabi (25), Dubai (498)
   Categories: 21
   Defaults  : markup=15.0%, AED/USD=3.65, INR/USD=85.59, INR/AED=23.4493
   ```

That's it. The catalog is now loaded into `data/catalog/`.

---

## 3. What the import produces

Two files are created in `data/catalog/`:

| File | Purpose |
|------|---------|
| `products.json` | All 523 products — each with location, category, tour name, product variant, transfer option, AED cost, USD cost, and supplier |
| `defaults.json` | House defaults extracted from the Calculator tab: AED/USD rate (3.65), INR/USD rate (85.59), and markup percentage (15%) |

These files are read by the server at startup. You don't need to edit them by hand.

**How `defaults.json` is used:** when you create a new quotation via the `/new` page, the FX rate and markup percentage are prefilled from these values — so every new quote starts with the same rates the team works with.

---

## 4. Starting the dev server

```
npm run dev
```

The server starts at **http://localhost:4321**. Open it in your browser.

- **Home page** (`/`) — lists all your quotations
- **New quotation** (`/new`) — creates a fresh draft and redirects to the editor
- **Editor** (`/edit/[id]`) — where you build and edit a quotation

---

## 5. Using the Catalog Picker in the editor

The catalog picker appears inside any **Activity**, **Transfer**, **Visa**, **Meal**, or **Misc** line. (Hotel and Flight lines don't have it — those are typed by hand.)

### Adding a line and picking from the catalog

1. **Open a quotation** — go to `/` and click an existing quotation, or visit `/new` to start a fresh one.

2. **Add or expand a line** — click the **+ Activity** (or + Transfer, + Visa, etc.) button to add a new line. Click the line header to expand it.

3. **Find the "Pick from catalog" section** — at the top of the expanded line, you'll see a search box labeled *"Type a product name, e.g. burj, safari, monorail..."*.

4. **Type to search** — start typing 3-4 letters of the product you want. Results appear in a dropdown as you type. Each result shows:
   - **Location & Category** (e.g. "Dubai · Adventure and Thrill")
   - **Product name** (e.g. "Burj Khalifa At the Top & Sky Views Tickets")
   - **Transfer option** (e.g. "Private Transfers" or "Without Transfers")
   - **AED cost** (e.g. "AED 151")

5. **Click a result** — the following fields are filled automatically:
   - **Label** → product name
   - **Description** → tour name
   - **Cost currency** → AED
   - **Adult rate** → the AED cost from the catalog
   - **Supplier** → "Rayna Tours"
   - **Catalog reference** → the product ID (for traceability)

6. **The total updates immediately** — the pricing engine recalculates the quotation total with the new line included.

### Using filters

If you're not sure of the exact product name, use filters to narrow down:

1. Click the **"filters"** link next to "Pick from catalog"
2. **Location chips** appear (e.g. "All", "Abu Dhabi", "Dubai") — click one to filter
3. **Category chips** appear (e.g. "Adventure and Thrill", "Boat Tours", "Culture and Attractions") — click one to filter
4. You can combine a location filter + category filter + a search term
5. Click **"All"** on either filter to clear it

### Browse mode

If you leave the search box empty but set a filter (e.g. Location = "Abu Dhabi"), the dropdown shows the first 10 matching products in that filter — handy for browsing what's available.

---

## 6. Updating the catalog with a new sheet

When your rates change or new products are added to the Google Sheet:

1. Export the updated `.xlsx` from Google Sheets (File → Download → Microsoft Excel)
2. Run the same import command:
   ```
   npx tsx scripts/import-package-calculator.ts "path/to/new/Package Calculator.xlsx"
   ```
3. Restart the dev server (`Ctrl+C` then `npm run dev`) — the server caches the catalog in memory, so a restart picks up the new data.

**Existing quotations are not affected.** Each quote stores a snapshot of the rate at the time the product was picked. Updating the catalog only changes what new picks will use.

---

## 7. How pricing works after a pick

When you pick a product from the catalog:

- The **AED cost** is copied onto the line as the adult rate
- The pricing engine converts it to your quote currency (INR by default) using the frozen FX rate on the quotation
- The **15% markup** (or whatever markup you've set) is applied to get the sell price
- The **per-person** and **grand total** update live in the preview panel

You can always override any of these values after picking — the catalog just gives you a starting point. Editing the rate on a line doesn't affect the catalog.

---

## 8. FAQ & Troubleshooting

### "No matches" when I search

- Try fewer letters — the search requires every word to match somewhere. "burj" works; "burj khalifa tickets" needs all three words to appear.
- Check your filters — if you have Location set to "Abu Dhabi" but the product is in Dubai, it won't show up. Click "All" to clear filters.
- Make sure the catalog was imported — check that `data/catalog/products.json` exists and is not empty.

### The import script fails with "not a zip (no EOCD)"

The file isn't a valid `.xlsx`. Make sure you downloaded it from Google Sheets as **Microsoft Excel (.xlsx)**, not as CSV or PDF.

### Costs show as 0 or weird numbers

The source sheet might have blank or non-numeric values in the AED/USD columns. The importer skips rows where AED cost is 0 or blank. Check the original sheet for data issues.

### I changed the Google Sheet but the editor still shows old prices

The catalog is cached in server memory. After re-importing, restart the dev server:
```
Ctrl+C
npm run dev
```

### Which line types support the catalog picker?

- Activity
- Transfer
- Visa
- Meal
- Misc

**Hotel** and **Flight** lines do not — hotel rates and flights aren't in the Package Calculator sheet and are entered manually.

### Can I edit a line after picking from the catalog?

Yes. The pick is a one-time copy. You can change the label, rate, supplier, or any other field after picking. The original catalog data is not affected.

### What about the "Sharing Transfers" / "Private Transfers" variants?

The importer handles these automatically. If the source sheet has a product priced with multiple transfer options (e.g. "Without Transfers", "Sharing Transfers", "Private Transfers"), each variant becomes a separate pickable row in the catalog. You'll see the transfer option displayed below the product name in the search results.
