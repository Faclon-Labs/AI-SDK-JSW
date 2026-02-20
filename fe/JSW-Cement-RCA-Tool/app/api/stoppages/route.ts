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
  return events.map((event) => {
    // Try multiple possible locations for metadata
    const metadata = event?.metaDataObj || event?.metadata || event?.metaData || {};

    // Try to extract department from various possible locations
    const department =
      metadata?.DPT?.name ||
      metadata?.department?.name ||
      metadata?.department ||
      event?.department ||
      event?.DPT?.name ||
      event?.DPT ||
      'N/A';

    // Try to extract stoppage category
    const stoppageCategory =
      metadata?.remarkGroup?.remarkGroupName ||
      metadata?.remarkGroup?.name ||
      metadata?.remarkGroup ||
      metadata?.category ||
      event?.remarkGroup?.remarkGroupName ||
      event?.category ||
      'N/A';

    // Try to extract reason
    const reason =
      metadata?.remark ||
      metadata?.reason ||
      event?.remark ||
      event?.reason ||
      'N/A';

    const otherReason =
      metadata?.otherRemark ||
      metadata?.otherReason ||
      event?.otherRemark ||
      event?.otherReason ||
      '';

    return {
      'Start Date Time': event?.idleFrom || event?.startTime || null,
      'End Date Time': event?.idleTill || event?.endTime || null,
      Duration: event?.triggerDuration ?? event?.triggerDurationWithOccurence ?? null,
      'Calculated Duration (H:M)': formatDuration(event?.triggerDuration ?? event?.triggerDurationWithOccurence),
      'Event Details': event?.message?.trim?.() || '',
      Department: department,
      'Stoppage Category': stoppageCategory,
      'Reason of Stoppage': reason,
      'Other Reason of stoppage': otherReason,
    };
  });
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

    // Debug: Log the first event to understand the structure
    if (eventsData.length > 0) {
      console.log('Sample stoppage event:', JSON.stringify(eventsData[0], null, 2));
      console.log('Event keys:', Object.keys(eventsData[0]));
      if (eventsData[0].metaDataObj) {
        console.log('MetaDataObj keys:', Object.keys(eventsData[0].metaDataObj));
      } else {
        console.log('No metaDataObj found in event');
      }
    }

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

