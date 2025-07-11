import { useState, useEffect } from 'react';
import { fetchAllInsightResults, fetchInsightResultsByTimeRange, TimeRange } from '../lib/api';

interface DiagnosticData {
  millName: string;
  issue: string;
  status: "High" | "Medium" | "Low";
  lastUpdated: string;
  details?: {
    targetSPC?: string;
    daySPC?: string;
    deviation?: string;
    impact?: string;
  };
  // Add detailed backend data
  backendData?: {
    TPH?: {
      cause?: string;
      one_rp_down?: any;
      both_rp_down?: any;
      "Reduced Feed Operations"?: any;
      rampup?: any[];
      lowfeed?: any[];
    };
    High_Power?: {
      SKS_FAN?: any;
      mill_auxiliaries?: any;
      product_transportation?: any;
    };
    idle_running?: {
      cause?: string;
    };
    [key: string]: any;
  };
}

export function useDiagnosticData(timeRange?: TimeRange) {
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndTransformData() {
      setLoading(true);
      setError(null);
      
      try {
        let results;
        
        if (timeRange) {
          // Use time range if provided
          results = await fetchInsightResultsByTimeRange(timeRange);
        } else {
          // Fallback to fetching all results
          results = await fetchAllInsightResults();
        }
        
        // Transform backend data into frontend format
        const transformedData: DiagnosticData[] = results.map((result, index) => {
          const resultData = result.result;
          
          // Extract the main issue
          const detectedIssue = resultData.detected_issue || 'Issue detected';
          
          // Format date
          const date = new Date(result.invocationTime);
          const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          // Extract details
          const details = {
            targetSPC: resultData.SPC?.target ? `${resultData.SPC.target} kWh/t` : undefined,
            daySPC: resultData.SPC?.today ? `${resultData.SPC.today.toFixed(2)} kWh/t` : undefined,
            deviation: resultData.SPC?.deviation ? `+${resultData.SPC.deviation.toFixed(2)}%` : undefined,
            impact: resultData.SPC?.Impact || 'N/A'
          };

          // Get status and impact from the same source - SPC.Impact
          const impactValue = resultData.SPC?.Impact || 'N/A';
          
          return {
            millName: result.resultName || "Raw Mill",
            issue: detectedIssue,
            status: impactValue,
            lastUpdated: formattedDate,
            details: {
              ...details,
              impact: impactValue
            },
            backendData: resultData // Include all the detailed backend data
          };
        });
        
        setDiagnosticData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndTransformData();
  }, [timeRange]); // Add timeRange as dependency

  return { diagnosticData, loading, error };
} 