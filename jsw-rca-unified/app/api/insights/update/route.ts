import { NextRequest, NextResponse } from 'next/server';

const USER_ID = '66792886ef26fb850db806c5';
const DATA_URL = 'datads.iosense.io';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id, insightID, applicationType, result } = body;

    if (!_id || !insightID || !result) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: _id, insightID, or result' },
        { status: 400 }
      );
    }

    const url = `https://${DATA_URL}/api/bruce/insightResult/update/singleInsightResult`;

    const payload = {
      mode: 'set',
      updatedFields: {
        _id,
        insightID,
        applicationType: applicationType || 'Workbench',
        result
      }
    };

    console.log('Sending update request to:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null',
        'userID': USER_ID,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `API error ${response.status}: ${responseText}` },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update insight result:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update insight result',
      },
      { status: 500 }
    );
  }
}
