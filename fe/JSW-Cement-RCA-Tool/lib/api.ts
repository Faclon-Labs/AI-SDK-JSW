// API service for connecting with the backend
import { BruceHandler } from '../../../connector-userid-ts/dist/index.js';

// Configuration for the backend connection
const BACKEND_CONFIG = {
  userId: '66792886ef26fb850db806c5', // Hardcoded user ID
  dataUrl: 'datads-ext.iosense.io', // Correct data URL
  onPrem: false
  // Removed tz parameter - times are passed as-is in IST format
};

// Initialize the BruceHandler
const bruceHandler = new BruceHandler(BACKEND_CONFIG);

// TimeRange interface to match the TimeRangePicker
export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

// Fetch all insight results (without date filter to get all available data)
export async function fetchAllInsightResults() {
  const insightId = 'INS_015ce0dcf91c';
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: {}, // No date filter to get all results
      pagination: { page: 1, count: 50 }, // Get more results
    });
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    throw error;
  }
}

// Fetch insight results for a given time range
export async function fetchInsightResultsByTimeRange(timeRange: TimeRange) {
  const insightId = 'INS_015ce0dcf91c';
  
  // Pass IST times as-is (no timezone conversion needed since tz=IST in backend config)
  const startDateTime = `${timeRange.startDate}T${timeRange.startTime}:00.000`;
  const endDateTime = `${timeRange.endDate}T${timeRange.endTime}:59.999`;
  
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: { 
        startDate: startDateTime,
        endDate: endDateTime
      },
      pagination: { page: 1, count: 50 },
    });
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results with time range:', error);
    throw error;
  }
}

// Fetch insight results for a given date range (legacy function)
export async function fetchInsightResults({ startDate, endDate }: { startDate: string; endDate: string }) {
  const insightId = 'INS_015ce0dcf91c';
  try {
    const result = await bruceHandler.fetchInsightResults({
      insightId,
      filter: { startDate, endDate },
      pagination: { page: 1, count: 10 },
    });
    return result.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    throw error;
  }
} 