import { NextRequest, NextResponse } from 'next/server';

const STOPPAGE_API_BASE = 'https://datads-ext.iosense.io/api/eventTag/maintenanceModuleFilters';
const USER_ID = '66792886ef26fb850db806c5';

type ModuleIdentifier = string | string[];

const formatDuration = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return 'N/A';
  }

  let totalMinutes = value;

  if (totalMinutes >= 100000) {
    totalMinutes = totalMinutes / 1000 / 60;
  } else if (totalMinutes >= 1000) {
    totalMinutes = totalMinutes / 60;
  }

  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = Math.floor(absoluteMinutes % 60);
  const paddedMinutes = String(minutes).padStart(2, '0');

  return `${hours} H :${paddedMinutes} M`;
};

const mapEventsToRows = (events: any[]) => {
  return events.map((event) => ({
    'Start Date Time': event?.idleFrom || event?.startTime || null,
    'End Date Time': event?.idleTill || event?.endTime || null,
    Duration: event?.triggerDuration ?? event?.triggerDurationWithOccurence ?? null,
    'Calculated Duration (H:M)': formatDuration(event?.triggerDuration ?? event?.triggerDurationWithOccurence),
    'Event Details': event?.message?.trim?.() || '',
    Department: event?.metaDataObj?.DPT?.name || 'N/A',
    'Stoppage Category': event?.metaDataObj?.remarkGroup?.remarkGroupName || 'N/A',
    'Reason of Stoppage': event?.metaDataObj?.remark || 'N/A',
    'Other Reason of stoppage': event?.metaDataObj?.otherRemark || '',
  }));
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startTime,
      endTime,
      moduleId,
      moduleIds,
      eventId,
      events,
      skip = 0,
      limit = 200,
      sortOrder = 1,
    } = body || {};

    if (!startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing startTime or endTime' },
        { status: 400 }
      );
    }

    const moduleIdentifier: ModuleIdentifier | undefined = moduleIds || moduleId;
    const eventIdentifier: string | string[] | undefined = events || eventId;

    if (!moduleIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Missing moduleId/moduleIds' },
        { status: 400 }
      );
    }

    if (!eventIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Missing eventId/events' },
        { status: 400 }
      );
    }

    const upstreamResponse = await fetch(`${STOPPAGE_API_BASE}/${skip}/${limit}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: USER_ID,
        moduleId: moduleIdentifier,
        startTime,
        endTime,
        events: Array.isArray(eventIdentifier) ? eventIdentifier : [eventIdentifier],
        sortOrder,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error('Stoppages API error:', errorText);
      return NextResponse.json(
        { success: false, error: `Upstream API error ${upstreamResponse.status}` },
        { status: upstreamResponse.status }
      );
    }

    const data = await upstreamResponse.json();
    const eventsData = data?.data?.data || [];
    const rows = mapEventsToRows(eventsData);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch stoppages data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stoppages data' },
      { status: 500 }
    );
  }
}

