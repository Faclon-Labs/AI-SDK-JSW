"use client"

import React, { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, ChevronDown, ChevronRight, Download, Filter, LogOut, Search, Settings, X, Wrench } from "lucide-react"
import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useDiagnosticData } from "./hooks/useDiagnosticData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TrendChart from "./components/TrendChart"
import { TimeRangePicker, TimeRange } from "./components/ui/TimeRangePicker";
import { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";
import { Component as LumaSpin } from "./components/ui/luma-spin";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

// Utility functions for formatting
const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === "N/A") {
    return "N/A";
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return String(value);
  }
  return num.toFixed(2);
};

const formatTime = (value: any): string => {
  if (value === null || value === undefined || value === "N/A") {
    return "N/A";
  }
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    
    // Format as YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return String(value);
  }
};

// Function to highlight numbers in text
const highlightNumbers = (text: any) => {
  if (text === null || text === undefined) return "";
  const str = String(text);
  const parts = str.split(/(\d+(?:\.\d+)?)/);
  return parts.map((part, index) => {
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={index} className="text-blue-600 font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
};

// Helper to convert IST date+time to UTC ISO string
function toUTCISOStringFromIST(dateStr: string, timeStr: string) {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm'
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  // Create a Date object in IST
  const istDate = new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30));
  // Add 5 hours 30 minutes to get IST
  istDate.setHours(istDate.getHours() + 5, istDate.getMinutes() + 30);
  return istDate.toISOString();
}

