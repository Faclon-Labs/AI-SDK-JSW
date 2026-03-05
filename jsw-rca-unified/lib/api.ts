// API service — all calls go through Next.js API routes (middleware proxy)
// The real backend URLs and credentials are never exposed to the client

export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const BASE = '/jsw-rca-unified';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('All retry attempts failed');
}

export async function fetchAllInsightResults() {
  return retryWithBackoff(async () => {
    const response = await fetch(`${BASE}/api/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fetchAll: true }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch insights');
    return data.results;
  });
}

export async function fetchInsightResultsByTimeRange(timeRange: TimeRange) {
  const startDateTime = `${timeRange.startDate}T${timeRange.startTime}:00.000`;
  const endDateTime = `${timeRange.endDate}T${timeRange.endTime}:59.999`;

  return retryWithBackoff(async () => {
    const response = await fetch(`${BASE}/api/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fetchAll: false, startDate: startDateTime, endDate: endDateTime }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch insights');
    return data.results;
  });
}

export async function fetchInsightResults({ startDate, endDate }: { startDate: string; endDate: string }) {
  const response = await fetch(`${BASE}/api/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fetchAll: false, startDate, endDate }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch insights');
  return data.results;
}
