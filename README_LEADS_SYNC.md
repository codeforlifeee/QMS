# Comprehensive Lead Synchronization Workflow (Facebook -> Sheets -> QMS -> Supabase)

This document provides a highly detailed, step-by-step breakdown of the automated lead ingestion pipeline for the Traverse Globe QMS application. 

By utilizing Google Sheets as a middleware layer, we completely bypass the stringent review requirements, business verification, and Page Access Token expirations associated with the native Facebook Developer Webhooks.

---

## 1. High-Level Architecture
1. **Facebook Lead Ads:** Captures lead information via an instant form on Instagram/Facebook.
2. **Facebook to Google Sheets (Native Integration):** Facebook automatically appends the lead as a new row in a specific Google Sheet tab (`reel_43000`).
3. **Google Apps Script (The Trigger):** A hidden script inside the Google Sheet watches for new rows and immediately sends a ping to the QMS application.
4. **QMS Webhook (Render):** The Astro backend receives the ping, authenticates with Google via API key, and pulls the newest data from the sheet.
5. **Supabase (Database):** The QMS backend cleans the data and securely upserts it into the PostgreSQL database.
6. **QMS Dashboard:** The UI fetches the leads from Supabase for the sales team to manage.

---

## 2. Google Sheets Configuration

### A. Sharing Settings
Because QMS accesses this sheet programmatically using a Google Cloud API Key, the Google Sheet **must** be set to:
- **Share -> General Access -> "Anyone with the link" (Viewer)**
*Note: This does not compromise security significantly because the 44-character Google Sheet URL acts as a highly secure, unguessable password.*

### B. The Google Apps Script (Automated Ping)
To ensure leads sync the exact second they are submitted, a custom Google Apps Script runs silently in the background.

**Location:** Google Sheets -> Extensions -> Apps Script

**The Code:**
```javascript
function sendLeadsToApp() {
  // Target our live Render production URL
  var url = "https://qms-traverse-globe.onrender.com/api/webhooks/sheets";
  
  var options = {
    "method": "post",
    "muteHttpExceptions": true
  };
  
  // Fire and forget POST request
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response.getContentText());
}
```

**The Trigger Setup:**
In the Apps Script left-hand menu, under **Triggers (Alarm Clock Icon)**:
- **Choose which function to run:** `sendLeadsToApp`
- **Select event source:** `From spreadsheet`
- **Select event type:** `On change`

*Whenever a lead is added by Facebook, the sheet experiences a "Change", triggering this script immediately.*

---

## 3. QMS Application Backend

### A. The Webhook Endpoint (`src/pages/api/webhooks/sheets.ts`)
This is the Astro endpoint that listens for the Google Apps Script ping. It is a simple `POST` route that triggers the `syncFromSheet()` function.

### B. Security Overrides (`astro.config.mjs`)
Astro natively enforces strict CSRF protections on `POST` endpoints. Because the Google Apps Script does not send a standard `Origin` header, Astro would normally reject it with a `403 Forbidden` error. 
We disabled this specific check in `astro.config.mjs`:
```javascript
security: {
  checkOrigin: false
}
```

### C. Data Extraction & Column Mapping (`src/lib/sheetSync.ts`)
When triggered, `sheetSync.ts` uses the `GOOGLE_SHEETS_API_KEY` to download the entire `reel_43000` tab as JSON. 

It specifically maps Facebook's dynamically generated column headers to our database schema:
- `full_name` -> `customer_name`
- `phone_number` -> `phone`
- `when_are_you_planning?` -> `travelling_month`
- `planning_with` -> `planning_with`
- `number_of_adults_and_child_(below_9)?` -> `pax_summary`
- `any_special_arrangements(if_any)?` -> `special_arrangements`

### D. Supabase Insertion (`src/data/leadRepo.ts`)
Instead of performing a blind SQL `INSERT`, the code utilizes Supabase's `upsert` functionality.
The Google Sheet row ID (or `sheet_${i}`) is used as an `external_id`. 
- If `external_id` doesn't exist: It creates a new lead.
- If `external_id` already exists: It safely ignores or updates it. 
This guarantees **zero duplicate leads**, even if the webhook fires multiple times.

---

## 4. QMS Dashboard (Manual Sync UI)

To give administrators manual control, a **"Sync Leads Now"** button was added to the main Dashboard UI (`src/pages/index.astro`).

When clicked, the frontend runs a `fetch()` request directly to `/api/webhooks/sheets`. 
This is incredibly useful for:
1. Pulling in historical leads that were generated before the webhook was created.
2. Forcing a refresh if the Google Apps Script fails for any reason.

---

## 5. Environment Variables & Deployment (Render)

For this workflow to function in production, the Render.com web service **must** contain the following Environment Variables:

- `SUPABASE_URL`: The URL to the Supabase Postgres instance.
- `SUPABASE_SERVICE_KEY`: The master key for database operations.
- `GOOGLE_SHEETS_API_KEY`: A Google Cloud Platform API Key with access to the "Google Sheets API".

If any of these are missing, the manual sync button and the automatic webhook will return a `500 Internal Server Error`.
