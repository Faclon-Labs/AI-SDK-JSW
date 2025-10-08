"use client"

import React, { useEffect, useState } from 'react';
import { fetchAllInsightResults } from '../../lib/api';

export default function TestAPIPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testAPI() {
      try {
        console.log('Testing API connection...');
        const results = await fetchAllInsightResults();
        console.log('API response:', results);
        setData(results);
      } catch (err) {
        console.error('API error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    testAPI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing API connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">API Error</h1>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="bg-red-100 p-4 rounded-lg text-left">
            <h2 className="font-semibold mb-2">Debug Info:</h2>
            <p>Check the browser console for more details.</p>
            <p>Make sure the backend is running and accessible.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-900 mb-4">API Connection Successful!</h1>
        <p className="text-green-700 mb-4">Data received from API</p>
        <div className="bg-green-100 p-4 rounded-lg text-left max-w-2xl">
          <h2 className="font-semibold mb-2">Data Preview:</h2>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