export default function Component() {
  // Add state for time picker modal and range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>({
    startDate: startOfMonth.toISOString().slice(0, 10),
    startTime: "00:00",
    endDate: endOfMonth.toISOString().slice(0, 10),
    endTime: "23:59",
  });

  // Add state for maintenance popup
  const [maintenancePopup, setMaintenancePopup] = useState<{isOpen: boolean, activeTab: 'RP1' | 'RP2', rp1: any[], rp2: any[]}>({
    isOpen: false,
    activeTab: 'RP1',
    rp1: [],
    rp2: []
  });

  // Function to open maintenance popup
  const openMaintenancePopup = (backendData: any) => {
    setMaintenancePopup({
      isOpen: true,
      activeTab: 'RP1',
      rp1: backendData?.TPH?.RP1_maintance || [],
      rp2: backendData?.TPH?.RP2_maintance || []
    });
  };
  const closeMaintenancePopup = () => setMaintenancePopup({ ...maintenancePopup, isOpen: false });

  // Pass the selected time range to the hook
  const { diagnosticData, loading, error } = useDiagnosticData(selectedRange);
  const [selectedFilter, setSelectedFilter] = useState<"high" | "medium" | "low" | "all">("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [popupData, setPopupData] = useState<{isOpen: boolean, data: any, section: string, backendData?: any}>({
    isOpen: false,
    data: null,
    section: "",
    backendData: null
  })

  // Format range for display
  const displayRange = `${selectedRange.startDate} ${selectedRange.startTime} - ${selectedRange.endDate} ${selectedRange.endTime}`;

  // Function to get preset name based on current selection
  const getPresetName = (range: TimeRange): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);
    
    // Check if it's today
    if (range.startDate === range.endDate && 
        range.startDate === today.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (range.startDate === range.endDate && 
        range.startDate === yesterday.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Yesterday';
    }
    
    // Check if it's current week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    if (range.startDate === startOfWeek.toISOString().slice(0, 10) &&
        range.endDate === endOfWeek.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Current Week';
    }
    
    // Check if it's previous week
    const startOfLastWeek = new Date(today);
    startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
    
    if (range.startDate === startOfLastWeek.toISOString().slice(0, 10) &&
        range.endDate === endOfLastWeek.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Previous Week';
    }
    
    // Check if it's previous 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    if (range.startDate === sevenDaysAgo.toISOString().slice(0, 10) &&
        range.endDate === today.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Previous 7 Days';
    }
    
    // Check if it's current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    if (range.startDate === startOfMonth.toISOString().slice(0, 10) &&
        range.endDate === endOfMonth.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Current Month';
    }
    
    // Check if it's previous month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    if (range.startDate === startOfLastMonth.toISOString().slice(0, 10) &&
        range.endDate === endOfLastMonth.toISOString().slice(0, 10) &&
        range.startTime === '00:00' && range.endTime === '23:59') {
      return 'Previous Month';
    }
    
    return 'Custom';
  };

  const currentPreset = getPresetName(selectedRange);

  // Function to extract real device ID from payload
  const extractDeviceId = (data: any): string | null => {
    if (!data) return null;
    
    // Search for device IDs in the payload
    const searchForDeviceId = (obj: any): string | null => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          // Look for device-related keys
          if (key.toLowerCase().includes('device') || key.toLowerCase().includes('deviceid')) {
            if (typeof value === 'string' && value.includes('ABBRWML')) {
              return value;
            }
          }
          // Look for ABBRWML strings anywhere
          if (typeof value === 'string' && value.includes('ABBRWML')) {
            return value;
          }
          // Recursively search nested objects
          if (typeof value === 'object' && value !== null) {
            const result = searchForDeviceId(value);
            if (result) return result;
          }
        }
      }
      return null;
    };
    
    return searchForDeviceId(data);
  };

  // Function to extract sensor IDs from payload
  const extractSensorIds = (data: any, section: string): string[] | null => {
    if (!data) return null;
    
    // Special handling for High Power section
    if (section === "High_Power") {
      // For High Power, we need to extract sensors from subsections
      const highPowerData = data[section];
      if (!highPowerData) return null;
      
      const allSensors: string[] = [];
      
      // Iterate through all subsections (SKS_FAN, mill_auxiliaries, product_transportation, etc.)
      for (const [subsectionKey, subsectionData] of Object.entries(highPowerData)) {
        if (typeof subsectionData === 'object' && subsectionData !== null) {
          const subsection = subsectionData as any;
          
          // Check if subsection has sensor information
          if (subsection.sensor) {
            if (Array.isArray(subsection.sensor)) {
              allSensors.push(...subsection.sensor);
            } else if (typeof subsection.sensor === 'object') {
              allSensors.push(...Object.keys(subsection.sensor));
            } else {
              allSensors.push(subsection.sensor);
            }
          }
        }
      }
      
      return allSensors.length > 0 ? allSensors : null;
    }
    
    // Look for sensor data in the specific section
    const sectionData = data[section];
    if (!sectionData) return null;
    
    // Check if section has sensor information
    if (sectionData.sensor) {
      if (Array.isArray(sectionData.sensor)) {
        return sectionData.sensor;
      } else if (typeof sectionData.sensor === 'object') {
        return Object.keys(sectionData.sensor);
      } else {
        return [sectionData.sensor];
      }
    }
    
    // Look for sensor IDs in nested objects
    const searchForSensors = (obj: any): string[] | null => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (key.toLowerCase().includes('sensor') || key.toLowerCase().includes('sensorid')) {
            if (Array.isArray(value)) {
              return value;
            } else if (typeof value === 'string') {
              return [value];
            }
          }
          // Recursively search nested objects
          if (typeof value === 'object' && value !== null) {
            const result = searchForSensors(value);
            if (result) return result;
          }
        }
      }
      return null;
    };
    
    return searchForSensors(sectionData);
  };

  // Function to extract sensor names for legend
  const extractSensorNames = (data: any, section: string): Record<string, string> | undefined => {
    if (!data) return undefined;
    
    // Special handling for High Power section
    if (section === "High_Power") {
      const highPowerData = data[section];
      if (!highPowerData) return undefined;
      
      const sensorNames: Record<string, string> = {};
      
      // Iterate through all subsections
      for (const [subsectionKey, subsectionData] of Object.entries(highPowerData)) {
        if (typeof subsectionData === 'object' && subsectionData !== null) {
          const subsection = subsectionData as any;
          
          // Check if subsection has sensor information
          if (subsection.sensor) {
            if (typeof subsection.sensor === 'object') {
              // For object format like { "D104": "SKS Fan Speed" }
              for (const [sensorId, sensorName] of Object.entries(subsection.sensor)) {
                sensorNames[sensorId] = sensorName as string;
              }
            }
          }
        }
      }
      
      return Object.keys(sensorNames).length > 0 ? sensorNames : undefined;
    }
    
    // For other sections, return undefined (use default sensor IDs as names)
    return undefined;
  };

  // Function to check if trend data should be shown
  const shouldShowTrend = (data: any, section: string): boolean => {
    const deviceId = extractDeviceId(data);
    const sensorIds = extractSensorIds(data, section);
    
    return !!(deviceId && sensorIds && sensorIds.length > 0);
  };

  // Function to check if trend data is available for a specific section
  const hasTrendData = (data: any, section: string): boolean => {
    if (!data) return false;
    let sectionData;
    switch (section) {
      case "One RP Down":
        sectionData = data?.TPH?.one_rp_down?.rampup;
        break;
      case "Both RP Down":
        sectionData = data?.TPH?.both_rp_down;
        break;
      case "Reduced Feed Operations":
        sectionData = data?.TPH?.lowfeed;
        break;
      case "SKS Fan":
        sectionData = data?.High_Power?.SKS_FAN;
        break;
      case "Mill Auxiliaries":
        sectionData = data?.High_Power?.mill_auxiliaries;
        break;
      case "Product Transportation":
        sectionData = data?.High_Power?.product_transportation;
        break;
      default:
        return false;
    }
    if (Array.isArray(sectionData)) {
      return sectionData.length > 0;
    }
    if (typeof sectionData === 'object' && sectionData !== null) {
      // Ignore metadata fields like 'cause', 'device', 'sensor'
      const dataKeys = Object.keys(sectionData).filter(
        (key) => key !== 'cause' && key !== 'device' && key !== 'sensor'
      );
      // Check if any key has a non-empty array, non-empty object, or non-empty string (not 'N/A')
      return dataKeys.some((key) => {
        const value = sectionData[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        if (typeof value === 'string') return value.trim() !== '' && value !== 'N/A';
        return !!value;
      });
    }
    return false;
  };

  // Debug: Log the payload structure
  useEffect(() => {
    if (diagnosticData.length > 0) {
      console.log('Diagnostic Data Structure:', diagnosticData[0]);
      console.log('Backend Data Structure:', diagnosticData[0]?.backendData);
      console.log('TPH Structure:', diagnosticData[0]?.backendData?.TPH);
      console.log('High Power Structure:', diagnosticData[0]?.backendData?.High_Power);
      
      // Debug device and sensor information
      const firstItem = diagnosticData[0];
      if (firstItem?.backendData) {
        console.log('=== DEVICE AND SENSOR DEBUG ===');
        
        // Log the entire backendData structure to find device IDs
        console.log('Full Backend Data:', JSON.stringify(firstItem.backendData, null, 2));
        
        // Extract real device ID
        const realDeviceId = extractDeviceId(firstItem.backendData);
        console.log('Extracted Real Device ID:', realDeviceId);
        
        // Check TPH section
        if (firstItem.backendData.TPH) {
          const tph = firstItem.backendData.TPH as any;
          console.log('TPH Device:', tph.Device || 'N/A');
          console.log('TPH Sensor:', tph.sensor ? JSON.stringify(tph.sensor) : 'N/A');
          if (tph["Reduced Feed Operations"]) {
            const rfo = tph["Reduced Feed Operations"] as any;
            console.log('Reduced Feed Operations Device:', rfo.device || 'N/A');
            console.log('Reduced Feed Operations Sensor:', rfo.sensor ? JSON.stringify(rfo.sensor) : 'N/A');
          }
        }
        
        // Check High Power section
        if (firstItem.backendData.High_Power) {
          const hp = firstItem.backendData.High_Power as any;
          console.log('High Power Device:', hp.Device || 'N/A');
          console.log('High Power Sensor:', hp.sensor ? JSON.stringify(hp.sensor) : 'N/A');
          if (hp.SKS_FAN) {
            const sks = hp.SKS_FAN as any;
            console.log('SKS Fan Device:', sks.device || 'N/A');
            console.log('SKS Fan Sensor:', sks.sensor ? JSON.stringify(sks.sensor) : 'N/A');
          }
        }
        
        // Look for device IDs in the entire structure
        console.log('=== SEARCHING FOR DEVICE IDS ===');
        const searchForDeviceIds = (obj: any, path: string = '') => {
          if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              if (key.toLowerCase().includes('device') || key.toLowerCase().includes('deviceid')) {
                console.log(`Found device at ${currentPath}:`, value);
              }
              if (typeof value === 'string' && value.includes('ABBRWML')) {
                console.log(`Found ABBRWML device at ${currentPath}:`, value);
              }
              if (typeof value === 'object' && value !== null) {
                searchForDeviceIds(value, currentPath);
              }
            }
          }
        };
        searchForDeviceIds(firstItem.backendData);
        console.log('=== END DEVICE AND SENSOR DEBUG ===');
      }
    }
  }, [diagnosticData]);

  const toggleRowExpansion = (index: number) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index)
    } else {
      newExpandedRows.add(index)
    }
    setExpandedRows(newExpandedRows)
  }

  const openPopup = (data: any, section: string, backendData?: any) => {
    setPopupData({
      isOpen: true,
      data,
      section,
      backendData
    })
  }

  const closePopup = () => {
    setPopupData({
      isOpen: false,
      data: null,
      section: "",
      backendData: null
    })
  }

  // Group data by date for PDF report
  const groupDataByDate = (data: any[]) => {
    const groupedData: Record<string, any[]> = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp).toDateString();
      if (!groupedData[date]) {
        groupedData[date] = [];
      }
      groupedData[date].push(item);
    });
    
    return groupedData;
  };

  // PDF export function
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnostic Report', margin, yPosition);
      yPosition += 15;
      
      // Report info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Time Range: ${selectedRange.startDate} ${selectedRange.startTime} - ${selectedRange.endDate} ${selectedRange.endTime}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Total Records: ${filteredData.length}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Filter Applied: ${selectedFilter === 'all' ? 'All' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}`, margin, yPosition);
      yPosition += 15;
      
      // Summary statistics
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary by Status:', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const highCount = diagnosticData.filter(item => item.status.toLowerCase() === 'high').length;
      const mediumCount = diagnosticData.filter(item => item.status.toLowerCase() === 'medium').length;
      const lowCount = diagnosticData.filter(item => item.status.toLowerCase() === 'low').length;
      
      doc.text(`High Priority: ${highCount}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Medium Priority: ${mediumCount}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Low Priority: ${lowCount}`, margin, yPosition);
      yPosition += 15;
      
      // Group data by date
      const groupedData = groupDataByDate(filteredData);
      const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      // Daily sections
      sortedDates.forEach((date, dateIndex) => {
        const dailyData = groupedData[date];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Date header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${date} (${dailyData.length} records)`, margin, yPosition);
        yPosition += 10;
        
        // Daily summary table
        const dailyTableData = dailyData.map(item => [
          formatTime(item.timestamp),
          item.resultName || 'N/A',
          item.issue && item.issue.length > 30 ? item.issue.substring(0, 30) + '...' : item.issue || 'N/A',
          item.status || 'N/A',
          item.backendData?.SPC?.Impact || 'N/A'
        ]);
        
        try {
          autoTable(doc, {
            startY: yPosition,
            head: [['Time', 'Asset', 'Issue', 'Status', 'Impact']],
            body: dailyTableData,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 25 },
              1: { cellWidth: 30 },
              2: { cellWidth: 60 },
              3: { cellWidth: 20 },
              4: { cellWidth: 25 }
            },
            margin: { left: margin, right: margin }
          });
          
          // Get final Y position after table
          yPosition = (doc as any).lastAutoTable?.finalY || yPosition + (dailyTableData.length * 10) + 20;
        } catch (tableError) {
          console.warn('Error creating table, continuing with text format:', tableError);
          // Fallback to text format if table fails
          dailyTableData.forEach((row, index) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            doc.setFontSize(10);
            doc.text(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`, margin, yPosition);
            yPosition += 6;
          });
        }
        
        yPosition += 15;
        
        // Detailed analysis for each record of the day
        dailyData.forEach((item, itemIndex) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Record ${itemIndex + 1}: ${item.resultName || 'N/A'}`, margin, yPosition);
          yPosition += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          
          // SPC Data if available
          if (item.backendData?.SPC) {
            const spc = item.backendData.SPC;
            doc.text(`SPC Target: ${formatNumber(spc.target)} kWh/t`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`SPC Today: ${formatNumber(spc.today)} kWh/t`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`Deviation: ${formatNumber(spc.deviation)}%`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`Impact: ${spc.Impact || 'N/A'}`, margin + 5, yPosition);
            yPosition += 5;
          }
          
          // TPH Data if available
          if (item.backendData?.TPH) {
            const tph = item.backendData.TPH;
            doc.text(`TPH Analysis:`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`  Device: ${tph.Device || 'N/A'}`, margin + 10, yPosition);
            yPosition += 5;
            doc.text(`  Cause: ${tph.cause || 'N/A'}`, margin + 10, yPosition);
            yPosition += 5;
            if (tph.target) {
              doc.text(`  Target: ${formatNumber(tph.target)}`, margin + 10, yPosition);
              yPosition += 5;
            }
          }
          
          // High Power Data if available
          if (item.backendData?.High_Power) {
            const hp = item.backendData.High_Power;
            doc.text(`High Power Analysis:`, margin + 5, yPosition);
            yPosition += 5;
            
            Object.entries(hp).forEach(([subsection, data]) => {
              if (typeof data === 'object' && data !== null && subsection !== 'Device') {
                const subsectionData = data as any;
                doc.text(`  ${subsection}: ${subsectionData.cause || 'N/A'}`, margin + 10, yPosition);
                yPosition += 5;
              }
            });
          }
          
          yPosition += 5; // Space between records
        });
        
        yPosition += 10; // Space between days
      });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `Diagnostic_Report_${timestamp}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      console.log('PDF report generated successfully:', filename);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert(`Error generating PDF report: ${error.message}. Please try again.`);
    }
  };

  // Excel export function
  const exportToExcel = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare summary data
      const summaryData = [
        ['Diagnostic Report'],
        [''],
        ['Report Generated:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Time Range:', `${selectedRange.startDate} ${selectedRange.startTime} - ${selectedRange.endDate} ${selectedRange.endTime}`],
        ['Total Records:', filteredData.length.toString()],
        ['Filter Applied:', selectedFilter === 'all' ? 'All' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)],
        ['Search Term:', searchTerm || 'None'],
        [''],
        ['Summary by Status:'],
        ['High Priority:', diagnosticData.filter(item => item.status.toLowerCase() === 'high').length.toString()],
        ['Medium Priority:', diagnosticData.filter(item => item.status.toLowerCase() === 'medium').length.toString()],
        ['Low Priority:', diagnosticData.filter(item => item.status.toLowerCase() === 'low').length.toString()],
        ['']
      ];

      // Add summary sheet
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Prepare main diagnostic data
      const diagnosticHeaders = [
        'Timestamp',
        'Asset Name',
        'Detected Issue',
        'Status',
        'Query Time Start',
        'Query Time End',
        'SPC Target',
        'SPC Today',
        'SPC Deviation (%)',
        'SPC Impact'
      ];

      const diagnosticRows = filteredData.map(item => [
        formatTime(item.timestamp),
        item.resultName || 'N/A',
        item.backendData?.detected_issue || 'N/A',
        item.status,
        item.backendData?.query_time?.[0] || 'N/A',
        item.backendData?.query_time?.[1] || 'N/A',
        formatNumber(item.backendData?.SPC?.target),
        formatNumber(item.backendData?.SPC?.today),
        formatNumber(item.backendData?.SPC?.deviation),
        item.backendData?.SPC?.Impact || 'N/A'
      ]);

      const diagnosticSheet = XLSX.utils.aoa_to_sheet([diagnosticHeaders, ...diagnosticRows]);
      XLSX.utils.book_append_sheet(workbook, diagnosticSheet, 'Diagnostic Data');

      // Prepare TPH section data if available
      const tphData = [];
      const tphHeaders = [
        'Asset Name',
        'Timestamp',
        'Device',
        'Target TPH',
        'Cause',
        'Both RP Down Duration',
        'Reduced Feed Duration'
      ];
      tphData.push(tphHeaders);

      filteredData.forEach(item => {
        if (item.backendData?.TPH) {
          const tph = item.backendData.TPH;
          tphData.push([
            item.resultName || 'N/A',
            formatTime(item.timestamp),
            (tph as any).Device || 'N/A',
            formatNumber((tph as any).target),
            (tph as any).cause || 'N/A',
            (tph as any).both_rp_down?.[1] || 'N/A',
            (tph as any)["Reduced Feed Operations"]?.[1] || 'N/A'
          ]);
        }
      });

      if (tphData.length > 1) {
        const tphSheet = XLSX.utils.aoa_to_sheet(tphData);
        XLSX.utils.book_append_sheet(workbook, tphSheet, 'TPH Analysis');
      }

      // Prepare High Power section data if available
      const highPowerData = [];
      const highPowerHeaders = [
        'Asset Name',
        'Timestamp',
        'Device',
        'Subsection',
        'Cause',
        'Sensor Info'
      ];
      highPowerData.push(highPowerHeaders);

      filteredData.forEach(item => {
        if (item.backendData?.High_Power) {
          const hp = item.backendData.High_Power;
          Object.entries(hp).forEach(([subsection, data]) => {
            if (typeof data === 'object' && data !== null && subsection !== 'Device') {
              const subsectionData = data as any;
              highPowerData.push([
                item.resultName || 'N/A',
                formatTime(item.timestamp),
                (hp as any).Device || 'N/A',
                subsection,
                subsectionData.cause || 'N/A',
                subsectionData.sensor ? JSON.stringify(subsectionData.sensor) : 'N/A'
              ]);
            }
          });
        }
      });

      if (highPowerData.length > 1) {
        const highPowerSheet = XLSX.utils.aoa_to_sheet(highPowerData);
        XLSX.utils.book_append_sheet(workbook, highPowerSheet, 'High Power Analysis');
      }

      // Prepare maintenance events data
      const maintenanceData = [];
      const maintenanceHeaders = [
        'Asset Name',
        'Equipment',
        'Start Date Time',
        'End Date Time',
        'Event Details',
        'Department',
        'Stoppage Category',
        'Reason of Stoppage',
        'Duration'
      ];
      maintenanceData.push(maintenanceHeaders);

      filteredData.forEach(item => {
        if (item.backendData?.TPH) {
          const tph = item.backendData.TPH as any;
          // RP1 maintenance
          if (tph.RP1_maintance && Array.isArray(tph.RP1_maintance)) {
            tph.RP1_maintance.forEach((event: any) => {
              maintenanceData.push([
                item.resultName || 'N/A',
                'RP1',
                event['Start Date Time'] || 'N/A',
                event['End Date Time'] || 'N/A',
                event['Event Details'] || 'N/A',
                event['Department'] || 'N/A',
                event['Stoppage Category'] || 'N/A',
                event['Reason of Stoppage'] || 'N/A',
                event['Calculated Duration (H:M)'] || 'N/A'
              ]);
            });
          }
          // RP2 maintenance
          if (tph.RP2_maintance && Array.isArray(tph.RP2_maintance)) {
            tph.RP2_maintance.forEach((event: any) => {
              maintenanceData.push([
                item.resultName || 'N/A',
                'RP2',
                event['Start Date Time'] || 'N/A',
                event['End Date Time'] || 'N/A',
                event['Event Details'] || 'N/A',
                event['Department'] || 'N/A',
                event['Stoppage Category'] || 'N/A',
                event['Reason of Stoppage'] || 'N/A',
                event['Calculated Duration (H:M)'] || 'N/A'
              ]);
            });
          }
        }
      });

      if (maintenanceData.length > 1) {
        const maintenanceSheet = XLSX.utils.aoa_to_sheet(maintenanceData);
        XLSX.utils.book_append_sheet(workbook, maintenanceSheet, 'Maintenance Events');
      }

      // Style the sheets (make headers bold)
      Object.keys(workbook.Sheets).forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        
        // Style first row as header
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (sheet[cellAddress]) {
            sheet[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'E3F2FD' } }
            };
          }
        }
        
        // Auto-fit columns
        const cols = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          let maxWidth = 10;
          for (let row = range.s.r; row <= range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (sheet[cellAddress] && sheet[cellAddress].v) {
              const cellValue = sheet[cellAddress].v.toString();
              maxWidth = Math.max(maxWidth, cellValue.length);
            }
          }
          cols.push({ width: Math.min(maxWidth + 2, 50) });
        }
        sheet['!cols'] = cols;
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `Diagnostic_Report_${timestamp}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);
      
      console.log('Excel file exported successfully:', filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting data to Excel. Please try again.');
    }
  }

  const filteredData = diagnosticData.filter((item) => {
    // First apply status filter
    const statusMatch = selectedFilter === "all" || item.status.toLowerCase() === selectedFilter
    
    // Then apply search filter across all data
    const searchMatch = !searchTerm || (() => {
      const searchLower = searchTerm.toLowerCase()
      
      // Search in basic fields
      const basicMatch = 
        item.millName.toLowerCase().includes(searchLower) ||
        item.issue.toLowerCase().includes(searchLower) ||
        item.status.toLowerCase().includes(searchLower) ||
        item.lastUpdated.toLowerCase().includes(searchLower) ||
        (item.details?.targetSPC && item.details.targetSPC.toLowerCase().includes(searchLower)) ||
        (item.details?.daySPC && item.details.daySPC.toLowerCase().includes(searchLower)) ||
        (item.details?.deviation && item.details.deviation.toLowerCase().includes(searchLower)) ||
        (item.details?.impact && item.details.impact.toLowerCase().includes(searchLower))
      
      if (basicMatch) return true
      
      // Search in backend data (TPH section)
      if (item.backendData?.TPH) {
        const tph = item.backendData.TPH
        if (
          (tph.cause && tph.cause.toLowerCase().includes(searchLower)) ||
          (tph.Device && tph.Device.toLowerCase().includes(searchLower)) ||
          (tph.target && tph.target.toString().includes(searchLower)) ||
          (tph.sensor && JSON.stringify(tph.sensor).toLowerCase().includes(searchLower))
        ) return true
        
        // Search in TPH subsections
        if (tph.one_rp_down) {
          const oneRpDown = tph.one_rp_down
          if (typeof oneRpDown === 'object') {
            for (const key in oneRpDown) {
              if (typeof oneRpDown[key] === 'string' && oneRpDown[key].toLowerCase().includes(searchLower)) {
                return true
              }
            }
          }
        }
        
        if (tph.both_rp_down) {
          const bothRpDown = tph.both_rp_down
          if (typeof bothRpDown === 'object') {
            for (const key in bothRpDown) {
              if (typeof bothRpDown[key] === 'string' && bothRpDown[key].toLowerCase().includes(searchLower)) {
                return true
              }
            }
          }
        }
        
        if (tph["Reduced Feed Operations"]) {
          const reducedFeed = tph["Reduced Feed Operations"]
          if (typeof reducedFeed === 'object') {
            for (const key in reducedFeed) {
              if (typeof reducedFeed[key] === 'string' && reducedFeed[key].toLowerCase().includes(searchLower)) {
                return true
              }
            }
          }
        }
        
        // Search in maintenance data
        if (tph.RP1_maintance && Array.isArray(tph.RP1_maintance)) {
          for (const maintenance of tph.RP1_maintance) {
            if (
              (maintenance["Event Details"] && maintenance["Event Details"].toLowerCase().includes(searchLower)) ||
              (maintenance["Department"] && maintenance["Department"].toLowerCase().includes(searchLower)) ||
              (maintenance["Stoppage Category"] && maintenance["Stoppage Category"].toLowerCase().includes(searchLower)) ||
              (maintenance["Reason of Stoppage"] && maintenance["Reason of Stoppage"].toLowerCase().includes(searchLower))
            ) return true
          }
        }
        
        if (tph.RP2_maintance && Array.isArray(tph.RP2_maintance)) {
          for (const maintenance of tph.RP2_maintance) {
            if (
              (maintenance["Event Details"] && maintenance["Event Details"].toLowerCase().includes(searchLower)) ||
              (maintenance["Department"] && maintenance["Department"].toLowerCase().includes(searchLower)) ||
              (maintenance["Stoppage Category"] && maintenance["Stoppage Category"].toLowerCase().includes(searchLower)) ||
              (maintenance["Reason of Stoppage"] && maintenance["Reason of Stoppage"].toLowerCase().includes(searchLower))
            ) return true
          }
        }
        
        // Search in lowfeed data
        if (tph.lowfeed && Array.isArray(tph.lowfeed)) {
          for (const lowfeed of tph.lowfeed) {
            if (
              (lowfeed.period_start && lowfeed.period_start.toLowerCase().includes(searchLower)) ||
              (lowfeed.period_end && lowfeed.period_end.toLowerCase().includes(searchLower)) ||
              (lowfeed.end_reason && lowfeed.end_reason.toLowerCase().includes(searchLower)) ||
              (lowfeed.pumps_running && lowfeed.pumps_running.toString().includes(searchLower)) ||
              (lowfeed.expected_tph && lowfeed.expected_tph.toString().includes(searchLower)) ||
              (lowfeed.avg_tph && lowfeed.avg_tph.toString().includes(searchLower)) ||
              (lowfeed.min_tph && lowfeed.min_tph.toString().includes(searchLower)) ||
              (lowfeed.max_tph && lowfeed.max_tph.toString().includes(searchLower)) ||
              (lowfeed.efficiency_loss_percent && lowfeed.efficiency_loss_percent.toString().includes(searchLower))
            ) return true
          }
        }
      }
      
      // Search in High Power section
      if (item.backendData?.High_Power) {
        const hp = item.backendData.High_Power
        if (
          (hp.Device && hp.Device.toLowerCase().includes(searchLower)) ||
          (hp.sensor && JSON.stringify(hp.sensor).toLowerCase().includes(searchLower))
        ) return true
        
        if (hp.SKS_FAN) {
          const sksFan = hp.SKS_FAN
          if (
            (sksFan.cause && sksFan.cause.toLowerCase().includes(searchLower)) ||
            (sksFan.sensor && JSON.stringify(sksFan.sensor).toLowerCase().includes(searchLower)) ||
            (sksFan.Target && JSON.stringify(sksFan.Target).toLowerCase().includes(searchLower))
          ) return true
        }
        
        if (hp.mill_auxiliaries) {
          const millAux = hp.mill_auxiliaries
          if (millAux.cause && millAux.cause.toLowerCase().includes(searchLower)) {
            return true
          }
        }
        
        if (hp.product_transportation) {
          const productTrans = hp.product_transportation
          if (productTrans.cause && productTrans.cause.toLowerCase().includes(searchLower)) {
            return true
          }
        }
      }
      
      // Search in idle running section
      if (item.backendData?.idle_running) {
        const idleRunning = item.backendData.idle_running
        if (idleRunning.cause && idleRunning.cause.toLowerCase().includes(searchLower)) {
          return true
        }
      }
      
      return false
    })()
    
    return statusMatch && searchMatch
  })

  // Create expanded data from filtered data
  const expandedData = filteredData.reduce((acc, item, index) => {
    acc[index] = {
      targetSPC: item.details?.targetSPC || "N/A",
      daySPC: item.details?.daySPC || "N/A", 
      deviation: item.details?.deviation || "N/A",
      impact: item.details?.impact || "N/A"
    };
    return acc;
  }, {} as Record<number, { targetSPC: string; daySPC: string; deviation: string; impact: string }>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <LumaSpin />
          <p className="mt-4 text-gray-600">Loading diagnostic data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Automatic Diagnosis and Recommendation Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-4 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                Raw Mill
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Raw Mill</DropdownMenuItem>
              <DropdownMenuItem>Cement Mill</DropdownMenuItem>
              <DropdownMenuItem>Coal Mill</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Replace DropdownMenu for date range with Duration button and popover */}
          <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                Duration : <span className="font-semibold">{currentPreset}</span>
                <span className="ml-2">{displayRange}</span>
                <CalendarDays className="w-4 h-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 max-w-fit shadow-xl border rounded-lg">
              <TimeRangePicker
                value={selectedRange}
                onChange={setSelectedRange}
                onCancel={() => setTimePickerOpen(false)}
                onApply={() => setTimePickerOpen(false)}
              />
            </PopoverContent>
          </Popover>

          {/* Add refresh button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-transparent"
            onClick={() => {
              // Force refresh by updating the time range slightly
              setSelectedRange(prev => ({ ...prev }));
            }}
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>

          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
            <span className="font-medium">Insight:</span>
            <span className="font-mono">INS_015ce0dcf91c</span>
            <span>•</span>
            <span className="font-medium">Results:</span>
            <span>{diagnosticData.length}</span>
            <span>•</span>
            <span className="font-medium">Range:</span>
            <span>Real-time data</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            onClick={() => setSelectedFilter(selectedFilter === "high" ? "all" : "high")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "high" ? "bg-red-500 text-white shadow-md" : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            High ({diagnosticData.filter((item) => item.status.toLowerCase() === "high").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "medium" ? "all" : "medium")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "medium"
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            Medium ({diagnosticData.filter((item) => item.status.toLowerCase() === "medium").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "low" ? "all" : "low")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "low"
                ? "bg-green-500 text-white shadow-md"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Low ({diagnosticData.filter((item) => item.status.toLowerCase() === "low").length})
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Diagnostic View</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-transparent hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search faults, assets, or status..." 
                  className="pl-10 pr-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Mill Name</TableHead>
                  <TableHead>Detected Issue</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[180px]">Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.millName}</TableCell>
                      <TableCell className="text-sm text-gray-700">{item.issue}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status.toLowerCase() === "high" ? "destructive" : item.status.toLowerCase() === "medium" ? "secondary" : "outline"
                          }
                          className={
                            item.status.toLowerCase() === "high"
                              ? "bg-red-100 text-red-800 hover:bg-red-100"
                              : item.status.toLowerCase() === "medium"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : "bg-green-100 text-green-800 hover:bg-green-100"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.lastUpdated}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => toggleRowExpansion(index)}
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(index) && expandedData[index as keyof typeof expandedData] && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50 p-6">
                          <div className="space-y-6">
                            {/* Level 1: KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Target SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].targetSPC}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-green-600 font-medium">Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Day SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].daySPC}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Deviation</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-red-600">
                                    {expandedData[index as keyof typeof expandedData].deviation}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-xs text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-xs font-medium text-gray-600">Impact</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-xl font-bold text-gray-900">
                                    {item.status}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                        item.status.toLowerCase().includes("high") ||
                                        item.status.toLowerCase().includes("critical") ||
                                        item.status.toLowerCase().includes("severe")
                                          ? "bg-red-500"
                                          : item.status.toLowerCase().includes("medium") || item.status.toLowerCase().includes("moderate")
                                            ? "bg-yellow-500"
                                            : "bg-green-500"
                                      }`}
                                    ></div>
                                    <span
                                      className={`text-xs font-medium ${
                                        item.status.toLowerCase().includes("high") ||
                                        item.status.toLowerCase().includes("critical") ||
                                        item.status.toLowerCase().includes("severe")
                                          ? "text-red-600"
                                          : item.status.toLowerCase().includes("medium") || item.status.toLowerCase().includes("moderate")
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                      }`}
                                    >
                                      {item.status} Impact
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Level 3: Accordions */}
                            <div className="bg-white rounded-lg border">
                              <Accordion
                                type="multiple"
                                className="w-full"
                                defaultValue={["lower-output", "idle-running", "high-power"]}
                              >
                                <AccordionItem value="lower-output" className="border-b">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-900 font-bold">Lower Output (TPH)</span>
                                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="ml-auto transition-all duration-200 hover:bg-yellow-100 hover:text-yellow-700 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 active:scale-95"
                                      onClick={e => {
                                        e.stopPropagation();
                                        openMaintenancePopup(filteredData[index]?.backendData);
                                      }}
                                      disabled={
                                        (!Array.isArray((filteredData[index]?.backendData?.TPH as any)?.RP1_maintance) || 
                                         (filteredData[index]?.backendData?.TPH as any)?.RP1_maintance?.length === 0) &&
                                        (!Array.isArray((filteredData[index]?.backendData?.TPH as any)?.RP2_maintance) || 
                                         (filteredData[index]?.backendData?.TPH as any)?.RP2_maintance?.length === 0)
                                      }
                                      title="View maintenance events for RP1 and RP2"
                                    >
                                      <Wrench className="w-6 h-6 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
                                    </Button>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    <div className="space-y-4">
                                      {/* TPH Cause from backend */}
                                      {filteredData[index]?.backendData?.TPH?.cause && (
                                        <p className="text-gray-700">
                                          {highlightNumbers(filteredData[index].backendData.TPH.cause)}
                                        </p>
                                      )}

                                      {/* One RP Down Section */}
                                      {filteredData[index]?.backendData?.TPH?.one_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">One RP Down</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index]?.backendData?.TPH?.one_rp_down?.rampup, "One RP Down", filteredData[index]?.backendData)}
                                              className={`p-1 rounded transition-colors ${
                                                hasTrendData(filteredData[index].backendData, "One RP Down")
                                                  ? "hover:bg-gray-200 text-blue-600"
                                                  : "text-gray-400 cursor-not-allowed opacity-50"
                                              }`}
                                              title={hasTrendData(filteredData[index].backendData, "One RP Down") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(filteredData[index].backendData, "One RP Down")}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH.one_rp_down) ? 
                                              filteredData[index].backendData.TPH.one_rp_down.map((item: any, i: number) => (
                                                <div key={`one-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`one-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{highlightNumbers(item)}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH.one_rp_down === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH.one_rp_down)
                                                      .filter(([key]) => /^\d+$/.test(key)) // Only numbered keys
                                                      .map(([key, value], j) => (
                                                      <div key={`one-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(filteredData[index].backendData.TPH.one_rp_down))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      )}

                                      {/* Both RP Down Section */}
                                      {filteredData[index]?.backendData?.TPH?.both_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">Both RP Down</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index]?.backendData?.TPH?.both_rp_down, "Both RP Down", filteredData[index]?.backendData)}
                                              className={`p-1 rounded transition-colors ${
                                                hasTrendData(filteredData[index].backendData, "Both RP Down")
                                                  ? "hover:bg-gray-200 text-blue-600"
                                                  : "text-gray-400 cursor-not-allowed opacity-50"
                                              }`}
                                              title={hasTrendData(filteredData[index].backendData, "Both RP Down") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(filteredData[index].backendData, "Both RP Down")}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH.both_rp_down) ? 
                                              filteredData[index].backendData.TPH.both_rp_down.map((item: any, i: number) => (
                                                <div key={`both-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`both-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{highlightNumbers(item)}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH.both_rp_down === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH.both_rp_down)
                                                      .filter(([key]) => /^\d+$/.test(key)) // Only numbered keys
                                                      .map(([key, value], j) => (
                                                      <div key={`both-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(filteredData[index].backendData.TPH.both_rp_down))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                        </div>
                                      )}

                                      {/* Reduced Feed Operations Section */}
                                      {filteredData[index]?.backendData?.TPH?.["Reduced Feed Operations"] && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">Reduced Feed Operations</h4>
                                            <button
                                              onClick={() => openPopup(filteredData[index]?.backendData?.TPH?.lowfeed, "Reduced Feed Operations", filteredData[index]?.backendData)}
                                              className={`p-1 rounded transition-colors ${
                                                hasTrendData(filteredData[index].backendData, "Reduced Feed Operations")
                                                  ? "hover:bg-gray-200 text-blue-600"
                                                  : "text-gray-400 cursor-not-allowed opacity-50"
                                              }`}
                                              title={hasTrendData(filteredData[index].backendData, "Reduced Feed Operations") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(filteredData[index].backendData, "Reduced Feed Operations")}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(filteredData[index].backendData.TPH["Reduced Feed Operations"]) ? 
                                              filteredData[index].backendData.TPH["Reduced Feed Operations"].map((item: any, i: number) => (
                                                <div key={`reduced-feed-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">{highlightNumbers(item)}</span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )) : (
                                                <div className="space-y-1">
                                                  {typeof filteredData[index].backendData.TPH["Reduced Feed Operations"] === 'object' ? 
                                                    Object.entries(filteredData[index].backendData.TPH["Reduced Feed Operations"]).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(filteredData[index].backendData.TPH["Reduced Feed Operations"]))}
                                                        </span>
                                                      </div>
                                                    )
                                                  }
                                                </div>
                                              )
                                            }
                                          </div>
                                          
                                          
                                        </div>
                                      )}

                                      {/* In the TPH main section, add the View Maintenance button */}
                                      {/* This button is now moved to the accordion header */}

                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="idle-running" className="border-b">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <span className="text-gray-900 font-bold">Idle Running</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {filteredData[index]?.backendData?.idle_running?.cause ? (
                                      <p className="text-gray-700">
                                        {highlightNumbers(filteredData[index].backendData.idle_running.cause)}
                                      </p>
                                    ) : (
                                      <p className="text-gray-700">
                                        No idle running data available.
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="high-power">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <span className="text-gray-900 font-bold">High Power</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {filteredData[index]?.backendData?.High_Power ? (
                                      <div className="space-y-4">
                                        {filteredData[index].backendData.High_Power.SKS_FAN && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">SKS Fan</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index]?.backendData?.High_Power?.SKS_FAN, "SKS Fan", filteredData[index]?.backendData)}
                                                className={`p-1 rounded transition-colors ${
                                                  hasTrendData(filteredData[index].backendData, "SKS Fan")
                                                    ? "hover:bg-gray-200 text-blue-600"
                                                    : "text-gray-400 cursor-not-allowed opacity-50"
                                                }`}
                                                title={hasTrendData(filteredData[index].backendData, "SKS Fan") ? "View trend chart" : "No trend data available"}
                                                disabled={!hasTrendData(filteredData[index].backendData, "SKS Fan")}
                                              >
                                                <svg
                                                  className="w-4 h-4"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                  />
                                                </svg>
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.SKS_FAN.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.SKS_FAN.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.SKS_FAN)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`sks-fan-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(String(value ?? ''))}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                        {filteredData[index].backendData.High_Power.mill_auxiliaries && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">Mill Auxiliaries</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index]?.backendData?.High_Power?.mill_auxiliaries, "Mill Auxiliaries", filteredData[index]?.backendData)}
                                                className={`p-1 rounded transition-colors ${
                                                  hasTrendData(filteredData[index].backendData, "Mill Auxiliaries")
                                                    ? "hover:bg-gray-200 text-blue-600"
                                                    : "text-gray-400 cursor-not-allowed opacity-50"
                                                }`}
                                                title={hasTrendData(filteredData[index].backendData, "Mill Auxiliaries") ? "View trend chart" : "No trend data available"}
                                                disabled={!hasTrendData(filteredData[index].backendData, "Mill Auxiliaries")}
                                              >
                                                <svg
                                                  className="w-4 h-4"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                  />
                                                </svg>
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.mill_auxiliaries.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.mill_auxiliaries.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.mill_auxiliaries)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`mill-aux-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(String(value ?? ''))}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                        {filteredData[index].backendData.High_Power.product_transportation && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold text-gray-900">Product Transportation</h4>
                                              <button
                                                onClick={() => openPopup(filteredData[index]?.backendData?.High_Power?.product_transportation, "Product Transportation", filteredData[index]?.backendData)}
                                                className={`p-1 rounded transition-colors ${
                                                  hasTrendData(filteredData[index].backendData, "Product Transportation")
                                                    ? "hover:bg-gray-200 text-blue-600"
                                                    : "text-gray-400 cursor-not-allowed opacity-50"
                                                }`}
                                                title={hasTrendData(filteredData[index].backendData, "Product Transportation") ? "View trend chart" : "No trend data available"}
                                                disabled={!hasTrendData(filteredData[index].backendData, "Product Transportation")}
                                              >
                                                <svg
                                                  className="w-4 h-4"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                  />
                                                </svg>
                                              </button>
                                            </div>
                                            {filteredData[index].backendData.High_Power.product_transportation.cause && (
                                              <p className="text-sm text-gray-700 mb-3">
                                                {highlightNumbers(filteredData[index].backendData.High_Power.product_transportation.cause)}
                                              </p>
                                            )}
                                            <div className="space-y-2">
                                              {Object.entries(filteredData[index].backendData.High_Power.product_transportation)
                                                .filter(([key, value]) => !isNaN(Number(key)) && typeof value === 'string')
                                                .map(([key, value], i: number) => (
                                                  <div key={`product-transport-${index}-${i}`} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-sm text-gray-600">
                                                      {highlightNumbers(String(value ?? ''))}
                                                    </span>
                                                  </div>
                                                ))
                                              }
                                            </div>
                                            

                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-gray-700">
                                        No high power data available.
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Popup Modal */}
      {popupData.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {popupData.section} - Detailed Analysis
              </h3>
              <button
                onClick={closePopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <Tabs defaultValue="table" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">Table Data</TabsTrigger>
                  <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table" className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Data Table</h4>
                    {popupData.data && Array.isArray(popupData.data) ? (
                      <div className="overflow-x-auto max-h-[75vh]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {popupData.section === "Reduced Feed Operations" ? (
                                <>
                                  <TableHead className="w-[150px]">Start Time</TableHead>
                                  <TableHead className="w-[150px]">End Time</TableHead>
                                  <TableHead className="w-[120px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Pumps Running</TableHead>
                                  <TableHead className="w-[120px]">Average TPH</TableHead>
                                  <TableHead className="w-[120px]">Minimum TPH</TableHead>
                                  <TableHead className="w-[120px]">Maximum TPH</TableHead>
                                </>
                              ) : popupData.section.includes("RP Down") && Array.isArray(popupData.data) && popupData.data.length > 0 && popupData.data[0].scenario ? (
                                <>
                                  <TableHead className="w-[200px]">Scenario</TableHead>
                                  <TableHead className="w-[150px]">Ramp Start</TableHead>
                                  <TableHead className="w-[150px]">Ramp End</TableHead>
                                  <TableHead className="w-[150px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Final TPH</TableHead>
                                  <TableHead className="w-[200px]">Stability Reason</TableHead>
                                </>
                              ) : (
                                <>
                                  <TableHead className="w-[200px]">Scenario</TableHead>
                                  <TableHead className="w-[150px]">Ramp Start</TableHead>
                                  <TableHead className="w-[150px]">Ramp End</TableHead>
                                  <TableHead className="w-[150px]">Duration (min)</TableHead>
                                  <TableHead className="w-[120px]">Final TPH</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {popupData.data.map((item: any, i: number) => (
                              <TableRow key={i}>
                                {popupData.section === "Reduced Feed Operations" ? (
                                  <>
                                    <TableCell>{formatTime(item.period_start)}</TableCell>
                                    <TableCell>{formatTime(item.period_end)}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{item.pumps_running === 1 ? "Single" : item.pumps_running === 2 ? "Both" : item.pumps_running || "N/A"}</TableCell>
                                    <TableCell>{formatNumber(item.avg_tph)}</TableCell>
                                    <TableCell>{formatNumber(item.min_tph)}</TableCell>
                                    <TableCell>{formatNumber(item.max_tph)}</TableCell>
                                  </>
                                ) : popupData.section.includes("RP Down") && Array.isArray(popupData.data) && item.scenario ? (
                                  <>
                                    <TableCell className="font-medium">{item.scenario || `Event ${i + 1}`}</TableCell>
                                    <TableCell>{formatTime(item.ramp_start)}</TableCell>
                                    <TableCell>{formatTime(item.ramp_end)}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{formatNumber(item.final_tph)}</TableCell>
                                    <TableCell>{item.stability_reason || ""}</TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell className="font-medium">{item.scenario || `Event ${i + 1}`}</TableCell>
                                    <TableCell>{formatTime(item.ramp_start) !== 'N/A' && !isNaN(Date.parse(item.ramp_start)) ? formatTime(item.ramp_start) : (item.start_time ? formatTime(item.start_time) : (item.period_start ? formatTime(item.period_start) : 'N/A'))}</TableCell>
                                    <TableCell>{formatTime(item.ramp_end) !== 'N/A' && !isNaN(Date.parse(item.ramp_end)) ? formatTime(item.ramp_end) : (item.end_time ? formatTime(item.end_time) : (item.period_end ? formatTime(item.period_end) : 'N/A'))}</TableCell>
                                    <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                    <TableCell>{formatNumber(item.final_tph)}</TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-gray-500">No table data available</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="trend" className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Trend Analysis</h4>
                    <div className="bg-white rounded p-4 border">
                      <p className="text-gray-600 mb-4">
                        Real-time trend analysis for {popupData.section.toLowerCase()} data.
                        The chart shows sensor values over time for the selected period.
                      </p>
                      
                      {/* Show trend chart only if data and device/sensor info is available */}
                      {popupData.data && (
                        <div className="space-y-4">
                          {/* TPH Trend Chart for all TPH subsections */}
                          {["Reduced Feed Operations", "One RP Down", "Both RP Down"].includes(popupData.section) && popupData.backendData?.TPH?.sensor && popupData.backendData?.TPH?.Device && (
                            <TrendChart
                              deviceId={popupData.backendData.TPH.Device}
                              sensorList={Object.keys(popupData.backendData.TPH.sensor)}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title={`${popupData.section} Trend`}
                              targetValue={(() => {
                                // Extract target value directly from TPH section
                                const targetValue = popupData.backendData?.TPH?.target;
                                return targetValue ? parseFloat(targetValue) : undefined;
                              })()}
                              events={
                                popupData.data && Array.isArray(popupData.data) 
                                  ? popupData.data.map((item: any, index: number) => {
                                      let startTime, endTime;
                                      
                                      if (popupData.section === "Reduced Feed Operations") {
                                        startTime = item.period_start || item.start_time;
                                        endTime = item.period_end || item.end_time;
                                      } else if (popupData.section.includes("RP Down")) {
                                        startTime = item.ramp_start || item.start_time;
                                        endTime = item.ramp_end || item.end_time;
                                      }
                                      
                                      return {
                                        startTime,
                                        endTime,
                                        color: undefined // Will use default color from TrendChart
                                      };
                                    }).filter((event: any) => event.startTime && event.endTime)
                                  : undefined
                              }
                              legendNames={
                                popupData.section === "One RP Down" || popupData.section === "Both RP Down"
                                  ? {
                                      normal: "Raw mill feed rate",
                                      event: "Ramp-up event"
                                    }
                                  : popupData.section === "Reduced Feed Operations"
                                    ? {
                                        normal: "Raw mill feed rate",
                                        event: "Low feed event"
                                      }
                                  : undefined
                              }
                            />
                          )}
                          
                          {/* SKS Fan Trend Chart */}
                          {popupData.section === "SKS Fan" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["sks_fan_sensor_001", "sks_fan_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="SKS Fan Trend"
                              legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                              targetValue={(() => {
                                // Extract target value from SKS_FAN section
                                const sksFanData = popupData.backendData?.High_Power?.SKS_FAN;
                                if (sksFanData?.Target) {
                                  // Get the first target value (assuming single sensor for now)
                                  const targetValues = Object.values(sksFanData.Target);
                                  return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                                }
                                return undefined;
                              })()}
                            />
                          )}
                          
                          {/* Mill Auxiliaries Trend Chart */}
                          {popupData.section === "Mill Auxiliaries" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["mill_aux_sensor_001", "mill_aux_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="Mill Auxiliaries Trend"
                              legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                              targetValue={(() => {
                                // Extract target value from mill_auxiliaries section if available
                                const millAuxData = popupData.backendData?.High_Power?.mill_auxiliaries;
                                if (millAuxData?.Target) {
                                  const targetValues = Object.values(millAuxData.Target);
                                  return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                                }
                                return undefined;
                              })()}
                            />
                          )}
                          
                          {/* Product Transportation Trend Chart */}
                          {popupData.section === "Product Transportation" && shouldShowTrend(popupData.backendData, "High_Power") && (
                            <TrendChart
                              deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                              sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["transport_sensor_001", "transport_sensor_002"]}
                              startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                              endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                              title="Product Transportation Trend"
                              legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                              targetValue={(() => {
                                // Extract target value from product_transportation section if available
                                const transportData = popupData.backendData?.High_Power?.product_transportation;
                                if (transportData?.Target) {
                                  const targetValues = Object.values(transportData.Target);
                                  return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                                }
                                return undefined;
                              })()}
                            />
                          )}
                          
                          {/* Show message if no trend data available */}
                          
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Popup Modal */}
      {maintenancePopup.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">TPH Maintenance Events</h3>
              <button onClick={closeMaintenancePopup} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <Tabs value={maintenancePopup.activeTab} onValueChange={tab => setMaintenancePopup(p => ({ ...p, activeTab: tab as 'RP1' | 'RP2' }))}>
                <TabsList className="mb-4">
                  <TabsTrigger value="RP1">RP1 Maintenance</TabsTrigger>
                  <TabsTrigger value="RP2">RP2 Maintenance</TabsTrigger>
                </TabsList>
                <TabsContent value="RP1">
                  {maintenancePopup.rp1.length > 0 ? (
                    <div className="overflow-x-auto max-h-[60vh]">
                      <Table className="min-w-full border rounded-lg">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="px-4 py-2 text-left border-b">Start Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b">End Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[180px] truncate cursor-pointer" title={maintenancePopup.rp1[0]["Event Details"]}>
                              Event Details
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Department</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Stoppage Category</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[140px] truncate cursor-pointer" title={maintenancePopup.rp1[0]["Reason of Stoppage"]}>
                              Reason of Stoppage
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Calculated Duration (H:M)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenancePopup.rp1.map((item, i) => (
                            <TableRow key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Start Date Time"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["End Date Time"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[180px] truncate cursor-pointer"
                                title={item["Event Details"]}
                              >
                                {item["Event Details"]}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Department"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Stoppage Category"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[140px] truncate cursor-pointer"
                                title={item["Reason of Stoppage"]}
                              >
                                {item["Reason of Stoppage"]}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Calculated Duration (H:M)"]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No RP1 maintenance data available.</p>
                  )}
                </TabsContent>
                <TabsContent value="RP2">
                  {maintenancePopup.rp2.length > 0 ? (
                    <div className="overflow-x-auto max-h-[60vh]">
                      <Table className="min-w-full border rounded-lg">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="px-4 py-2 text-left border-b">Start Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b">End Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[180px] truncate cursor-pointer" title={maintenancePopup.rp2[0]["Event Details"]}>
                              Event Details
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Department</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Stoppage Category</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[140px] truncate cursor-pointer" title={maintenancePopup.rp2[0]["Reason of Stoppage"]}>
                              Reason of Stoppage
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Calculated Duration (H:M)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenancePopup.rp2.map((item, i) => (
                            <TableRow key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Start Date Time"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["End Date Time"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[180px] truncate cursor-pointer"
                                title={item["Event Details"]}
                              >
                                {item["Event Details"]}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Department"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Stoppage Category"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[140px] truncate cursor-pointer"
                                title={item["Reason of Stoppage"]}
                              >
                                {item["Reason of Stoppage"]}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Calculated Duration (H:M)"]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No RP2 maintenance data available.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
