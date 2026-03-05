// Direct backend API calls — pure CSR, no server required

import { getStoredAuth } from './auth';

const CONNECTOR_URL = 'https://connector.iosense.io';
const AI_SDK_URL = `${CONNECTOR_URL}/api/account/ai-sdk`;
const INSIGHT_ID = 'INS_a7bca70a5160';
const CURSOR_LIMIT = 1000;

function getAuth() {
  const auth = getStoredAuth();
  if (!auth) throw new Error('Not authenticated. Please log in via IOsense portal.');
  return auth;
}

export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

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


async function fetchInsightResultsFromBackend(startDate?: string, endDate?: string) {
  const { userId, orgId, token } = getAuth();
  const url = `${CONNECTOR_URL}/api/account/bruce/insightResult/fetch/paginated/${INSIGHT_ID}`;
  const filter = startDate
    ? { startDate, endDate, insightProperty: [], tags: undefined }
    : { startDate: undefined, endDate: undefined, insightProperty: [], tags: undefined };
  const payload = {
    filter,
    user: { id: userId, organisation: orgId },
    pagination: { page: 1, count: 1000 },
  };
  return retryWithBackoff(async () => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { userID: userId, Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);
    const data = await response.json();
    if (!data.success || !data.data) throw new Error(`Unsuccessful response: ${JSON.stringify(data)}`);
    return data.data.data;
  });
}

export async function fetchAllInsightResults() {
  return fetchInsightResultsFromBackend();
}

export async function fetchInsightResultsByTimeRange(timeRange: TimeRange) {
  const startDateTime = `${timeRange.startDate}T${timeRange.startTime}:00.000`;
  const endDateTime = `${timeRange.endDate}T${timeRange.endTime}:59.999`;
  return fetchInsightResultsFromBackend(startDateTime, endDateTime);
}

export async function fetchInsightResults({ startDate, endDate }: { startDate: string; endDate: string }) {
  return fetchInsightResultsFromBackend(startDate, endDate);
}

export async function updateInsightResult({ _id, insightID, applicationType, result }: {
  _id: string; insightID: string; applicationType?: string; result: any;
}) {
  const { userId, token } = getAuth();
  const url = `${AI_SDK_URL}/api/bruce/insightResult/update/singleInsightResult`;
  const payload = {
    mode: 'set',
    updatedFields: { _id, insightID, applicationType: applicationType || 'Workbench', result },
  };
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: token, userID: userId },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`API error ${response.status}: ${responseText}`);
  try { return JSON.parse(responseText); } catch { return { message: responseText }; }
}

function convertISTStringToUnix(timeStr: string): number {
  return new Date(timeStr.replace(' ', 'T') + '+05:30').getTime();
}

function transformData(rawData: any[]): any[] {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];
  const first = rawData[0];
  if (first && 'sensor' in first && 'value' in first) {
    const grouped: Record<string, any> = {};
    for (const point of rawData) {
      const time = point.time || point.timestamp;
      if (!time) continue;
      if (!grouped[time]) grouped[time] = { time };
      const value = parseFloat(point.value);
      if (point.sensor && !isNaN(value)) grouped[time][point.sensor] = value;
    }
    return Object.values(grouped).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
  if (first && 'values' in first) {
    return rawData.map(p => ({ time: p.timestamp || p.time, ...p.values }));
  }
  return rawData.map(p => ({ time: p.timestamp || p.time, ...p }));
}

export async function fetchTrendData(
  deviceId: string,
  sensorList: string[],
  startTime: string,
  endTime: string
): Promise<{ success: true; data: any[] }> {
  const { userId, token } = getAuth();
  const sensorValues = sensorList.join(',');
  let cursor: { start: number; end: number } | null = {
    start: convertISTStringToUnix(startTime),
    end: convertISTStringToUnix(endTime),
  };
  const allData: any[] = [];
  while (cursor?.start && cursor?.end) {
    const params = new URLSearchParams({
      device: deviceId,
      sensor: sensorValues,
      sTime: String(cursor.start),
      eTime: String(cursor.end),
      cursor: 'true',
      limit: String(CURSOR_LIMIT),
    });
    const res = await fetch(`${AI_SDK_URL}/api/apiLayer/getAllData?${params}`, {
      headers: { userID: userId, Authorization: token },
    });
    if (!res.ok) throw new Error(`Upstream API error: ${res.status}`);
    const result = await res.json();
    if (Array.isArray(result.data)) allData.push(...result.data);
    cursor = result.cursor ?? null;
  }
  return { success: true, data: transformData(allData) };
}

const formatDuration = (value: any): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return typeof value === 'string' && value.trim().length > 0 ? value : 'N/A';
  }
  let totalMinutes = value;
  if (totalMinutes >= 100000) totalMinutes = totalMinutes / 1000 / 60;
  else if (totalMinutes >= 1000) totalMinutes = totalMinutes / 60;
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = String(Math.floor(abs % 60)).padStart(2, '0');
  return `${hours} H :${minutes} M`;
};

function mapEventsToRows(events: any[]) {
  return events.map((event) => {
    const metadata = event?.metaDataObj || event?.metadata || event?.metaData || {};
    return {
      'Start Date Time': event?.idleFrom || event?.startTime || null,
      'End Date Time': event?.idleTill || event?.endTime || null,
      Duration: event?.triggerDuration ?? event?.triggerDurationWithOccurence ?? null,
      'Calculated Duration (H:M)': formatDuration(event?.triggerDuration ?? event?.triggerDurationWithOccurence),
      'Event Details': event?.message?.trim?.() || '',
      Department:
        metadata?.DPT?.name || metadata?.department?.name || metadata?.department ||
        event?.department || event?.DPT?.name || event?.DPT || 'N/A',
      'Stoppage Category':
        metadata?.remarkGroup?.remarkGroupName || metadata?.remarkGroup?.name ||
        metadata?.remarkGroup || metadata?.category ||
        event?.remarkGroup?.remarkGroupName || event?.category || 'N/A',
      'Reason of Stoppage': metadata?.remark || metadata?.reason || event?.remark || event?.reason || 'N/A',
      'Other Reason of stoppage':
        metadata?.otherRemark || metadata?.otherReason || event?.otherRemark || event?.otherReason || '',
    };
  });
}

export async function fetchStoppages({
  startTime,
  endTime,
  moduleId,
  moduleIds,
  eventId,
  events: eventsParam,
  skip = 0,
  limit = 200,
  sortOrder = 1,
}: {
  startTime: string;
  endTime: string;
  moduleId?: string;
  moduleIds?: any;
  eventId?: string;
  events?: any;
  skip?: number;
  limit?: number;
  sortOrder?: number;
}): Promise<{ success: true; data: any[] }> {
  const { userId, token } = getAuth();
  const moduleIdentifier = moduleIds || moduleId;
  const eventIdentifier = eventsParam || eventId;
  const response = await fetch(
    `${AI_SDK_URL}/api/eventTag/maintenanceModuleFilters/${skip}/${limit}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token, userID: userId },
      body: JSON.stringify({
        userId,
        moduleId: moduleIdentifier,
        startTime,
        endTime,
        events: Array.isArray(eventIdentifier) ? eventIdentifier : [eventIdentifier],
        sortOrder,
      }),
    }
  );
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  return { success: true, data: mapEventsToRows(data?.data?.data || []) };
}
