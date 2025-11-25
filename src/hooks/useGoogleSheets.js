import { useState, useEffect } from 'react';
import { SHEETS_CONFIG, APP_CONFIG } from '../constants/config';

export const useGoogleSheets = () => {
  const [data, setData] = useState({
    locations: [],
    categories: {},
    tours: {},
    products: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Check if data is still valid (cache)
  const isCacheValid = () => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < APP_CONFIG.CACHE_DURATION;
  };

  // Try to get cached data from localStorage
  const getCachedData = () => {
    try {
      const cached = localStorage.getItem('tourDataCache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isCacheValid()) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading cache:', err);
    }
    return null;
  };

  // Save data to localStorage cache
  const cacheData = (dataToCache) => {
    try {
      localStorage.setItem('tourDataCache', JSON.stringify(dataToCache));
      setLastFetch(Date.now());
    } catch (err) {
      console.warn('Error caching data:', err);
    }
  };

  // Transform raw Google Sheets data to structured format
  const transformToDropdownData = (rows) => {
    const dataRows = rows.slice(1); // Skip header row
    
    const locations = new Set();
    const categoriesMap = {};
    const toursMap = {};
    const products = [];
    
    dataRows.forEach((row) => {
      if (!row || row.length < 7) return; // Skip incomplete rows
      
      const [location, category, tour, product, transfer, costAED, costUSD] = row;
      
      if (!location || !category || !tour) return; // Skip rows missing key data
      
      locations.add(location.trim());
      
      // Build categories map
      if (!categoriesMap[location]) {
        categoriesMap[location] = new Set();
      }
      categoriesMap[location].add(category.trim());
      
      // Build tours map
      const locationCategoryKey = `${location}|${category}`;
      if (!toursMap[locationCategoryKey]) {
        toursMap[locationCategoryKey] = new Set();
      }
      toursMap[locationCategoryKey].add(tour.trim());
      
      // Store product data
      products.push({
        location: location.trim(),
        category: category.trim(),
        tour: tour.trim(),
        product: product.trim(),
        transfer: transfer.trim(),
        costAED: parseFloat(costAED) || 0,
        costUSD: parseFloat(costUSD) || 0,
        markup: (parseFloat(costAED) || 0) + APP_CONFIG.MARKUP,
      });
    });
    
    // Convert Sets to sorted Arrays
    const structuredData = {
      locations: Array.from(locations).sort(),
      categories: Object.fromEntries(
        Object.entries(categoriesMap).map(([loc, cats]) => [
          loc,
          Array.from(cats).sort(),
        ])
      ),
      tours: Object.fromEntries(
        Object.entries(toursMap).map(([key, tours]) => [
          key,
          Array.from(tours).sort(),
        ])
      ),
      products,
    };
    
    return structuredData;
  };

  // Fetch data from Google Sheets
  const fetchFromGoogleSheets = async () => {
    try {
      if (!SHEETS_CONFIG.API_KEY) {
        throw new Error(
          'Google Sheets API Key not configured. Please set VITE_GOOGLE_SHEETS_API_KEY in .env.local'
        );
      }

      if (!SHEETS_CONFIG.SHEET_ID) {
        throw new Error(
          'Google Sheets ID not configured. Please set VITE_SHEET_ID in .env.local'
        );
      }

      // Encode the range properly to handle special characters in sheet names
      const encodedRange = encodeURIComponent(SHEETS_CONFIG.COST_SHEET_RANGE);
      let url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SHEET_ID}/values/${encodedRange}?key=${SHEETS_CONFIG.API_KEY}`;
      
      console.log('Fetching from Google Sheets:', {
        sheetId: SHEETS_CONFIG.SHEET_ID,
        range: SHEETS_CONFIG.COST_SHEET_RANGE,
      });

      let response = await fetch(url);
      
      // If 400 error, the issue is likely API key restriction or sheet access
      if (response.status === 400) {
        console.warn('400 Error: API key may be restricted or sheet range invalid.');
        console.warn('Try:');
        console.warn('1. Verify API key has Google Sheets API enabled');
        console.warn('2. Check that API key is not restricted by IP or referer');
        console.warn('3. Ensure sheet tab "Rayna_cost" exists and is publicly shared');
        console.warn('4. Try creating a new unrestricted API key');
        
        // Try fetching metadata to check if the spreadsheet is accessible
        try {
          const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SHEET_ID}?key=${SHEETS_CONFIG.API_KEY}`;
          const metaResponse = await fetch(metaUrl);
          
          if (metaResponse.status === 400) {
            throw new Error('API Key is restricted or invalid. Sheets API may not be enabled.');
          } else if (metaResponse.status === 403) {
            throw new Error('Access denied. Check sheet sharing permissions.');
          }
        } catch (metaErr) {
          console.warn('Could not verify spreadsheet access:', metaErr.message);
        }
        
        throw new Error('Bad request. This usually means your API key is restricted. Check console logs for solutions.');
      }
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Check API key and sheet permissions.');
        }
        if (response.status === 404) {
          throw new Error('Sheet not found. Check Sheet ID.');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.values || result.values.length === 0) {
        throw new Error('No data found in sheet. Check that the sheet tab exists and contains data.');
      }

      const structuredData = transformToDropdownData(result.values);
      
      // Update state and cache
      setData(structuredData);
      cacheData(structuredData);
      setError(null);
      
      return structuredData;
    } catch (err) {
      console.error('Google Sheets fetch error:', err);
      console.error('Configuration check:', {
        apiKey: SHEETS_CONFIG.API_KEY ? `Set (length: ${SHEETS_CONFIG.API_KEY.length})` : '✗ Missing',
        sheetId: SHEETS_CONFIG.SHEET_ID ? '✓ Set' : '✗ Missing',
        range: SHEETS_CONFIG.COST_SHEET_RANGE,
      });
      
      // Try to use cached data as fallback
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setError(`Using cached data. Error: ${err.message}`);
      } else {
        setError(`Cannot fetch data: ${err.message}. Using sample data.`);
        // Set sample data for development
        setSampleData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Set sample/demo data for development
  const setSampleData = () => {
    const sampleData = {
      locations: ['Dubai', 'Abu Dhabi', 'Sharjah'],
      categories: {
        Dubai: ['Sightseeing Tours', 'Water Activities', 'Desert Safari', 'Night Activities'],
        'Abu Dhabi': ['Sightseeing Tours', 'Desert Safari'],
        Sharjah: ['City Tours', 'Beach Activities'],
      },
      tours: {
        'Dubai|Sightseeing Tours': ['Burj Khalifa', 'Dubai Museum', 'The Palm Monorail'],
        'Dubai|Water Activities': ['Dhow Cruise', 'Jet Ski', 'Speed Boat'],
        'Dubai|Desert Safari': ['Evening Safari', 'Morning Safari', 'Overnight Safari'],
        'Abu Dhabi|Sightseeing Tours': ['Sheikh Zayed Mosque', 'Louvre Abu Dhabi'],
      },
      products: [
        {
          location: 'Dubai',
          category: 'Sightseeing Tours',
          tour: 'Burj Khalifa',
          product: '124th Floor',
          transfer: 'Without Transfers',
          costAED: 140,
          costUSD: 38,
          markup: 145,
        },
        {
          location: 'Dubai',
          category: 'Sightseeing Tours',
          tour: 'Burj Khalifa',
          product: '124th + 125th Floor',
          transfer: 'Without Transfers',
          costAED: 189,
          costUSD: 51.5,
          markup: 194,
        },
        {
          location: 'Dubai',
          category: 'Desert Safari',
          tour: 'Evening Safari',
          product: 'Standard',
          transfer: 'With Transfers',
          costAED: 95,
          costUSD: 26,
          markup: 100,
        },
      ],
    };
    setData(sampleData);
    setError('Using sample data. Configure Google Sheets API for live data.');
  };

  // Initial fetch on component mount
  useEffect(() => {
    const cachedData = getCachedData();
    
    if (cachedData) {
      // Use cache if available
      setData(cachedData);
      setLoading(false);
      // Still try to refresh in background
      fetchFromGoogleSheets();
    } else {
      // Fetch from API
      fetchFromGoogleSheets();
    }
  }, []);

  // Manual refresh function
  const refetch = async () => {
    setLoading(true);
    await fetchFromGoogleSheets();
  };

  return { data, loading, error, refetch };
};
