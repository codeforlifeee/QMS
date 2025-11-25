import { useState, useEffect, useCallback } from 'react';
import { calculateTripDuration, calculateFinalCost } from '../utils/calculations';

const STORAGE_KEY = 'quotationFormState';
const AUTO_SAVE_DELAY = 30000; // 30 seconds

export const useQuotation = () => {
  const [quotation, setQuotation] = useState({
    // Basic Details
    guestName: '',
    totalAdults: 2,
    totalChildren: 0,
    travelDates: {
      from: '',
      to: '',
    },
    travelType: 'Leisure',
    
    // Cost Items
    flights: {
      included: false,
      adultCost: 0,
      childCost: 0,
    },
    visa: {
      included: true,
      adultCost: 295,
      childCost: 0,
    },
    
    // Selected Activities/Tours
    selectedActivities: [],
    
    // Additional Costs
    accommodation: [],
    meals: [],
    transfers: [],
    
    // Itinerary
    itinerary: [],
    
    // Cost Calculations
    costs: {
      subtotal: 0,
      gstAmount: 0,
      finalTotal: 0,
      perPersonCost: 0,
    },
    includeGST: false,
    tripDuration: {
      days: 0,
      nights: 0,
    },
  });

  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setQuotation(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load saved quotation:', err);
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    // Clear previous timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quotation));
        setIsSaved(true);
        setSaveError(null);
        
        // Reset saved indicator after 2 seconds
        setTimeout(() => setIsSaved(false), 2000);
      } catch (err) {
        setSaveError('Failed to save quotation');
        console.error('Auto-save error:', err);
      }
    }, AUTO_SAVE_DELAY);

    setAutoSaveTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [quotation]);

  // Update basic details
  const updateBasicDetails = useCallback((details) => {
    setQuotation((prev) => {
      let updated = { ...prev, ...details };

      // Auto-calculate trip duration if dates change
      if (details.travelDates) {
        const duration = calculateTripDuration(
          details.travelDates.from,
          details.travelDates.to
        );
        updated.tripDuration = duration;
      }

      return updated;
    });
  }, []);

  // Add selected activity
  const addActivity = useCallback((activity) => {
    setQuotation((prev) => {
      const updated = { ...prev };
      updated.selectedActivities = [...prev.selectedActivities, activity];
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Remove selected activity by index
  const removeActivity = useCallback((index) => {
    setQuotation((prev) => {
      const updated = { ...prev };
      updated.selectedActivities = prev.selectedActivities.filter(
        (_, i) => i !== index
      );
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Update selected activity
  const updateActivity = useCallback((index, activity) => {
    setQuotation((prev) => {
      const updated = { ...prev };
      updated.selectedActivities[index] = activity;
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Calculate and update costs
  const updateCosts = useCallback((quotationData) => {
    let subtotal = 0;

    // Activities cost
    quotationData.selectedActivities.forEach((activity) => {
      const activityCost =
        activity.costAED *
        (quotationData.totalAdults * 1 + quotationData.totalChildren * 0.5);
      subtotal += activityCost;
    });

    // Flights cost
    if (quotationData.flights.included) {
      subtotal +=
        quotationData.flights.adultCost * quotationData.totalAdults +
        quotationData.flights.childCost * quotationData.totalChildren;
    }

    // Visa cost
    if (quotationData.visa.included) {
      subtotal +=
        quotationData.visa.adultCost * quotationData.totalAdults +
        quotationData.visa.childCost * quotationData.totalChildren;
    }

    // Calculate final costs
    const costBreakdown = calculateFinalCost(
      subtotal,
      quotationData.includeGST
    );
    const totalPax = quotationData.totalAdults + quotationData.totalChildren;
    const perPersonCost = totalPax > 0 ? costBreakdown.finalTotal / totalPax : 0;

    quotationData.costs = {
      subtotal: costBreakdown.subtotal,
      gstAmount: costBreakdown.gstAmount,
      finalTotal: costBreakdown.finalTotal,
      perPersonCost: Math.round(perPersonCost),
    };
  }, []);

  // Add day to itinerary
  const addDay = useCallback((dayData = {}) => {
    setQuotation((prev) => {
      const dayNumber = prev.itinerary.length + 1;
      const newDay = {
        day: dayNumber,
        title: dayData.title || `DAY ${dayNumber}`,
        description: dayData.description || '',
        activities: dayData.activities || [],
        meals: dayData.meals || 'No Meal',
        accommodation: dayData.accommodation || '',
        options: dayData.options || [],
        imageUrl: dayData.imageUrl || '',
      };

      return {
        ...prev,
        itinerary: [...prev.itinerary, newDay],
      };
    });
  }, []);

  // Remove day from itinerary
  const removeDay = useCallback((dayIndex) => {
    setQuotation((prev) => {
      const updated = {
        ...prev,
        itinerary: prev.itinerary
          .filter((_, i) => i !== dayIndex)
          .map((day, i) => ({ ...day, day: i + 1 })), // Renumber days
      };
      return updated;
    });
  }, []);

  // Update day in itinerary
  const updateDay = useCallback((dayIndex, dayData) => {
    setQuotation((prev) => {
      const updated = { ...prev };
      updated.itinerary[dayIndex] = {
        ...prev.itinerary[dayIndex],
        ...dayData,
      };
      return updated;
    });
  }, []);

  // Toggle flights inclusion
  const toggleFlights = useCallback((included) => {
    setQuotation((prev) => {
      const updated = {
        ...prev,
        flights: { ...prev.flights, included },
      };
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Toggle visa inclusion
  const toggleVisa = useCallback((included) => {
    setQuotation((prev) => {
      const updated = {
        ...prev,
        visa: { ...prev.visa, included },
      };
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Toggle GST
  const toggleGST = useCallback((includeGST) => {
    setQuotation((prev) => {
      const updated = {
        ...prev,
        includeGST,
      };
      updateCosts(updated);
      return updated;
    });
  }, []);

  // Clear all data
  const clearAll = useCallback(() => {
    setQuotation({
      guestName: '',
      totalAdults: 2,
      totalChildren: 0,
      travelDates: { from: '', to: '' },
      travelType: 'Leisure',
      flights: { included: false, adultCost: 0, childCost: 0 },
      visa: { included: true, adultCost: 295, childCost: 0 },
      selectedActivities: [],
      accommodation: [],
      meals: [],
      transfers: [],
      itinerary: [],
      costs: { subtotal: 0, gstAmount: 0, finalTotal: 0, perPersonCost: 0 },
      includeGST: false,
      tripDuration: { days: 0, nights: 0 },
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Export quotation data
  const exportData = useCallback(() => {
    return JSON.stringify(quotation, null, 2);
  }, [quotation]);

  // Import quotation data
  const importData = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      setQuotation(imported);
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }, []);

  return {
    quotation,
    isSaved,
    saveError,
    updateBasicDetails,
    addActivity,
    removeActivity,
    updateActivity,
    addDay,
    removeDay,
    updateDay,
    toggleFlights,
    toggleVisa,
    toggleGST,
    clearAll,
    exportData,
    importData,
  };
};
