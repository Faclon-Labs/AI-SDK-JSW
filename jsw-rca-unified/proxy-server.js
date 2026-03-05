const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Backend config ───────────────────────────────────────────────────────────
const CONNECTOR_URL = 'https://connector.iosense.io';
const AI_SDK_URL = `${CONNECTOR_URL}/api/account/ai-sdk`;
const INSIGHT_ID = 'INS_a7bca70a5160';
const CURSOR_LIMIT = 1000;

// Extract SSO auth from request headers (set by frontend after SSO login)
function getAuthFromRequest(req) {
  const userId = req.headers['x-user-id'];
  const token = req.headers['authorization'];
  if (!userId || !token) {
    throw Object.assign(new Error('Missing authentication headers: x-user-id and Authorization required'), { status: 401 });
  }
  return { userId, token };
}

app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
    }
  }
}

async function getUserOrganization(userId, token) {
  const res = await fetch(`${AI_SDK_URL}/api/metaData/user`, {
    headers: { userID: userId, Authorization: token },
  });
  if (!res.ok) throw new Error(`Failed to get user info: ${res.status}`);
  const data = await res.json();
  if (!data.data?.organisation?._id) throw new Error('Organization ID not found');
  return data.data.organisation._id;
}

function convertISTStringToUnix(timeStr) {
  return new Date(timeStr.replace(' ', 'T') + '+05:30').getTime();
}

async function fetchInfluxData(deviceId, sensorList, startTime, endTime, userId, token) {
  const sensorValues = sensorList.join(',');
  let cursor = { start: startTime, end: endTime };
  const allData = [];
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
  return allData;
}

function transformData(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];
  const first = rawData[0];
  if (first && 'sensor' in first && 'value' in first) {
    const grouped = {};
    for (const point of rawData) {
      const time = point.time || point.timestamp;
      if (!time) continue;
      if (!grouped[time]) grouped[time] = { time };
      const value = parseFloat(point.value);
      if (point.sensor && !isNaN(value)) grouped[time][point.sensor] = value;
    }
    return Object.values(grouped).sort((a, b) => new Date(a.time) - new Date(b.time));
  }
  if (first && 'values' in first) {
    return rawData.map(p => ({ time: p.timestamp || p.time, ...p.values }));
  }
  return rawData.map(p => ({ time: p.timestamp || p.time, ...p }));
}

const formatDuration = (value) => {
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

const mapEventsToRows = (events) => events.map((event) => {
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

// ─── API Routes ───────────────────────────────────────────────────────────────

// POST /api/insights
app.post('/api/insights', async (req, res) => {
  try {
    const { userId, token } = getAuthFromRequest(req);
    const { startDate, endDate, fetchAll } = req.body;
    const organisationId = await getUserOrganization(userId, token);
    const url = `${CONNECTOR_URL}/api/account/bruce/insightResult/fetch/paginated/${INSIGHT_ID}`;
    const filter = fetchAll
      ? { startDate: undefined, endDate: undefined, insightProperty: [], tags: undefined }
      : { startDate: startDate || undefined, endDate: endDate || undefined, insightProperty: [], tags: undefined };
    const payload = {
      filter,
      user: { id: userId, organisation: organisationId },
      pagination: { page: 1, count: 1000 },
    };
    const results = await retryWithBackoff(async () => {
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
    res.json({ success: true, results });
  } catch (err) {
    const status = err.status || 500;
    console.error('Failed to fetch insight results:', err);
    res.status(status).json({ success: false, error: err.message || 'Failed to fetch insight results' });
  }
});

// PUT /api/insights/update
app.put('/api/insights/update', async (req, res) => {
  try {
    const { userId, token } = getAuthFromRequest(req);
    const { _id, insightID, applicationType, result } = req.body;
    if (!_id || !insightID || !result) {
      return res.status(400).json({ success: false, error: 'Missing required fields: _id, insightID, or result' });
    }
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
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `API error ${response.status}: ${responseText}` });
    }
    let data;
    try { data = JSON.parse(responseText); } catch { data = { message: responseText }; }
    res.json({ success: true, data });
  } catch (err) {
    const status = err.status || 500;
    console.error('Failed to update insight result:', err);
    res.status(status).json({ success: false, error: err.message || 'Failed to update insight result' });
  }
});

// POST /api/trend
app.post('/api/trend', async (req, res) => {
  try {
    const { userId, token } = getAuthFromRequest(req);
    const { deviceId, sensorList, startTime, endTime } = req.body;
    if (!deviceId || !sensorList || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required parameters: deviceId, sensorList, startTime, endTime' });
    }
    const rawData = await fetchInfluxData(
      deviceId, sensorList,
      convertISTStringToUnix(startTime),
      convertISTStringToUnix(endTime),
      userId, token
    );
    res.json({ success: true, data: transformData(rawData) });
  } catch (err) {
    const status = err.status || 500;
    console.error('Trend API error:', err);
    res.status(status).json({ success: false, error: 'Failed to fetch trend data' });
  }
});

// POST /api/stoppages
app.post('/api/stoppages', async (req, res) => {
  try {
    const { userId, token } = getAuthFromRequest(req);
    const { startTime, endTime, moduleId, moduleIds, eventId, events, skip = 0, limit = 200, sortOrder = 1 } = req.body || {};
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Missing startTime or endTime' });
    }
    const moduleIdentifier = moduleIds || moduleId;
    const eventIdentifier = events || eventId;
    if (!moduleIdentifier) return res.status(400).json({ success: false, error: 'Missing moduleId/moduleIds' });
    if (!eventIdentifier) return res.status(400).json({ success: false, error: 'Missing eventId/events' });

    const upstream = await fetch(
      `${AI_SDK_URL}/api/eventTag/maintenanceModuleFilters/${skip}/${limit}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token, userID: userId },
        body: JSON.stringify({
          userId,
          moduleId: moduleIdentifier,
          startTime, endTime,
          events: Array.isArray(eventIdentifier) ? eventIdentifier : [eventIdentifier],
          sortOrder,
        }),
      }
    );
    if (!upstream.ok) {
      return res.status(upstream.status).json({ success: false, error: `Upstream API error ${upstream.status}` });
    }
    const data = await upstream.json();
    res.json({ success: true, data: mapEventsToRows(data?.data?.data || []) });
  } catch (err) {
    const status = err.status || 500;
    console.error('Failed to fetch stoppages data:', err);
    res.status(status).json({ success: false, error: 'Failed to fetch stoppages data' });
  }
});

// ─── Serve static Next.js export ─────────────────────────────────────────────

app.use('/', express.static(path.join(__dirname, 'out')));

// SPA fallback — serve index.html for any unmatched route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Proxy + static server running on port ${PORT}`);
});
