# QMS Demo Recording Script

A step-by-step script for recording a screen-share video that walks through building a complete Dubai travel package from scratch, showcasing every feature.

**Estimated recording time:** 8-12 minutes

---

## Before you hit record

1. Make sure the server is running: `npm run dev` (http://localhost:4321)
2. Close other browser tabs to keep the screen clean
3. Open Chrome full-screen on http://localhost:4321
4. Make sure the catalog is imported (you should have `data/catalog/products.json`)

---

## SCENE 1 — Dashboard (30 seconds)

**What to show:** The home page with the quotation list.

1. Open **http://localhost:4321** — you land on the Quotations dashboard
2. Point out the existing quotations — each card shows the **status pill** (draft), **reference number**, **client name**, **pax count**, **nights**, and the **headline total** in INR
3. Point out the **Edit**, **Share**, and **PDF** buttons on each card
4. Click **"+ New quotation"** in the top right

---

## SCENE 2 — Client & Trip Details (1-2 minutes)

**What to show:** Filling in the header — the system auto-generated a reference number and pre-filled FX rates from the catalog.

1. You land in the editor. Note the **left panel** (form) and **right panel** (live A4 preview that updates as you type)
2. Fill in **Title**: `Dubai Family Escape — 5N/6D`
3. Fill in **Destination**: `Dubai, UAE`
4. Note the **Reference** is already generated (e.g. `TG-2026-0005`) — leave it or change it
5. Fill in **Client name**: `Rahul Sharma`
6. Fill in **Client phone**: `+91 98765 43210`
7. Fill in **Agent**: `Your Name`
8. Set **Travel from**: pick a date about 2 weeks from now
9. Set **Travel to**: 5 nights later (6 days)
10. Point out the **derived line** that appeared: "5 nights / 6 days"
11. Set **Adults**: `2`, **Children**: `1`, **Infants**: `0`
12. Point out it now says "5 nights / 6 days, 2 Adults, 1 Child"
13. **Glance at the right panel** — the document preview already shows the title, client name, dates, and pax

---

## SCENE 3 — Pricing Settings (30 seconds)

**What to show:** Quote currency, FX rate, and markup mode.

1. Note **Quote currency** is `INR` (this is what the client sees)
2. Note the **AED -> INR rate** is pre-filled (e.g. `23.45`) — this was pulled from your Package Calculator sheet automatically
3. **Markup mode** is "Per service (recommended)" — point out you can set different markup percentages for Hotels, Activities, and Transfers
4. Set **HOTEL %**: `15`, **ACTIVITY %**: `15`, **TRANSFER %**: `10`

---

## SCENE 4 — Build the Itinerary (2-3 minutes)

**What to show:** Adding days with titles and prose descriptions.

1. Scroll to **"Day-by-day itinerary"**
2. Click **"+ Add day"** six times to create Day 1 through Day 6
3. Fill in each day:

   **Day 1** — Title: `Arrival in Dubai`
   Prose: `Arrive at Dubai International Airport. Private transfer to your hotel. Check in and relax. Evening free for a leisurely walk along JBR Beach or Dubai Marina.`

   **Day 2** — Title: `Dubai City Tour & Burj Khalifa`
   Prose: `After breakfast, half-day city tour covering Old Dubai, Gold Souk, and Jumeirah Mosque. Afternoon visit to Burj Khalifa At the Top for stunning views of the city skyline.`

   **Day 3** — Title: `Desert Safari & BBQ Dinner`
   Prose: `Morning at leisure. Afternoon pick-up for an exciting desert safari experience — dune bashing, camel ride, henna painting. End the evening with a BBQ dinner under the stars.`

   **Day 4** — Title: `Abu Dhabi Day Trip`
   Prose: `Full-day excursion to Abu Dhabi. Visit the Sheikh Zayed Grand Mosque, Louvre Abu Dhabi, and drive along the Corniche. Return to Dubai by evening.`

   **Day 5** — Title: `Theme Parks & Shopping`
   Prose: `Spend the day at Aquaventure Waterpark or Dubai Mall — the world's largest shopping destination. Don't miss the Dubai Fountain show in the evening.`

   **Day 6** — Title: `Departure`
   Prose: `Check out and private transfer to Dubai International Airport for your flight home.`

4. **Glance at the right panel** — the itinerary now appears on the document with day numbers, titles, and prose

---

## SCENE 5 — Add a Hotel Line (1-2 minutes)

**What to show:** Adding a hotel line manually (hotels aren't in the catalog).

1. Scroll to **"Line items"**
2. Click **"+ hotel"** — a new HOTEL line appears and expands
3. Fill in:
   - **Label**: `JW Marriott Marquis — Deluxe Room`
   - **Description**: `5 nights with breakfast`
   - **Day**: select `Day 1: Arrival in Dubai`
   - **Priced per**: `Per room per night`
   - **Cost currency**: `AED`
   - **Base rate**: `0` (we'll use room details instead)
   - **Nights**: `5`
4. In the **Rooms** section that appeared, add a room:
   - Click "Add room"
   - **Room label**: `Deluxe King`
   - **Rate per night**: `450`
   - **Pax in room**: `2`
5. Add a second room for the child:
   - Click "Add room" again
   - **Room label**: `Standard Twin (child)`
   - **Rate per night**: `380`
   - **Pax in room**: `1`
6. Point out the **sell price** and **margin** shown on the collapsed line row
7. Point out the right panel now shows the hotel line in the price breakdown
8. Click **"Done editing"**

---

## SCENE 6 — Catalog Picker for Activities (2-3 minutes)

**What to show:** The star feature — picking products from the Package Calculator catalog.

### Activity 1: Burj Khalifa

1. Click **"+ activity"**
2. The line expands. Point out the **"Pick from catalog"** section at the top
3. Type `burj` in the search box
4. Watch the dropdown appear with matching results — each showing location, category, product name, transfer option, and AED cost
5. Click **"Burj Khalifa At the Top & Sky Views Tickets"** (the one with "Without Transfers")
6. Point out what just auto-filled:
   - Label = product name
   - Description = tour name
   - Cost currency = AED
   - Adult rate = the AED cost from the catalog
   - Supplier = "Rayna Tours"
7. Assign **Day**: `Day 2: Dubai City Tour & Burj Khalifa`
8. Set **Child pricing**: select `% of adult rate`, multiplier `0.50` (half price for children)
9. Click **"Done editing"**
10. Point out the total updated in the margin panel at the top of the preview

### Activity 2: Desert Safari

1. Click **"+ activity"** again
2. Type `safari` in the search box
3. Show the **filters** — click "filters" link, select Location: `Dubai`
4. Pick **"Desert Safari with BBQ Dinner"** from results
5. Assign to **Day 3**
6. Child pricing: `% of adult rate`, multiplier `0.75`
7. Click "Done editing"

### Activity 3: Abu Dhabi City Tour (use filters to browse)

1. Click **"+ activity"**
2. Click **"filters"** to show filter chips
3. Click Location: **"Abu Dhabi"** — the dropdown shows Abu Dhabi products even without typing
4. Type `louvre` to narrow down
5. Pick **"Louvre Museum"** from results
6. Assign to **Day 4**
7. Click "Done editing"

### Activity 4: Aquaventure Waterpark

1. Click **"+ activity"**
2. Type `aqua` in the search box
3. Pick **Aquaventure Waterpark** from results
4. Assign to **Day 5**
5. Click "Done editing"

---

## SCENE 7 — Add Transfers (1 minute)

**What to show:** Transfers also use the catalog picker.

1. Click **"+ transfer"**
2. Type `airport` in the search box
3. Pick an airport transfer (Private Transfers variant)
4. Assign to **Day 1**
5. Change **Priced per** to `Per group (flat)` if this is a fixed car transfer
6. Click "Done editing"

7. Add another **"+ transfer"** for the departure
8. Pick the same airport transfer
9. Assign to **Day 6**
10. Click "Done editing"

---

## SCENE 8 — Add a Visa Line (30 seconds)

**What to show:** Visa lines also use the catalog.

1. Click **"+ visa"**
2. Type `visa` in the search box or just browse
3. Pick a **UAE Tourist Visa** if available, or type manually:
   - Label: `UAE Tourist Visa (30 days)`
   - Cost currency: AED, Adult rate: `350`
   - Priced per: `Per person`
4. Click "Done editing"

---

## SCENE 9 — Mark a Line as Optional (30 seconds)

**What to show:** Optional lines appear on the document but don't count in the total.

1. Click on the **Aquaventure Waterpark** activity to expand it
2. Check the **"Optional"** checkbox — notice it says "shown on the document, excluded from the total"
3. Click "Done editing"
4. Point out in the right panel: the line now shows as "Optional — not included in the total below"
5. Point out the **grand total went down** because this line is excluded

---

## SCENE 10 — Add a Discount (30 seconds)

**What to show:** Discounts applied after markup, before tax.

1. Scroll to **"Discounts"**
2. Click **"+ Add discount"**
3. Set **Kind**: `% off (compounds)`
4. Set **Percent**: `5`
5. Set **Label**: `Early bird discount`
6. Watch the right panel — the price breakdown now shows the discount line and the total drops

---

## SCENE 11 — Inclusions, Exclusions, Terms (1 minute)

**What to show:** The fine print sections that appear on the document.

1. Scroll to **"Inclusions"** — type or edit:
   ```
   5 nights accommodation at JW Marriott Marquis with daily breakfast
   Airport transfers (private car)
   Burj Khalifa At the Top tickets
   Desert Safari with BBQ dinner
   Abu Dhabi city tour with Louvre Museum entry
   All applicable taxes
   ```

2. Scroll to **"Exclusions"** — type:
   ```
   International & domestic airfare
   Travel insurance
   Meals not mentioned
   Personal expenses, tips & gratuities
   Anything not mentioned in inclusions
   ```

3. Scroll to **"Payment schedule"** — it's pre-filled. Adjust if needed:
   ```
   50% at the time of booking confirmation
   Balance 30 days before travel date
   ```

4. Scroll to **"Terms"** — pre-filled with standard terms. Leave as-is.

5. **Glance at the right panel** — the "What's included / not included" section and "Payment & booking terms" section now appear on the document

---

## SCENE 12 — Review the Margin Panel (30 seconds)

**What to show:** The agent-only numbers that never appear on the client document.

1. Scroll back up and look at the **margin panel** at the top of the preview:
   - **Total (sell)** — what the client pays
   - **Cost** — what you pay the suppliers
   - **Margin** — your profit, with a percentage
2. Point out this is green when positive, red when negative
3. Point out per-line margins on each collapsed line row in the form
4. Emphasize: **none of this appears on the PDF the client receives**

---

## SCENE 13 — Autosave (10 seconds)

1. Point out the **"All changes saved"** badge at the top of the form
2. Every change autosaves within 600ms — no save button needed

---

## SCENE 14 — Download the PDF (30 seconds)

**What to show:** One-click PDF generation.

1. Click the **"Download PDF"** button in the top bar
2. The PDF downloads — open it to show:
   - Company branding at the top
   - Title, destination, client name
   - Duration, travel dates, travellers
   - Headline total + per-person price
   - Day-by-day itinerary with prose
   - Price breakdown table (sell prices only — no cost or margin visible)
   - Optional lines marked separately
   - Discount shown
   - Inclusions / exclusions
   - Payment schedule & terms
   - Footer with company contact info
3. Point out: **selectable text** (not an image), **embedded fonts**, **beautiful gradients preserved**

---

## SCENE 15 — Share with Client (30 seconds)

**What to show:** The share page with WhatsApp integration.

1. Click **"Preview share"** in the top bar (or go to the share URL from the dashboard)
2. A clean page opens showing the exact same document the PDF has
3. Point out the two buttons:
   - **"Download PDF"** — client can download directly
   - **"Share on WhatsApp"** — opens WhatsApp with a pre-written message containing the client's name, quotation title, reference, total, and the link
4. Copy the URL — this is what you'd send to the client

---

## SCENE 16 — Back to Dashboard (15 seconds)

1. Go back to **http://localhost:4321**
2. Show the new quotation in the list with its **title**, **reference**, **client name**, **pax**, **nights**, and **total**
3. Point out you can **Edit**, **Share**, or **PDF** any quotation from here

---

## Closing (15 seconds)

Recap what you just did in under a minute:

> "We built a complete 5-night Dubai family package in minutes. We filled in client details, built a 6-day itinerary, added a hotel, picked 4 activities directly from our supplier catalog with a few keystrokes, added transfers and a visa, marked one activity as optional, applied an early-bird discount, wrote out inclusions and exclusions, downloaded a professional PDF, and got a share link ready for WhatsApp — all with live preview and automatic margin tracking."

---

## Demo Package Summary

| Item | Type | Source |
|------|------|--------|
| JW Marriott Marquis (5N) | Hotel | Manual entry |
| Burj Khalifa At the Top | Activity | Catalog picker |
| Desert Safari + BBQ | Activity | Catalog picker |
| Louvre Abu Dhabi | Activity | Catalog picker |
| Aquaventure Waterpark | Activity (optional) | Catalog picker |
| Airport Transfer x2 | Transfer | Catalog picker |
| UAE Tourist Visa | Visa | Catalog / manual |
| Early bird discount | Discount | 5% off |

**Features showcased:**
- Auto-generated reference number
- FX rates pre-filled from catalog import
- Day-by-day itinerary builder
- Hotel with room allocations and per-night pricing
- Catalog search with typeahead
- Catalog filters (Location + Category)
- Child pricing (multiplier)
- Optional lines (excluded from total)
- Discounts (percentage-based)
- Inclusions / exclusions / payment terms
- Live A4 preview (exactly matches PDF)
- Margin panel (agent-only, hidden from client)
- Autosave
- One-click PDF download (vector, selectable text)
- Share page with WhatsApp integration
- Dashboard with all quotations listed
