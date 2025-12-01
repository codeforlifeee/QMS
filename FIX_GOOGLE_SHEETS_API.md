# 🔧 Fix Google Sheets API Error (400 Bad Request)

## ❌ Current Error
```
GET https://sheets.googleapis.com/v4/spreadsheets/1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM/values/Rayna_cost!A1%3AG1000?key=AIzaSyCs_xT548bWZ39rKmrvadLOGOIR3HNFj7w 400 (Bad Request)
```

**Cause:** Your API key `AIzaSyCs_xT548bWZ39rKmrvadLOGOIR3HNFj7w` is restricted and cannot access the Google Sheets API.

---

## ✅ Solution: Remove API Key Restrictions

### Option 1: Remove All Restrictions (Quickest)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials

2. **Find your API key:**
   - Look for `AIzaSyCs_xT548bWZ39rKmrvadLOGOIR3HNFj7w`
   - Click on the API key name

3. **Remove restrictions:**
   - Under **"API restrictions"**, select **"Don't restrict key"**
   - Click **"Save"**

4. **Refresh your application**
   - Wait 1-2 minutes for changes to take effect
   - Click the "Refresh Data" button in your app

---

### Option 2: Restrict to Google Sheets API Only (More Secure)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/apis/credentials

2. **Find your API key:**
   - Click on `AIzaSyCs_xT548bWZ39rKmrvadLOGOIR3HNFj7w`

3. **Set API restrictions:**
   - Under **"API restrictions"**, select **"Restrict key"**
   - Click **"Select APIs"**
   - Find and check **"Google Sheets API"**
   - If not listed, you need to enable it first (see below)
   - Click **"Save"**

4. **Refresh your application**

---

### Option 3: Create a New Unrestricted API Key

1. **Go to:**
   - https://console.cloud.google.com/apis/credentials

2. **Create new API key:**
   - Click **"+ CREATE CREDENTIALS"**
   - Select **"API key"**
   - Copy the new API key

3. **Update your `.env.local` file:**
   ```env
   VITE_GOOGLE_SHEETS_API_KEY=YOUR_NEW_API_KEY_HERE
   ```

4. **Restart your development server:**
   ```bash
   npm run dev
   ```

---

## 🔍 Enable Google Sheets API

If Google Sheets API is not enabled in your project:

1. **Go to:**
   - https://console.cloud.google.com/apis/library

2. **Search for:**
   - "Google Sheets API"

3. **Enable it:**
   - Click on "Google Sheets API"
   - Click **"ENABLE"** button

4. **Wait a moment**, then try again

---

## 📋 Make Your Sheet Public

Your sheet must be publicly accessible for the API to read it:

1. **Open your sheet:**
   - https://docs.google.com/spreadsheets/d/1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM/edit

2. **Share the sheet:**
   - Click **"Share"** button (top-right corner)
   - Under **"General access"**, select **"Anyone with the link"**
   - Set permission to **"Viewer"**
   - Click **"Done"**

---

## 🧪 Test Your Setup

After making changes, test in your browser console:

```javascript
fetch('https://sheets.googleapis.com/v4/spreadsheets/1gEu2lwx835VciZOGC6DZNTpbWkvp9EYM/values/Rayna_cost!A1:G1000?key=YOUR_API_KEY')
  .then(r => r.json())
  .then(data => console.log('Success!', data))
  .catch(err => console.error('Failed:', err));
```

Replace `YOUR_API_KEY` with your actual API key.

---

## 📊 Verify Sheet Structure

Make sure your sheet has a tab named **"Rayna_cost"** with these columns:

| Column | Header | Example |
|--------|--------|---------|
| A | Location | Dubai |
| B | Category | Activities |
| C | Tour | Desert Safari |
| D | Product | Standard |
| E | Transfer | With Transfer |
| F | Cost AED | 250 |
| G | Cost USD | 68 |

---

## 🆘 Still Not Working?

### Check Console Errors
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for specific error messages

### Common Issues:
- **403 Error:** Sheet is not public
- **404 Error:** Sheet ID is wrong or tab name doesn't match
- **400 Error:** API key restrictions (this guide fixes this)

### Quick Fix: Use Sample Data
The app automatically falls back to sample data when Google Sheets fails. You can continue developing with sample data while fixing the API issue.

---

## ✅ Success Checklist

- [ ] API key has no restrictions OR is restricted to Google Sheets API only
- [ ] Google Sheets API is enabled in your project
- [ ] Your spreadsheet is publicly shared (Anyone with link = Viewer)
- [ ] Sheet tab named "Rayna_cost" exists
- [ ] Data is in columns A through G
- [ ] Waited 1-2 minutes after making changes
- [ ] Refreshed the application

---

## 📞 Need More Help?

Check the detailed documentation:
- Google Sheets API: https://developers.google.com/sheets/api/guides/concepts
- API Keys: https://cloud.google.com/docs/authentication/api-keys
