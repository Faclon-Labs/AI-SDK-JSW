"use client"

import React, { useEffect, useState } from 'react';

export default function TestSimplePage() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function testSimpleAPI() {
      try {
        setStatus('Testing network connectivity...');
        
        // Test 1: Basic fetch to the backend
        setStatus('Testing basic connectivity to datads-ext.iosense.io...');
        const response = await fetch('https://datads-ext.iosense.io', {
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        setStatus('Basic connectivity successful, testing API...');
        
        // Test 2: Try to access a simple endpoint
        try {
          const apiResponse = await fetch('https://datads-ext.iosense.io/api/health', {
            method: 'GET',
            mode: 'no-cors'
          });
          setStatus('API health check completed');
        } catch (apiError) {
          setStatus('API health check failed (expected for no-cors mode)');
        }
        
        // Test 3: Check if we can make a simple request
        setStatus('Testing simple request...');
        const testResponse = await fetch('https://httpbin.org/get', {
          method: 'GET'
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          setData(testData);
          setStatus('All tests completed successfully!');
        } else {
          throw new Error(`HTTP ${testResponse.status}`);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setStatus('Test failed');
        console.error('Test error:', err);
      }
    }

    testSimpleAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple API Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Status</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{status}</p>
          </div>
        </div>

        {error && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test Data</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <pre className="text-sm text-green-800 overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Backend URL:</strong> datads-ext.iosense.io</p>
            <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side rendering'}</p>
            <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side rendering'}</p>
            <p><strong>Platform:</strong> {typeof navigator !== 'undefined' ? navigator.platform : 'Server-side rendering'}</p>
            <p><strong>Online:</strong> {typeof navigator !== 'undefined' ? (navigator.onLine ? 'Yes' : 'No') : 'Server-side rendering'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
