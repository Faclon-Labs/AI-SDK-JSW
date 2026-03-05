import { NextRequest, NextResponse } from 'next/server';

// Backend config — never exposed to the client
const USER_ID = '66792886ef26fb850db806c5';
const DATA_URL = 'https://datads-ext.iosense.io';
const CURSOR_LIMIT = 1000;

function convertISTStringToUnix(timeStr: string): number {
  const isoTimeStr = timeStr.replace(' ', 'T') + '+05:30';
  return new Date(isoTimeStr).getTime();
}

async function fetchInfluxData(
  deviceId: string,
  sensorList: string[],
  startTime: number,
  endTime: number
): Promise<any[]> {
  const sensorValues = sensorList.join(',');
  let cursor: { start: number; end: number } | null = { start: startTime, end: endTime };
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

    const response = await fetch(`${DATA_URL}/api/apiLayer/getAllData?${params}`, {
      headers: { userID: USER_ID },
    });

    if (!response.ok) {
      throw new Error(`Upstream API error: ${response.status}`);
    }

    const result = await response.json();
    const { data, cursor: newCursor } = result;

    if (Array.isArray(data)) {
      allData.push(...data);
    }

    cursor = newCursor ?? null;
  }

  return allData;
}

function transformData(rawData: any[]): any[] {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  const first = rawData[0];

  // Format: { time, value, sensor } — pivot into { time, sensorId: value }
  if (first && 'sensor' in first && 'value' in first) {
    const grouped: Record<string, any> = {};
    for (const point of rawData) {
      const time = point.time || point.timestamp;
      if (!time) continue;
      if (!grouped[time]) grouped[time] = { time };
      const value = parseFloat(point.value);
      if (point.sensor && !isNaN(value)) {
        grouped[time][point.sensor] = value;
      }
    }
    return Object.values(grouped).sort(
      (a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }

  // Format: { timestamp, values: { sensorId: value } }
  if (first && 'values' in first) {
    return rawData.map((point: any) => ({
      time: point.timestamp || point.time,
      ...point.values,
    }));
  }

  // Format: already flat { time, sensorId: value }
  return rawData.map((point: any) => ({
    time: point.timestamp || point.time,
    ...point,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { deviceId, sensorList, startTime, endTime } = await request.json();

    if (!deviceId || !sensorList || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required parameters: deviceId, sensorList, startTime, endTime' },
        { status: 400 }
      );
    }

    const startUnix = convertISTStringToUnix(startTime);
    const endUnix = convertISTStringToUnix(endTime);

    const rawData = await fetchInfluxData(deviceId, sensorList, startUnix, endUnix);
    const data = transformData(rawData);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Trend API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
