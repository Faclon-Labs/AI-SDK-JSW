// API service for connecting with the backend

// TimeRange interface to match the TimeRangePicker
export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

// Retry mechanism with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}

// Fetch all insight results (without date filter to get all available data)
export async function fetchAllInsightResults() {
  return retryWithBackoff(async () => {
    try {
      const response = await fetch('/jsw-rca-new/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fetchAll: true }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      return data.results;
    } catch (error) {
      console.error('Error fetching insight results:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  });
}

// Fetch insight results for a given time range
export async function fetchInsightResultsByTimeRange(timeRange: TimeRange) {
  console.log('Fetching insight results for time range:', timeRange);

  const startDateTime = `${timeRange.startDate}T${timeRange.startTime}:00.000`;
  const endDateTime = `${timeRange.endDate}T${timeRange.endTime}:59.999`;

  return retryWithBackoff(async () => {
    try {
      const response = await fetch('/jsw-rca-new/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fetchAll: false,
          startDate: startDateTime,
          endDate: endDateTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      console.log('Time range API response:', data);
      console.log('Number of results returned:', data.results?.length || 0);
      return data.results;
    } catch (error) {
      console.error('Error fetching insight results with time range:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  });
}

// Fetch insight results for a given date range (legacy function)
export async function fetchInsightResults({ startDate, endDate }: { startDate: string; endDate: string }) {
  try {
    const response = await fetch('/jsw-rca-new/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fetchAll: false,
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch insights');
    }

    return data.results;
  } catch (error) {
    console.error('Error fetching insight results:', error);
    throw error;
  }
} 