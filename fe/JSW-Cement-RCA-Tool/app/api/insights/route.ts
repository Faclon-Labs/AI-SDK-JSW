import { NextRequest, NextResponse } from 'next/server';

const USER_ID = '66792886ef26fb850db806c5';
const DATA_URL = 'datads-ext.iosense.io';
const INSIGHT_ID = 'INS_015ce0dcf91c';

// Cache for organization ID
let cachedOrgId: string | null = null;

async function getUserOrganization(): Promise<string> {
  if (cachedOrgId) {
    return cachedOrgId;
  }

  const userInfoUrl = `https://${DATA_URL}/api/metaData/user`;

  const response = await fetch(userInfoUrl, {
    headers: {
      'userID': USER_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();

  if (!data.data?.organisation?._id) {
    throw new Error('Organization ID not found in user information');
  }

  const orgId: string = data.data.organisation._id;
  cachedOrgId = orgId;
  return orgId;
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
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : error);

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retry attempts failed');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, fetchAll } = body;

    const organisationId = await getUserOrganization();

    const url = `https://${DATA_URL}/api/bruce/insightResult/fetch/paginated/${INSIGHT_ID}`;

    const filter = fetchAll
      ? { startDate: undefined, endDate: undefined, insightProperty: [], tags: undefined }
      : {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          insightProperty: [],
          tags: undefined,
        };

    const payload = {
      filter,
      user: {
        id: USER_ID,
        organisation: organisationId,
      },
      pagination: { page: 1, count: 1000 },
    };

    const results = await retryWithBackoff(async () => {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'userID': USER_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(`API returned unsuccessful response: ${JSON.stringify(data)}`);
      }

      return data.data.data;
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to fetch insight results:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch insight results',
      },
      { status: 500 }
    );
  }
}
