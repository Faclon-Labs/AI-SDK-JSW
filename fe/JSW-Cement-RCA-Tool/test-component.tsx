"use client"

import React from 'react';

export default function TestComponent() {
  console.log('TestComponent is rendering...');
  
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-900 mb-4">Test Component Working!</h1>
        <p className="text-blue-700">If you can see this, React is working correctly.</p>
        <p className="text-sm text-blue-600 mt-2">Check the console for logs.</p>
      </div>
    </div>
  );
}













