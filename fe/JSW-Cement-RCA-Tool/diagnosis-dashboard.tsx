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
import { DynamicHighPowerSection } from "./dynamic-high-power-section";
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

// Function to convert UTC time to IST (UTC+5:30)
const formatTimeIST = (value: any): string => {
  if (value === null || value === undefined || value === "N/A") {
    return "N/A";
  }
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    
    // Use toLocaleString with Asia/Kolkata timezone for accurate IST conversion
    const istDateString = date.toLocaleString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Format as YYYY-MM-DD HH:mm:ss (IST time without timezone indicator)
    const [datePart, timePart] = istDateString.split(', ');
    return `${datePart} ${timePart}`;
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

// Note: UTC to IST conversion removed since backend now handles IST timezone directly

export default function Component() {
  
  // Add state for time picker modal and range
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  const endOfYear = new Date(now.getFullYear(), 11, 31); // December 31st of current year
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>({
    startDate: startOfYear.toISOString().slice(0, 10),
    startTime: "00:00",
    endDate: endOfYear.toISOString().slice(0, 10),
    endTime: "23:59",
  });

  // Add state for maintenance popup
  const [maintenancePopup, setMaintenancePopup] = useState<{isOpen: boolean, activeTab: 'RP1' | 'RP2' | 'Klin', rp1: any[], rp2: any[], klin: any[]}>({
    isOpen: false,
    activeTab: 'RP1',
    rp1: [],
    rp2: [],
    klin: []
  });

  // Function to open maintenance popup
  const openMaintenancePopup = (backendData: any, defaultTab: 'RP1' | 'RP2' | 'Klin' = 'RP1') => {
    const klinData = backendData?.klin_maintance || [];
    const rp1Data = backendData?.TPH?.RP1_maintance || [];
    const rp2Data = backendData?.TPH?.RP2_maintance || [];
    
    // Determine the default tab based on available data
    let activeTab = defaultTab;
    if (defaultTab === 'Klin' && klinData.length > 0) {
      activeTab = 'Klin';
    } else if (klinData.length > 0 && rp1Data.length === 0 && rp2Data.length === 0) {
      activeTab = 'Klin';
    } else if (rp1Data.length > 0) {
      activeTab = 'RP1';
    } else if (rp2Data.length > 0) {
      activeTab = 'RP2';
    }
    
    setMaintenancePopup({
      isOpen: true,
      activeTab,
      rp1: rp1Data,
      rp2: rp2Data,
      klin: klinData
    });
  };
  const closeMaintenancePopup = () => setMaintenancePopup({ ...maintenancePopup, isOpen: false });

  // Pass the selected time range to the hook
  const { diagnosticData, loading, error } = useDiagnosticData(selectedRange);
  
  
  const [selectedFilter, setSelectedFilter] = useState<"high" | "medium" | "low" | "normal" | "all">("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null)
  const [popupData, setPopupData] = useState<{isOpen: boolean, data: any, section: string, backendData?: any}>({
    isOpen: false,
    data: null,
    section: "",
    backendData: null
  })

  // Format range for display (dates only, no times)
  const displayRange = `${selectedRange.startDate} - ${selectedRange.endDate}`;

  // Function to get High Power subsections based on mill type
const getHighPowerSubsections = (millType: string) => {
  switch (millType) {
    case "Cement Mill 1":
      return [
        "RP1",
        "RP2", 
        "Product Transportation MCC15_SPC",
        "580SR1 VFD (580FN1+580SR1)_SPC",
        "OPC Mill Feeding_SPC",
        "Product Transportation_SPC"
      ];
    case "Klin":
      return [
        "phf1",
        "phf2",
        "Klin_main_drive_1",
        "Klin_main_drive_2"
      ];
    case "Raw Mill":
    default:
      return [
        "SKS_FAN",
        "mill_auxiliaries", 
        "product_transportation"
      ];
  }
  };

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
            if (typeof value === 'string' && (value.includes('ABBRWML') || value.includes('ABBBHPH') || value.includes('ABBKLN'))) {
              return value;
            }
          }
          // Look for ABBRWML, ABBBHPH, or ABBKLN strings anywhere
          if (typeof value === 'string' && (value.includes('ABBRWML') || value.includes('ABBBHPH') || value.includes('ABBKLN'))) {
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
    if (!sectionData) {
      return null;
    }
    
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
    
    return null;
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
    
    // Special handling for Quality sections
    if (section === "Quality" || section === "45 Micron" || section === "90 Micron" || section === "Blaine") {
      const qualityData = data?.Qulity;
      
      if (qualityData && qualityData.table && Array.isArray(qualityData.table) && qualityData.table.length > 0) {
        return true;
      }
      return false;
    }
    
    // Special handling for High Power subsections
    if (["SKS Fan", "Mill Auxiliaries", "Product Transportation", "RP1", "RP2", "Product Transportation MCC15", "OPC Mill Feeding", "Pre Process", "PHF1", "PHF2", "Preheater Fan 1", "Preheater Fan 2", "Klin Main Drive 1", "Klin Main Drive 2", "Klin_main_drive_1", "Klin_main_drive_2"].includes(section)) {
      // For High Power subsections, check if the specific subsection has sensor data
      let subsectionData = null;
      let subsectionKey = "";
      
      switch (section) {
        case "SKS Fan":
          subsectionData = data?.High_Power?.SKS_FAN;
          subsectionKey = "SKS_FAN";
          break;
        case "Mill Auxiliaries":
          subsectionData = data?.High_Power?.mill_auxiliaries;
          subsectionKey = "mill_auxiliaries";
          break;
        case "Product Transportation":
          subsectionData = data?.High_Power?.product_transportation;
          subsectionKey = "product_transportation";
          break;
        case "RP1":
          subsectionData = data?.High_Power?.rp1;
          subsectionKey = "rp1";
          break;
        case "RP2":
          subsectionData = data?.High_Power?.rp2;
          subsectionKey = "rp2";
          break;
        case "Product Transportation MCC15":
          subsectionData = data?.High_Power?.["Product Transportation MCC15_SPC"];
          subsectionKey = "Product Transportation MCC15_SPC";
          break;
        case "OPC Mill Feeding":
          subsectionData = data?.High_Power?.["OPC Mill Feeding_SPC"];
          subsectionKey = "OPC Mill Feeding_SPC";
          break;
        case "Pre Process":
          subsectionData = data?.High_Power?.pre_process;
          subsectionKey = "pre_process";
          break;
        case "PHF1":
        case "Preheater Fan 1":
          subsectionData = data?.High_Power?.phf1;
          subsectionKey = "phf1";
          break;
        case "PHF2":
        case "Preheater Fan 2":
          subsectionData = data?.High_Power?.phf2;
          subsectionKey = "phf2";
          break;
        case "Klin Main Drive 1":
        case "Klin_main_drive_1":
          subsectionData = data?.High_Power?.Klin_main_drive_1;
          subsectionKey = "Klin_main_drive_1";
          break;
        case "Klin Main Drive 2":
        case "Klin_main_drive_2":
          subsectionData = data?.High_Power?.Klin_main_drive_2;
          subsectionKey = "Klin_main_drive_2";
          break;
      }
      
      // Check if subsection has sensor information
      if (!subsectionData || !subsectionData.sensor) {
        return false; // Disable trend if no sensor data available
      }
      
      // Extract sensor IDs from the specific subsection
      let sensorIds: string[] = [];
      if (Array.isArray(subsectionData.sensor)) {
        sensorIds = subsectionData.sensor;
      } else if (typeof subsectionData.sensor === 'object') {
        sensorIds = Object.keys(subsectionData.sensor);
      } else {
        sensorIds = [subsectionData.sensor];
      }
      
      return !!(deviceId && sensorIds && sensorIds.length > 0);
    }
    
    // Special handling for TPH subsections
    if (["Reduced Feed Operations", "Single RP Down", "One RP Down", "Both RP Down", "Ball Mill"].includes(section)) {
      // For TPH subsections, prioritize TPH-specific device ID and sensor data
      const tphData = data?.TPH;
      const tphDeviceId = tphData?.Device || deviceId;
      const tphSensorData = tphData?.sensor;
      
      // Check if we have trend data for this specific section
      const hasData = hasTrendData(data, section);
      
      // For TPH sections, we need either TPH device ID or general device ID, and either TPH sensor data or section data
      if (!tphDeviceId) {
        return false;
      }
      
      // If we have TPH sensor data, use it
      if (tphSensorData) {
        const sensorIds = Object.keys(tphSensorData);
        return !!(tphDeviceId && sensorIds && sensorIds.length > 0);
      }
      
      // If no TPH sensor data but we have section data, still allow trend
      if (hasData && tphDeviceId) {
        return true;
      }
      
      return false;
    }
    
    // For other sections, use the original logic
    const sensorIds = extractSensorIds(data, section);
    return !!(deviceId && sensorIds && sensorIds.length > 0);
  };

  // Function to get sensor list for SKS Fan with dual sensors
  const getSKSFanSensorList = (data: any): string[] => {
    const sksFanData = data?.High_Power?.SKS_FAN;
    if (!sksFanData || !sksFanData.sensor) {
      return ["D209"]; // Default fallback
    }
    
    const sensors: string[] = [];
    
    // Add SKS Fan Speed sensor
    if (typeof sksFanData.sensor === 'object') {
      sensors.push(...Object.keys(sksFanData.sensor));
    }
    
    // Add Raw Mill Feed Rate sensors (D49 and D5) for calculation
    if (!sensors.includes('D49')) sensors.push('D49');
    if (!sensors.includes('D5')) sensors.push('D5');
    
    return sensors;
  };

  // Function to get sensor names for SKS Fan with dual sensors
  const getSKSFanSensorNames = (data: any): Record<string, string> => {
    const sksFanData = data?.High_Power?.SKS_FAN;
    const sensorNames: Record<string, string> = {};
    
    // Add SKS Fan Speed sensor name
    if (sksFanData?.sensor && typeof sksFanData.sensor === 'object') {
      for (const [sensorId, sensorName] of Object.entries(sksFanData.sensor)) {
        sensorNames[sensorId] = sensorName as string;
      }
    }
    
    // Add Raw Mill Feed Rate as calculated sensor
    sensorNames['Raw mill feed rate'] = 'Raw Mill Feed Rate';
    
    return sensorNames;
  };

  // Function to check if trend data is available for a specific section
  const hasTrendData = (data: any, section: string): boolean => {
    if (!data) return false;
    let sectionData;
    switch (section) {
      case "Single RP Down":
      case "One RP Down":
        // Try multiple possible paths for Single RP Down data
        sectionData = data?.TPH?.one_rp_down?.rampup || data?.TPH?.one_rp_down || data?.TPH?.["Single RP Down"];
        break;
      case "Both RP Down":
        sectionData = data?.TPH?.both_rp_down;
        break;
      case "Reduced Feed Operations":
        sectionData = data?.TPH?.lowfeed;
        break;
      case "TPH Events":
        // For TPH Events, check if we have TPH data with Device and sensor info
        return data?.TPH?.Device && data?.TPH?.sensor;
      case "Ball Mill":
        sectionData = data?.TPH?.ball_mill;
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
      case "PHF1":
      case "Preheater Fan 1":
        sectionData = data?.High_Power?.phf1;
        break;
      case "PHF2":
      case "Preheater Fan 2":
        sectionData = data?.High_Power?.phf2;
        break;
      case "Klin Main Drive 1":
      case "Klin_main_drive_1":
        sectionData = data?.High_Power?.Klin_main_drive_1;
        break;
      case "Klin Main Drive 2":
      case "Klin_main_drive_2":
        sectionData = data?.High_Power?.Klin_main_drive_2;
        break;
      default:
        return false;
    }
    if (Array.isArray(sectionData)) {
      return sectionData.length > 0;
    }
    if (typeof sectionData === 'object' && sectionData !== null) {
      // For High Power subsections, check if we have sensor and device data for trend analysis
      if (["PHF1", "PHF2", "Preheater Fan 1", "Preheater Fan 2", "Klin Main Drive 1", "Klin Main Drive 2", "Klin_main_drive_1", "Klin_main_drive_2"].includes(section)) {
        return !!(sectionData.sensor && sectionData.Device);
      }
      
      
      // For other sections, ignore metadata fields like 'cause', 'device', 'sensor'
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
    // Component initialization logic can be added here if needed
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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Header with blue band
      doc.setFillColor(52, 152, 219); // Blue color
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      // Header text
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Connect Everything', pageWidth - 25, 20, { align: 'right' });
      
      // Reset text color for main content
      doc.setTextColor(44, 62, 80); // Dark blue-gray
      
      // Main title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('JSW Cement RCA Tool Report', pageWidth / 2, 60, { align: 'center' });
      yPosition = 80;
      
      // Executive Summary section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const summaryText = `This diagnostic report provides a comprehensive analysis of cement plant operations based on data from ${selectedRange.startDate} to ${selectedRange.endDate}. The analysis covers SPC (Specific Power Consumption), TPH (Tons Per Hour) operations, and High Power consumption patterns. The report identifies ${filteredData.length} diagnostic events with varying impact levels on plant efficiency.`;
      
      // Split text into lines that fit the page width
      const splitText = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
      doc.text(splitText, margin, yPosition);
      yPosition += splitText.length * 6 + 20;
      
      // Summary Statistics with colored boxes
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text('Summary Statistics', margin, yPosition);
      yPosition += 20;
      
      // Create colored statistic boxes
      const stats = [
        { label: 'Total Records', value: filteredData.length, color: [52, 152, 219] }, // Blue
        { label: 'High Priority', value: diagnosticData.filter(item => item.status.toLowerCase() === 'high').length, color: [231, 76, 60] }, // Red
        { label: 'Medium Priority', value: diagnosticData.filter(item => item.status.toLowerCase() === 'medium').length, color: [243, 156, 18] }, // Orange
        { label: 'Normal', value: diagnosticData.filter(item => item.status.toLowerCase() === 'normal').length, color: [46, 204, 113] }, // Green
        { label: 'Low Priority', value: diagnosticData.filter(item => item.status.toLowerCase() === 'low').length, color: [52, 73, 94] } // Dark Blue
      ];
      
      const boxWidth = (pageWidth - 2 * margin - 40) / 5; // 5 boxes with spacing
      const boxHeight = 25;
      
      stats.forEach((stat, index) => {
        const xPos = margin + (index * (boxWidth + 10));
        
        // Colored background box
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.rect(xPos, yPosition - 15, boxWidth, boxHeight, 'F');
        
        // White text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value.toString(), xPos + boxWidth / 2, yPosition - 5, { align: 'center' });
        
        doc.setFontSize(8);
        doc.text(stat.label, xPos + boxWidth / 2, yPosition + 5, { align: 'center' });
      });
      
      yPosition += 40;
      
      // Analysis of Device Data section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text('Analysis of Device Data', margin, yPosition);
      yPosition += 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Device Analysis and Insights', margin, yPosition);
      yPosition += 15;
      
      // Group data by date
      const groupedData = groupDataByDate(filteredData);
      const sortedDates = Object.keys(groupedData).sort();
      
      sortedDates.forEach((date, dateIndex) => {
        const dailyData = groupedData[date];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
          
          // Add header to new page
          doc.setFillColor(52, 152, 219);
          doc.rect(0, 0, pageWidth, 20, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('JSW Cement RCA Tool Report - Continued', pageWidth / 2, 12, { align: 'center' });
          doc.setTextColor(44, 62, 80);
          yPosition = 40;
        }
        
        // Date header with background
        doc.setFillColor(236, 240, 241); // Light gray background
        doc.rect(margin - 5, yPosition - 8, pageWidth - 2 * margin + 10, 12, 'F');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(`Date: ${date}`, margin, yPosition);
        yPosition += 20;
        
        // Records for this date
        dailyData.forEach((item, itemIndex) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 120) {
            doc.addPage();
            yPosition = 20;
            
            // Add header to new page
            doc.setFillColor(52, 152, 219);
            doc.rect(0, 0, pageWidth, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('JSW Cement RCA Tool Report - Continued', pageWidth / 2, 12, { align: 'center' });
            doc.setTextColor(44, 62, 80);
            yPosition = 40;
          }
          
          // Device ID header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219); // Blue color
          doc.text(`Device ID: ${item.sectionName || 'N/A'}`, margin, yPosition);
          yPosition += 12;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          
          // Create structured sections like in the UI
          const sections = [];
          
          // Basic Info Section
          sections.push({
            title: 'Basic Information',
            items: [
              `Date of Report: ${date}`,
              `Status: ${item.status}`,
              `Section: ${item.sectionName || 'N/A'}`
            ]
          });
          
          // SPC Section
          if (item.backendData?.SPC) {
            const spc = item.backendData.SPC;
            sections.push({
              title: 'SPC Analysis',
              items: [
                `SPC Target: ${formatNumber(spc.target)} kWh/t`,
                `SPC Today: ${formatNumber(spc.today)} kWh/t`,
                `Deviation: ${formatNumber(spc.deviation)}%`,
                `Impact: ${spc.Impact || 'N/A'}`
              ]
            });
          }
          
          // TPH Section
          if (item.backendData?.TPH) {
            const tph = item.backendData.TPH;
            const tphItems = [];
            
            if (tph.cause) {
              tphItems.push(`Cause: ${tph.cause}`);
            }
            if (tph.target) {
              tphItems.push(`Target TPH: ${formatNumber(tph.target)}`);
            }
            
            // Add TPH subsections
            if (tph.one_rp_down && typeof tph.one_rp_down === 'object') {
              tphItems.push('Single RP Down Analysis:');
              Object.entries(tph.one_rp_down).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  tphItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (tph.both_rp_down && typeof tph.both_rp_down === 'object') {
              tphItems.push('Both RP Down Analysis:');
              Object.entries(tph.both_rp_down).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  tphItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (tph["Reduced Feed Operations"] && typeof tph["Reduced Feed Operations"] === 'object') {
              tphItems.push('Reduced Feed Operations:');
              Object.entries(tph["Reduced Feed Operations"]).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  tphItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (tph.ball_mill && typeof tph.ball_mill === 'object') {
              tphItems.push('Ball Mill Analysis:');
              Object.entries(tph.ball_mill).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  tphItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (tphItems.length > 0) {
              sections.push({
                title: 'TPH Analysis',
                items: tphItems
              });
            }
          }
          
          // High Power Section
          if (item.backendData?.High_Power) {
            const hp = item.backendData.High_Power;
            const hpItems = [];
            
            if (hp.Device) {
              hpItems.push(`Device: ${hp.Device}`);
            }
            
            if (hp.SKS_FAN && typeof hp.SKS_FAN === 'object') {
              hpItems.push('SKS Fan Analysis:');
              Object.entries(hp.SKS_FAN).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  hpItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (hp.mill_auxiliaries && typeof hp.mill_auxiliaries === 'object') {
              hpItems.push('Mill Auxiliaries Analysis:');
              Object.entries(hp.mill_auxiliaries).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  hpItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            if (hp.product_transportation && typeof hp.product_transportation === 'object') {
              hpItems.push('Product Transportation Analysis:');
              Object.entries(hp.product_transportation).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  hpItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            // RP1 - Show only cause
            if (hp.rp1 && typeof hp.rp1 === 'object') {
              hpItems.push('RP1 Analysis:');
              if (hp.rp1.cause && typeof hp.rp1.cause === 'string' && hp.rp1.cause.length > 0) {
                hpItems.push(`  • Cause: ${hp.rp1.cause}`);
              }
            }
            
            // RP2 - Show only cause
            if (hp.rp2 && typeof hp.rp2 === 'object') {
              hpItems.push('RP2 Analysis:');
              if (hp.rp2.cause && typeof hp.rp2.cause === 'string' && hp.rp2.cause.length > 0) {
                hpItems.push(`  • Cause: ${hp.rp2.cause}`);
              }
            }
            
            // PHF1 - Preheater Fan 1
            if (hp.phf1 && typeof hp.phf1 === 'object') {
              hpItems.push('Preheater Fan 1 Analysis:');
              Object.entries(hp.phf1).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  hpItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            // PHF2 - Preheater Fan 2
            if (hp.phf2 && typeof hp.phf2 === 'object') {
              hpItems.push('Preheater Fan 2 Analysis:');
              Object.entries(hp.phf2).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                  hpItems.push(`  • ${key}: ${value}`);
                }
              });
            }
            
            
            if (hpItems.length > 0) {
              sections.push({
                title: 'High Power Analysis',
                items: hpItems
              });
            }
          }
          
          // Idle Running Section
          if (item.backendData?.idle_running) {
            const idle = item.backendData.idle_running;
            if (idle.cause) {
              sections.push({
                title: 'Idle Running Analysis',
                items: [`Cause: ${idle.cause}`]
              });
            }
          }
          
          // Render sections with proper formatting
          sections.forEach((section, sectionIndex) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              doc.addPage();
              yPosition = 20;
              
              // Add header to new page
              doc.setFillColor(52, 152, 219);
              doc.rect(0, 0, pageWidth, 20, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text('JSW Cement RCA Tool Report - Continued', pageWidth / 2, 12, { align: 'center' });
              doc.setTextColor(44, 62, 80);
              yPosition = 40;
            }
            
            // Section title with background
            doc.setFillColor(236, 240, 241); // Light gray background
            doc.rect(margin - 5, yPosition - 8, pageWidth - 2 * margin + 10, 12, 'F');
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(44, 62, 80);
            doc.text(section.title, margin, yPosition);
            yPosition += 15;
            
            // Section items
            section.items.forEach((item, itemIndex) => {
              // Check if we need a new page
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                
                // Add header to new page
                doc.setFillColor(52, 152, 219);
                doc.rect(0, 0, pageWidth, 20, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('JSW Cement RCA Tool Report - Continued', pageWidth / 2, 12, { align: 'center' });
                doc.setTextColor(44, 62, 80);
                yPosition = 40;
              }
              
              // Determine indentation level
              let indentLevel = 0;
              let displayText = item;
              
              if (item.startsWith('  • ')) {
                indentLevel = 1;
                displayText = item.substring(4); // Remove "  • "
              } else if (item.startsWith('    • ')) {
                indentLevel = 2;
                displayText = item.substring(6); // Remove "    • "
              } else if (item.startsWith('  ')) {
                indentLevel = 1;
                displayText = item.substring(2); // Remove "  "
              }
              
              // Split long text into multiple lines
              const maxWidth = pageWidth - 2 * margin - 8 - (indentLevel * 8);
              const splitText = doc.splitTextToSize(displayText, maxWidth);
              
                             splitText.forEach((line: string, lineIndex: number) => {
                // Check if we need a new page for this line
                if (yPosition > pageHeight - 20) {
                  doc.addPage();
                  yPosition = 20;
                  
                  // Add header to new page
                  doc.setFillColor(52, 152, 219);
                  doc.rect(0, 0, pageWidth, 20, 'F');
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(12);
                  doc.setFont('helvetica', 'bold');
                  doc.text('JSW Cement RCA Tool Report - Continued', pageWidth / 2, 12, { align: 'center' });
                  doc.setTextColor(44, 62, 80);
                  yPosition = 40;
                }
                
                // Bullet point (only for first line)
                if (lineIndex === 0) {
                  doc.setFillColor(52, 152, 219);
                  doc.circle(margin + 2 + (indentLevel * 8), yPosition - 2, 1, 'F');
                }
                
                // Text with proper indentation
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                doc.text(line, margin + 8 + (indentLevel * 8), yPosition);
                yPosition += 6;
              });
            });
            
            yPosition += 10; // Space between sections
          });
          
          yPosition += 15;
        });
      });
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `JSW_Cement_RCA_Report_${timestamp}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert(`Error generating PDF report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Excel export function
  const exportToExcel = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare Executive Summary data
      const summaryData = [
        ['JSW Cement RCA Tool Report'],
        [''],
        ['Executive Summary'],
        [''],
        [`This diagnostic report provides a comprehensive analysis of cement plant operations based on data from ${selectedRange.startDate} to ${selectedRange.endDate}. The analysis covers SPC (Specific Power Consumption), TPH (Tons Per Hour) operations, and High Power consumption patterns. The report identifies ${filteredData.length} diagnostic events with varying impact levels on plant efficiency.`],
        [''],
        ['Report Generated:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Time Range:', `${selectedRange.startDate} ${selectedRange.startTime} - ${selectedRange.endDate} ${selectedRange.endTime}`],
        ['Total Records:', filteredData.length.toString()],
        ['Filter Applied:', selectedFilter === 'all' ? 'All' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)],
        ['Search Term:', 'None'],
        [''],
        ['Summary Statistics'],
        [''],
        ['Category', 'Count', 'Color Code'],
        ['Total Records', filteredData.length.toString(), 'Blue'],
        ['High Priority', diagnosticData.filter(item => item.status.toLowerCase() === 'high').length.toString(), 'Red'],
        ['Medium Priority', diagnosticData.filter(item => item.status.toLowerCase() === 'medium').length.toString(), 'Orange'],
        ['Normal', diagnosticData.filter(item => item.status.toLowerCase() === 'normal').length.toString(), 'Green'],
        ['Low Priority', diagnosticData.filter(item => item.status.toLowerCase() === 'low').length.toString(), 'Dark Blue'],
        ['']
      ];

      // Add summary sheet with styling
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths
      summarySheet['!cols'] = [
        { width: 20 },
        { width: 15 },
        { width: 15 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      // Prepare main diagnostic data
      const diagnosticHeaders = [
        'MILL NAME',
        'TARGET',
        'Day SPC',
        'Deviation',
        'Impact',
        'Day'
      ];

      const diagnosticRows = finalFilteredData.map(item => [
        item.sectionName || 'N/A',
        item.backendData?.SPC?.target ? `${formatNumber(item.backendData.SPC.target)} kWh/t` : 'N/A',
        item.backendData?.SPC?.today ? `${formatNumber(item.backendData.SPC.today)} kWh/t` : 'N/A',
        item.backendData?.SPC?.deviation ? `${formatNumber(item.backendData.SPC.deviation)}%` : 'N/A',
        item.status || 'N/A',
        new Date(item.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
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
        'Both RP Down Ramp-up',
        'Reduced Feed Duration',
        'Ball Mill Duration'
      ];
      tphData.push(tphHeaders);

      finalFilteredData.forEach(item => {
        if (item.backendData?.TPH) {
          const tph = item.backendData.TPH;
          tphData.push([
            item.resultName || 'N/A',
            formatTime(item.timestamp),
            (tph as any).Device || 'N/A',
            formatNumber((tph as any).target),
            (tph as any).cause || 'N/A',
            (tph as any).both_rp_down?.[1] || 'N/A',
            (tph as any).both_rp_down?.[2] || 'N/A',
            (tph as any)["Reduced Feed Operations"]?.[1] || 'N/A',
            (tph as any).ball_mill?.[1] || 'N/A'
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

      finalFilteredData.forEach(item => {
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

      finalFilteredData.forEach(item => {
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

      // Style the sheets with colors and formatting
      Object.keys(workbook.Sheets).forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        
        // Style headers and sections
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (sheet[cellAddress]) {
              const cellValue = sheet[cellAddress].v;
              
              // Style section headers (rows with only one column filled)
              if (col === 0 && typeof cellValue === 'string' && 
                  (cellValue.includes('Analysis') || cellValue.includes('Information') || 
                   cellValue.startsWith('Date:') || cellValue.includes('Summary'))) {
                sheet[cellAddress].s = {
                  font: { bold: true, color: { rgb: '2C3E50' } },
                  fill: { fgColor: { rgb: 'ECF0F1' } }
                };
              }
              // Style main headers
              else if (row === 0 || (col === 0 && typeof cellValue === 'string' && 
                       (cellValue.includes('Category') || cellValue.includes('Timestamp') || 
                        cellValue.includes('Asset') || cellValue.includes('Status')))) {
                sheet[cellAddress].s = {
                  font: { bold: true, color: { rgb: 'FFFFFF' } },
                  fill: { fgColor: { rgb: '3498DB' } }
                };
              }
              // Style status cells with colors
              else if (typeof cellValue === 'string' && 
                      (cellValue.toLowerCase() === 'high' || cellValue.toLowerCase() === 'medium' || 
                       cellValue.toLowerCase() === 'normal' || cellValue.toLowerCase() === 'low')) {
                let color = '000000';
                if (cellValue.toLowerCase() === 'high') color = 'E74C3C';
                else if (cellValue.toLowerCase() === 'medium') color = 'F39C12';
                else if (cellValue.toLowerCase() === 'normal') color = '27AE60';
                else if (cellValue.toLowerCase() === 'low') color = '34495E';
                
                sheet[cellAddress].s = {
                  font: { bold: true, color: { rgb: color } },
                  fill: { fgColor: { rgb: color + '20' } }
                };
              }
            }
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
      const filename = `JSW_Cement_RCA_Report_${timestamp}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting data to Excel. Please try again.');
    }
  }

  // Sorting function
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Sort data function
  const sortData = (data: any[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'millName':
          aValue = a.sectionName || '';
          bValue = b.sectionName || '';
          break;
        case 'target':
          aValue = a.backendData?.SPC?.target || 0;
          bValue = b.backendData?.SPC?.target || 0;
          break;
        case 'daySPC':
          aValue = a.backendData?.SPC?.today || 0;
          bValue = b.backendData?.SPC?.today || 0;
          break;
        case 'deviation':
          aValue = a.backendData?.SPC?.deviation || 0;
          bValue = b.backendData?.SPC?.deviation || 0;
          break;
        case 'impact':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'day':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  };

  const filteredData = diagnosticData.filter((item) => {
    // Apply status filter
    const statusMatch = selectedFilter === "all" || item.status.toLowerCase() === selectedFilter;
    
    // Apply section filter
    let sectionMatch = false;
    if (selectedSection === "all") {
      sectionMatch = true;
    } else {
      sectionMatch = item.sectionName === selectedSection;
    }
    
    // Note: Date filtering is now handled by the API call, so we don't need to filter here again
    // This prevents double filtering which could cause data to be lost
    
    return statusMatch && sectionMatch;
  })

  // Use filteredData directly - Klin Main Drive sections are subsections within High Power, not separate rows
  const finalFilteredData = filteredData;


  // Apply sorting to filtered data
  const sortedData = sortData(finalFilteredData);

  // Create expanded data from sorted data
  const expandedData = sortedData.reduce((acc, item, index) => {
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
          <p className="mt-2 text-sm text-gray-500">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-4">Error Loading Data</h2>
          <p className="mb-4">{error}</p>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 max-w-md text-left">
            <h3 className="font-semibold mb-2">Troubleshooting:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Verify the backend service is running</li>
              <li>• Check browser console for detailed errors</li>
              <li>• Try refreshing the page</li>
              <li>• The system will automatically retry failed connections</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center mt-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Refresh Page
            </Button>
            <Button 
              onClick={() => {
                // Force a retry by updating the time range slightly
                const now = new Date();
                const newRange = {
                  startDate: now.toISOString().slice(0, 10),
                  startTime: "00:00",
                  endDate: now.toISOString().slice(0, 10),
                  endTime: "23:59"
                };
                setSelectedRange(newRange);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Add a simple test to see if basic rendering works
  console.log('About to render main UI...');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">RCA Insights Dashboard</h1>
          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <span className="text-sm text-gray-600">
                {loading ? 'Connecting...' : error ? 'Connection Issue' : 'Connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-4 mb-4">
          {/* Section Filter - moved to top */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by Section:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  {selectedSection === "all" ? "All Sections" : selectedSection}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedSection("all")}>
                  All Sections
                </DropdownMenuItem>
                {Array.from(new Set(finalFilteredData.map(item => item.sectionName))).map((sectionName) => (
                  <DropdownMenuItem key={sectionName} onClick={() => setSelectedSection(sectionName)}>
                    {sectionName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedSection !== "all" && (
              <button
                onClick={() => setSelectedSection("all")}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Section Filter
              </button>
            )}
          </div>

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
        </div>

        <div className="flex items-center gap-2">
          <div
            onClick={() => setSelectedFilter(selectedFilter === "high" ? "all" : "high")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "high" ? "bg-red-500 text-white shadow-md" : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            High ({finalFilteredData.filter((item) => item.status.toLowerCase() === "high").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "medium" ? "all" : "medium")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "medium"
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            Medium ({finalFilteredData.filter((item) => item.status.toLowerCase() === "medium").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "low" ? "all" : "low")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "low"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Low ({finalFilteredData.filter((item) => item.status.toLowerCase() === "low").length})
          </div>

          <div
            onClick={() => setSelectedFilter(selectedFilter === "normal" ? "all" : "normal")}
            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedFilter === "normal"
                ? "bg-green-500 text-white shadow-md"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            Normal ({finalFilteredData.filter((item) => item.status.toLowerCase() === "normal").length})
          </div>
          </div>
          

        {/* Active Filters Summary */}
        {(selectedFilter !== "all" || selectedSection !== "all") && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <span>Active Filters:</span>
            {selectedFilter !== "all" && (
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                Status: {selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}
              </span>
            )}
            {selectedSection !== "all" && (
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                Section: {selectedSection}
              </span>
            )}
          </div>
        )}
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="w-[200px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('millName')}
                  >
                    <div className="flex items-center gap-1">
                      MILL NAME
                      {sortConfig?.key === 'millName' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[100px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('target')}
                  >
                    <div className="flex items-center gap-1">
                      TARGET
                      {sortConfig?.key === 'target' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[100px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('daySPC')}
                  >
                    <div className="flex items-center gap-1">
                      SPC
                      {sortConfig?.key === 'daySPC' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[100px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('deviation')}
                  >
                    <div className="flex items-center gap-1">
                      Deviation
                      {sortConfig?.key === 'deviation' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[100px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('impact')}
                  >
                    <div className="flex items-center gap-1">
                      Impact
                      {sortConfig?.key === 'impact' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[100px] text-base font-semibold cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('day')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortConfig?.key === 'day' && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium text-base">{item.sectionName}</TableCell>
                      <TableCell className="text-base text-gray-700">
                        {item.backendData?.SPC?.target ? `${formatNumber(item.backendData.SPC.target)} kWh/t` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-base text-gray-700">
                        {item.backendData?.SPC?.today ? `${formatNumber(item.backendData.SPC.today)} kWh/t` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-base text-gray-700">
                        {item.backendData?.SPC?.deviation ? (() => {
                          const deviationPercent = item.backendData.SPC.deviation;
                          const targetValue = item.backendData.SPC.target;
                          const todayValue = item.backendData.SPC.today;
                          
                          if (targetValue && todayValue) {
                            const actualDeviation = todayValue - targetValue;
                            const sign = actualDeviation >= 0 ? '+' : '';
                            return `${sign}${formatNumber(actualDeviation)} (${formatNumber(deviationPercent)}%)`;
                          }
                          return `${formatNumber(deviationPercent)}%`;
                        })() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status.toLowerCase() === "high" ? "destructive" : item.status.toLowerCase() === "medium" ? "secondary" : "outline"
                          }
                          className={
                            item.status.toLowerCase() === "high"
                              ? "bg-red-100 text-red-800 hover:bg-red-100 text-base"
                              : item.status.toLowerCase() === "medium"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-base"
                                : item.status.toLowerCase() === "normal"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100 text-base"
                                  : "bg-blue-100 text-blue-800 hover:bg-blue-100 text-base"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-base text-gray-600">
                        {(() => {
                          const currentDate = new Date(item.timestamp);
                          const previousDay = new Date(currentDate);
                          previousDay.setDate(currentDate.getDate() - 1);
                          return previousDay.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                        })()}
                      </TableCell>
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
                        <TableCell colSpan={7} className="bg-gray-50 p-6">
                          <div className="space-y-6">
                            {/* Level 1: KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-sm font-medium text-gray-600">Target SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].targetSPC}
                                  </div>
                                  {/* Removed the green dot and 'Target' label */}
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-sm font-medium text-gray-600">SPC</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {expandedData[index as keyof typeof expandedData].daySPC}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-sm text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-sm font-medium text-gray-600">Deviation</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div className="text-2xl font-bold text-red-600">
                                    {expandedData[index as keyof typeof expandedData].deviation}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                                    <span className="text-sm text-red-600 font-medium">Above Target</span>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-white">
                                <CardHeader className="pb-1 px-3 pt-2">
                                  <CardTitle className="text-sm font-medium text-gray-600">Impact</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2">
                                  <div 
                                    className={`text-2xl font-bold ${
                                      item.status.toLowerCase().includes("high") ||
                                      item.status.toLowerCase().includes("critical") ||
                                      item.status.toLowerCase().includes("severe")
                                        ? "text-red-600"
                                        : item.status.toLowerCase().includes("medium") || item.status.toLowerCase().includes("moderate")
                                          ? "text-yellow-600"
                                          : item.status.toLowerCase().includes("low")
                                            ? "text-blue-600"
                                            : "text-green-600"
                                    }`}
                                  >
                                    {item.status}
                                  </div>
                                  {/* Removed the dot and "Impact" label */}
                                </CardContent>
                              </Card>
                            </div>

                            {/* Level 3: Accordions */}
                            <div className="bg-white rounded-lg border">
                              <Accordion
                                type="multiple"
                                className="w-full"
                                defaultValue={(() => {
                                  const baseSections = ["lower-output", "idle-running", "high-power"];
                                  // Add quality section if data exists and is not empty
                                  const qualityData = sortedData[index]?.backendData?.Qulity as any;
                                  console.log('Accordion Debug - Index:', index, 'Quality Data:', qualityData);
                                  
                                  const hasQualityData = qualityData && 
                                    (qualityData['45_'] || 
                                     qualityData['Blaine_'] || 
                                     qualityData['90_'] ||
                                     (qualityData.table && 
                                      Array.isArray(qualityData.table) && 
                                      qualityData.table.length > 0));
                                  
                                  console.log('Accordion Debug - hasQualityData:', hasQualityData);
                                  
                                  if (hasQualityData) {
                                    baseSections.push("quality");
                                    console.log('Accordion Debug - Added quality to baseSections:', baseSections);
                                  }

                                  // Add Kiln section if this is a Kiln section
                                  if (sortedData[index]?.sectionName === "Kiln") {
                                    baseSections.push("kiln");
                                    console.log('Accordion Debug - Added kiln to baseSections for Kiln section:', baseSections);
                                  }
                                  
                                  return baseSections;
                                })()}
                              >
                                <AccordionItem value="lower-output" className="border-b">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-900 font-bold text-base">
                                        {selectedSection === "Cement Mill 1" ? "TPH" : "Lower Output (TPH)"}
                                      </span>
                                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <Button
                                      className="ml-auto relative overflow-hidden transition-all duration-300 ease-in-out bg-yellow-50 hover:bg-yellow-100 text-yellow-800 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 active:scale-95 rounded-xl px-2 py-0.5 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group text-xs font-medium"
                                      onClick={e => {
                                        e.stopPropagation();
                                        openMaintenancePopup(sortedData[index]?.backendData);
                                      }}
                                      disabled={
                                        (!Array.isArray((sortedData[index]?.backendData?.TPH as any)?.RP1_maintance) || 
                                         (sortedData[index]?.backendData?.TPH as any)?.RP1_maintance?.length === 0) &&
                                        (!Array.isArray((sortedData[index]?.backendData?.TPH as any)?.RP2_maintance) || 
                                         (sortedData[index]?.backendData?.TPH as any)?.RP2_maintance?.length === 0)
                                      }
                                      title="View maintenance events for RP1 and RP2"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        stoppages <Wrench className="w-3 h-3 inline-block align-middle text-yellow-800" />
                                      </span>
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    </Button>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    <div className="space-y-4">
                                      {/* TPH Cause from backend */}
                                      {sortedData[index]?.backendData?.TPH?.cause && (
                                        <p className="text-gray-700 text-base">
                                          {highlightNumbers(sortedData[index].backendData.TPH.cause)}
                                        </p>
                                      )}

                                      {/* One RP Down Section */}
                                      {sortedData[index]?.backendData?.TPH?.one_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 text-base">
                                              {sortedData[index]?.sectionName === "Kiln" ? "Klin Feed" : "Single RP Down"}
                                            </h4>
                                            <button
                                              onClick={() => {
                                                // For Klin sections, use TPH events
                                                // For Raw Mill sections, use rampup data
                                                const isKlin = sortedData[index]?.sectionName === "Kiln";
                                                const isRawMill = sortedData[index]?.sectionName === "Raw Mill 1" || sortedData[index]?.sectionName?.toLowerCase().includes('raw mill');
                                                
                                                if (isKlin) {
                                                  // Klin: use TPH events
                                                  openPopup(sortedData[index]?.backendData?.TPH?.events, "TPH Events", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName});
                                                } else if (isRawMill) {
                                                  // Raw Mill: use rampup data
                                                  openPopup(sortedData[index]?.backendData?.TPH?.one_rp_down?.rampup, "Single RP Down", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName});
                                                } else {
                                                  // Default: use TPH events (for other mills)
                                                  openPopup(sortedData[index]?.backendData?.TPH?.events, "TPH Events", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName});
                                                }
                                              }}
                                              className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                hasTrendData(sortedData[index].backendData, "Single RP Down")
                                                  ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                  : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                              }`}
                                              title={hasTrendData(sortedData[index].backendData, "Single RP Down") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(sortedData[index].backendData, "Single RP Down")}
                                            >
                                              <svg
                                                className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                  hasTrendData(sortedData[index].backendData, "Single RP Down") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                }`}
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
                                              {hasTrendData(sortedData[index].backendData, "Single RP Down") && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                              )}
                                            </button>
                                          </div>
                                          
                                          
                                          <div className="space-y-2">
                                            {Array.isArray(sortedData[index]?.backendData?.TPH?.one_rp_down) ? 
                                              sortedData[index].backendData.TPH.one_rp_down.map((item: any, i: number) => (
                                                <div key={`one-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`one-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
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
                                                  {typeof sortedData[index]?.backendData?.TPH?.one_rp_down === 'object' ? 
                                                    Object.entries(sortedData[index].backendData.TPH.one_rp_down)
                                                      .filter(([key]) => /^\d+$/.test(key)) // Only numbered keys
                                                      .map(([key, value], j) => (
                                                      <div key={`one-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
                                                          {highlightNumbers(String(sortedData[index]?.backendData?.TPH?.one_rp_down))}
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
                                      {sortedData[index]?.backendData?.TPH?.both_rp_down && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 text-base">Both RP Down</h4>
                                            <button
                                              onClick={() => {
                                                const tphData = sortedData[index]?.backendData?.TPH;
                                                const bothRpDown = tphData?.both_rp_down;
                                                const rampupData = bothRpDown?.rampup;
                                                
                                                console.log('Both RP Down button clicked - TPH data:', tphData);
                                                console.log('Both RP Down button clicked - both_rp_down object:', bothRpDown);
                                                console.log('Both RP Down button clicked - rampup data:', rampupData);
                                                
                                                // For Both RP Down, prioritize rampup array for table display
                                                const data = rampupData || (bothRpDown?.rampup) || [];
                                                console.log('Both RP Down button clicked - final data:', data);
                                                console.log('Both RP Down button clicked - data type:', typeof data);
                                                console.log('Both RP Down button clicked - is array:', Array.isArray(data));
                                                
                                                openPopup(data, "Both RP Down", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName});
                                              }}
                                              className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                hasTrendData(sortedData[index].backendData, "Both RP Down")
                                                  ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                  : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                              }`}
                                              title={hasTrendData(sortedData[index].backendData, "Both RP Down") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(sortedData[index].backendData, "Both RP Down")}
                                            >
                                              <svg
                                                className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                  hasTrendData(sortedData[index].backendData, "Both RP Down") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                }`}
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
                                              {hasTrendData(sortedData[index].backendData, "Both RP Down") && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                              )}
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(sortedData[index].backendData.TPH.both_rp_down) ? 
                                              sortedData[index].backendData.TPH.both_rp_down.map((item: any, i: number) => (
                                                <div key={`both-rp-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`both-rp-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
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
                                                  {typeof sortedData[index].backendData.TPH.both_rp_down === 'object' ? 
                                                    Object.entries(sortedData[index].backendData.TPH.both_rp_down)
                                                      .filter(([key]) => key !== 'rampup') // Show all keys except rampup (which is handled separately)
                                                      .map(([key, value], j) => (
                                                      <div key={`both-rp-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(sortedData[index].backendData.TPH.both_rp_down))}
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
                                      {sortedData[index]?.backendData?.TPH?.["Reduced Feed Operations"] && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 text-base">Reduced Feed Operations</h4>
                                            <button
                                              onClick={() => openPopup(sortedData[index]?.backendData?.TPH?.lowfeed, "Reduced Feed Operations", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName})}
                                              className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                hasTrendData(sortedData[index].backendData, "Reduced Feed Operations")
                                                  ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                  : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                              }`}
                                              title={hasTrendData(sortedData[index].backendData, "Reduced Feed Operations") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(sortedData[index].backendData, "Reduced Feed Operations")}
                                            >
                                              <svg
                                                className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                  hasTrendData(sortedData[index].backendData, "Reduced Feed Operations") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                }`}
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
                                              {hasTrendData(sortedData[index].backendData, "Reduced Feed Operations") && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                              )}
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(sortedData[index].backendData.TPH["Reduced Feed Operations"]) ? 
                                              sortedData[index].backendData.TPH["Reduced Feed Operations"].map((item: any, i: number) => (
                                                <div key={`reduced-feed-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
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
                                                  {typeof sortedData[index].backendData.TPH["Reduced Feed Operations"] === 'object' ? 
                                                    Object.entries(sortedData[index].backendData.TPH["Reduced Feed Operations"]).map(([key, value], j: number) => (
                                                      <div key={`reduced-feed-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(sortedData[index].backendData.TPH["Reduced Feed Operations"]))}
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

                                      {/* Ball Mill Section */}
                                      {sortedData[index]?.backendData?.TPH?.ball_mill && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 text-base">Ball Mill</h4>
                                            <button
                                              onClick={() => openPopup(sortedData[index]?.backendData?.TPH?.ball_mill, "Ball Mill", {...sortedData[index]?.backendData, sectionName: sortedData[index]?.sectionName})}
                                              className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                hasTrendData(sortedData[index].backendData, "Ball Mill")
                                                  ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                  : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                              }`}
                                              title={hasTrendData(sortedData[index].backendData, "Ball Mill") ? "View trend chart" : "No trend data available"}
                                              disabled={!hasTrendData(sortedData[index].backendData, "Ball Mill")}
                                            >
                                              <svg
                                                className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                  hasTrendData(sortedData[index].backendData, "Ball Mill") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                }`}
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
                                              {hasTrendData(sortedData[index].backendData, "Ball Mill") && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                              )}
                                            </button>
                                          </div>
                                          <div className="space-y-2">
                                            {Array.isArray(sortedData[index].backendData.TPH.ball_mill) ? 
                                              sortedData[index].backendData.TPH.ball_mill.map((item: any, i: number) => (
                                                <div key={`ball-mill-${index}-${i}`} className="space-y-1">
                                                  {typeof item === 'object' ? 
                                                    Object.entries(item).map(([key, value], j: number) => (
                                                      <div key={`ball-mill-item-${index}-${i}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
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
                                                  {typeof sortedData[index].backendData.TPH.ball_mill === 'object' ? 
                                                    Object.entries(sortedData[index].backendData.TPH.ball_mill).map(([key, value], j: number) => (
                                                      <div key={`ball-mill-single-${index}-${j}`} className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-base text-gray-600">
                                                          {highlightNumbers(String(value ?? ''))}
                                                        </span>
                                                      </div>
                                                    ))
                                                    : (
                                                      <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span className="text-sm text-gray-600">
                                                          {highlightNumbers(String(sortedData[index].backendData.TPH.ball_mill))}
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
                                    <span className="text-gray-900 font-bold text-base">Idle Running</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {sortedData[index]?.backendData?.idle_running?.cause ? (
                                      <p className="text-gray-700 text-base">
                                        {highlightNumbers(sortedData[index].backendData.idle_running.cause)}
                                      </p>
                                    ) : (
                                      <p className="text-gray-700 text-base">
                                        No idle running data available.
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="high-power">
                                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                    <span className="text-gray-900 font-bold text-base">High Power</span>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    {/* Dynamic component for all mill types */}
                                    <DynamicHighPowerSection
                                      filteredData={finalFilteredData}
                                      index={index}
                                      selectedMillType={selectedSection}
                                      openPopup={openPopup}
                                      shouldShowTrend={shouldShowTrend}
                                      highlightNumbers={highlightNumbers}
                                      extractDeviceId={extractDeviceId}
                                      extractSensorIds={extractSensorIds}
                                      extractSensorNames={extractSensorNames}
                                    />
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Quality section - only show when Blaine_ or 45_ has data */}
                                {(() => {
                                  const qualityData = sortedData[index]?.backendData?.Qulity as any;
                                  console.log('Quality Debug - Index:', index, 'Quality Data:', qualityData);
                                  console.log('Quality Debug - 45_ data:', qualityData?.['45_']);
                                  console.log('Quality Debug - Blaine_ data:', qualityData?.['Blaine_']);
                                  console.log('Quality Debug - 90_ data:', qualityData?.['90_']);
                                  console.log('Quality Debug - table data:', qualityData?.table);
                                  
                                  // Only show Quality section if Blaine_ or 45_ has actual data
                                  const hasQualityData = qualityData && 
                                    (qualityData['45_'] || qualityData['Blaine_']);
                                  
                                  // Additional check for specific date 26/06/25 - ensure we don't show empty Quality section
                                  const currentDate = new Date().toLocaleDateString('en-GB');
                                  const isTargetDate = currentDate === '26/06/2025' || 
                                                      sortedData[index]?.backendData?.query_time?.includes('2025-06-26');
                                  
                                  if (isTargetDate && !hasQualityData) {
                                    console.log('Quality Debug - Target date 26/06/25 detected with no quality data, hiding section');
                                    return null;
                                  }
                                  
                                  console.log('Quality Debug - hasQualityData (Blaine_ or 45_):', hasQualityData);
                                  
                                  // Only render the Quality section if Blaine_ or 45_ has data
                                  if (!hasQualityData) {
                                    console.log('Quality Debug - No Blaine_ or 45_ data found, hiding Quality section');
                                    return null;
                                  }
                                  
                                  return (
                                    <AccordionItem value="quality" className="border-b">
                                      <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                                        <span className="text-gray-900 font-bold text-base">Quality</span>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-4">
                                          {/* 45 Micron Subsection */}
                                          {qualityData?.['45_'] && (
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-gray-700 text-base">45 Micron</h4>
                                                <button
                                                  onClick={() => openPopup(qualityData?.table, "45 Micron", sortedData[index].backendData)}
                                                  className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                    shouldShowTrend(sortedData[index].backendData, "45 Micron")
                                                      ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                      : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                                  }`}
                                                  title={shouldShowTrend(sortedData[index].backendData, "45 Micron") ? "View trend chart" : "No trend data available"}
                                                  disabled={!shouldShowTrend(sortedData[index].backendData, "45 Micron")}
                                                >
                                                  <svg
                                                    className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                      shouldShowTrend(sortedData[index].backendData, "45 Micron") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                    }`}
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
                                                  {shouldShowTrend(sortedData[index].backendData, "45 Micron") && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                  )}
                                                </button>
                                              </div>
                                              <div className="space-y-2">
                                                {Object.entries(qualityData['45_'])
                                                  .filter(([key]) => !isNaN(Number(key))) // Only numbered keys
                                                  .map(([key, value], j) => (
                                                    <div key={`45micron-${index}-${j}`} className="flex items-start gap-2">
                                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                      <span className="text-base text-gray-600">
                                                        {highlightNumbers(String(value ?? ''))}
                                                      </span>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* 90 Micron/Blaine Subsection */}
                                          {(qualityData?.['90_'] || qualityData?.['Blaine_']) && (
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                              <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-gray-700 text-base">
                                                  {qualityData?.['90_'] ? '90 Micron' : 'Blaine'}
                                                </h4>
                                                <button
                                                  onClick={() => openPopup(qualityData?.table, qualityData?.['90_'] ? "90 Micron" : "Blaine", sortedData[index].backendData)}
                                                  className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                                                    shouldShowTrend(sortedData[index].backendData, qualityData?.['90_'] ? "90 Micron" : "Blaine")
                                                      ? "hover:bg-blue-100 text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 shadow-md hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 group"
                                                      : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100 rounded-xl p-2"
                                                  }`}
                                                  title={shouldShowTrend(sortedData[index].backendData, qualityData?.['90_'] ? "90 Micron" : "Blaine") ? "View trend chart" : "No trend data available"}
                                                  disabled={!shouldShowTrend(sortedData[index].backendData, qualityData?.['90_'] ? "90 Micron" : "Blaine")}
                                                >
                                                  <svg
                                                    className={`w-3 h-3 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-3 relative z-10 ${
                                                      shouldShowTrend(sortedData[index].backendData, qualityData?.['90_'] ? "90 Micron" : "Blaine") ? 'text-blue-700 group-hover:text-blue-800' : 'text-gray-400'
                                                    }`}
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
                                                  {shouldShowTrend(sortedData[index].backendData, qualityData?.['90_'] ? "90 Micron" : "Blaine") && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                  )}
                                                </button>
                                              </div>
                                              <div className="space-y-2">
                                                {Object.entries(qualityData[qualityData?.['90_'] ? '90_' : 'Blaine_'])
                                                  .filter(([key]) => !isNaN(Number(key))) // Only numbered keys
                                                  .map(([key, value], j) => (
                                                    <div key={`90micron-${index}-${j}`} className="flex items-start gap-2">
                                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                      <span className="text-base text-gray-600">
                                                        {highlightNumbers(String(value ?? ''))}
                                                      </span>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* No need to show "no data" message since we only render this section when data exists */}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })() as React.ReactNode}

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
              {/* Check if this is a High Power section */}
              {["SKS Fan", "Mill Auxiliaries", "Product Transportation", "RP1", "RP2", "Product Transportation MCC15", "PHF1", "PHF2", "Preheater Fan 1", "Preheater Fan 2", "Klin Main Drive 1", "Klin Main Drive 2", "Klin_main_drive_1", "Klin_main_drive_2"].includes(popupData.section) ? (
                // For High Power sections, show only trend analysis
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
                        {/* SKS Fan Trend Chart - Single Graph with Two Lines */}
                        {popupData.section === "SKS Fan" && shouldShowTrend(popupData.backendData, "High_Power") && (
                          <TrendChart
                            deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                            sensorList={getSKSFanSensorList(popupData.backendData)}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="SKS Fan Trend"
                            legendNames={getSKSFanSensorNames(popupData.backendData)}
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
                        {popupData.section === "Mill Auxiliaries" && shouldShowTrend(popupData.backendData, "Mill Auxiliaries") && (
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
                        
                        {/* RP1 Trend Chart */}
                        {popupData.section === "RP1" && shouldShowTrend(popupData.backendData, "RP1") && (
                          <TrendChart
                            deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                            sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["rp1_sensor_001", "rp1_sensor_002"]}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="RP1 Trend"
                            legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                            targetValue={(() => {
                              // Extract target value from rp1 section if available
                              const rp1Data = popupData.backendData?.High_Power?.rp1;
                              if (rp1Data?.Target) {
                                const targetValues = Object.values(rp1Data.Target);
                                return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                              }
                              return undefined;
                            })()}
                          />
                        )}
                        
                        {/* RP2 Trend Chart */}
                        {popupData.section === "RP2" && shouldShowTrend(popupData.backendData, "RP2") && (
                          <TrendChart
                            deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                            sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["rp2_sensor_001", "rp2_sensor_002"]}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="RP2 Trend"
                            legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                            targetValue={(() => {
                              // Extract target value from rp2 section if available
                              const rp2Data = popupData.backendData?.High_Power?.rp2;
                              if (rp2Data?.Target) {
                                const targetValues = Object.values(rp2Data.Target);
                                return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                              }
                              return undefined;
                            })()}
                          />
                        )}
                        
                        {/* PHF1 (Preheater Fan 1) Trend Chart */}
                        {(popupData.section === "PHF1" || popupData.section === "Preheater Fan 1") && shouldShowTrend(popupData.backendData, "PHF1") && (
                          <TrendChart
                            deviceId={(() => {
                              // Extract device ID from phf1 section
                              const phf1Data = popupData.backendData?.High_Power?.phf1;
                              if (phf1Data?.Device && typeof phf1Data.Device === 'object') {
                                const deviceIds = Object.keys(phf1Data.Device);
                                return deviceIds.length > 0 ? deviceIds[0] : "ABBBHPH_A1";
                              }
                              return "ABBBHPH_A1";
                            })()}
                            sensorList={(() => {
                              // Extract sensor IDs from phf1 section
                              const phf1Data = popupData.backendData?.High_Power?.phf1;
                              if (phf1Data?.sensor && typeof phf1Data.sensor === 'object') {
                                return Object.keys(phf1Data.sensor);
                              }
                              return ["D63", "D18"]; // Default fallback
                            })()}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="Preheater Fan 1 Trend"
                            legendNames={(() => {
                              // Extract sensor names from phf1 section
                              const phf1Data = popupData.backendData?.High_Power?.phf1;
                              if (phf1Data?.sensor && typeof phf1Data.sensor === 'object') {
                                return phf1Data.sensor;
                              }
                              return { "D63": "Klin Feed", "D18": "PH Fan 1 KW" };
                            })()}
                            targetValue={(() => {
                              // Extract target value from phf1 section if available
                              const phf1Data = popupData.backendData?.High_Power?.phf1;
                              if (phf1Data?.Target) {
                                const targetValues = Object.values(phf1Data.Target);
                                return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                              }
                              return undefined;
                            })()}
                          />
                        )}
                        
                        {/* PHF2 (Preheater Fan 2) Trend Chart */}
                        {(popupData.section === "PHF2" || popupData.section === "Preheater Fan 2") && shouldShowTrend(popupData.backendData, "PHF2") && (
                          <TrendChart
                            deviceId={(() => {
                              // Extract device ID from phf2 section
                              const phf2Data = popupData.backendData?.High_Power?.phf2;
                              if (phf2Data?.Device && typeof phf2Data.Device === 'object') {
                                const deviceIds = Object.keys(phf2Data.Device);
                                return deviceIds.length > 0 ? deviceIds[0] : "ABBBHPH_A1";
                              }
                              return "ABBBHPH_A1";
                            })()}
                            sensorList={(() => {
                              // Extract sensor IDs from phf2 section
                              const phf2Data = popupData.backendData?.High_Power?.phf2;
                              if (phf2Data?.sensor && typeof phf2Data.sensor === 'object') {
                                return Object.keys(phf2Data.sensor);
                              }
                              return ["D63", "D19"]; // Default fallback
                            })()}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="Preheater Fan 2 Trend"
                            legendNames={(() => {
                              // Extract sensor names from phf2 section
                              const phf2Data = popupData.backendData?.High_Power?.phf2;
                              if (phf2Data?.sensor && typeof phf2Data.sensor === 'object') {
                                return phf2Data.sensor;
                              }
                              return { "D63": "Klin Feed", "D19": "PH Fan 2 KW" };
                            })()}
                            targetValue={(() => {
                              // Extract target value from phf2 section if available
                              const phf2Data = popupData.backendData?.High_Power?.phf2;
                              if (phf2Data?.Target) {
                                const targetValues = Object.values(phf2Data.Target);
                                return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                              }
                              return undefined;
                            })()}
                          />
                        )}
                        
                        {/* Klin Main Drive 1 Trend Chart */}
                        {(popupData.section === "Klin Main Drive 1" || popupData.section === "Klin_main_drive_1") && shouldShowTrend(popupData.backendData, "Klin Main Drive 1") && (
                          (() => {
                            // Check if TPH data is available
                            const klinMainDrive1Data = popupData.backendData?.High_Power?.Klin_main_drive_1;
                            const hasTPHData = klinMainDrive1Data?.sensor && 
                              (klinMainDrive1Data.sensor.D63 || Object.keys(klinMainDrive1Data.sensor).some(key => key.includes('D63')));
                            
                            if (!hasTPHData) {
                              return (
                                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                                    <p className="mt-1 text-sm text-gray-500">TPH data is not available for Klin Main Drive 1</p>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <TrendChart
                                deviceId={(() => {
                                  // Extract device ID from Klin_main_drive_1 section
                                  if (klinMainDrive1Data?.Device && typeof klinMainDrive1Data.Device === 'object') {
                                    const deviceIds = Object.keys(klinMainDrive1Data.Device);
                                    return deviceIds.length > 0 ? deviceIds[0] : "ABBBHPH_A1";
                                  }
                                  return "ABBBHPH_A1";
                                })()}
                                sensorList={(() => {
                                  // Extract sensor IDs from Klin_main_drive_1 section
                                  if (klinMainDrive1Data?.sensor && typeof klinMainDrive1Data.sensor === 'object') {
                                    return Object.keys(klinMainDrive1Data.sensor);
                                  }
                                  return ["D63", "D16"]; // Default fallback: D63 for TPH, D16 for RPM
                                })()}
                                startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                                endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                                title="Klin Main Drive 1 Trend"
                                legendNames={(() => {
                                  // Extract sensor names from Klin_main_drive_1 section
                                  if (klinMainDrive1Data?.sensor && typeof klinMainDrive1Data.sensor === 'object') {
                                    return klinMainDrive1Data.sensor;
                                  }
                                  return { "D63": "Klin Feed", "D16": "Klin RPM" };
                                })()}
                                targetValue={(() => {
                                  // Extract target value from Klin_main_drive_1 section if available
                                  if (klinMainDrive1Data?.Target) {
                                    const targetValues = Object.values(klinMainDrive1Data.Target);
                                    return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                                  }
                                  return undefined;
                                })()}
                                isDualAxis={true}
                              />
                            );
                          })()
                        )}
                        
                        {/* Klin Main Drive 2 Trend Chart */}
                        {(popupData.section === "Klin Main Drive 2" || popupData.section === "Klin_main_drive_2") && shouldShowTrend(popupData.backendData, "Klin Main Drive 2") && (
                          (() => {
                            // Check if TPH data is available
                            const klinMainDrive2Data = popupData.backendData?.High_Power?.Klin_main_drive_2;
                            const hasTPHData = klinMainDrive2Data?.sensor && 
                              (klinMainDrive2Data.sensor.D63 || Object.keys(klinMainDrive2Data.sensor).some(key => key.includes('D63')));
                            
                            if (!hasTPHData) {
                              return (
                                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                  <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                                    <p className="mt-1 text-sm text-gray-500">TPH data is not available for Klin Main Drive 2</p>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <TrendChart
                                deviceId={(() => {
                                  // Extract device ID from Klin_main_drive_2 section
                                  if (klinMainDrive2Data?.Device && typeof klinMainDrive2Data.Device === 'object') {
                                    const deviceIds = Object.keys(klinMainDrive2Data.Device);
                                    return deviceIds.length > 0 ? deviceIds[0] : "ABBBHPH_A1";
                                  }
                                  return "ABBBHPH_A1";
                                })()}
                                sensorList={(() => {
                                  // Extract sensor IDs from Klin_main_drive_2 section
                                  if (klinMainDrive2Data?.sensor && typeof klinMainDrive2Data.sensor === 'object') {
                                    return Object.keys(klinMainDrive2Data.sensor);
                                  }
                                  return ["D63", "D16"]; // Default fallback: D63 for TPH, D16 for RPM
                                })()}
                                startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                                endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                                title="Klin Main Drive 2 Trend"
                                legendNames={(() => {
                                  // Extract sensor names from Klin_main_drive_2 section
                                  if (klinMainDrive2Data?.sensor && typeof klinMainDrive2Data.sensor === 'object') {
                                    return klinMainDrive2Data.sensor;
                                  }
                                  return { "D63": "Klin Feed", "D16": "Klin RPM" };
                                })()}
                                targetValue={(() => {
                                  // Extract target value from Klin_main_drive_2 section if available
                                  if (klinMainDrive2Data?.Target) {
                                    const targetValues = Object.values(klinMainDrive2Data.Target);
                                    return targetValues.length > 0 ? parseFloat(targetValues[0] as string) : undefined;
                                  }
                                  return undefined;
                                })()}
                                isDualAxis={true}
                              />
                            );
                          })()
                        )}
                        
                        {/* Product Transportation MCC15 Trend Chart */}
                        {popupData.section === "Product Transportation MCC15" && shouldShowTrend(popupData.backendData, "Product Transportation MCC15") && (
                          <TrendChart
                            deviceId={extractDeviceId(popupData.backendData) || "ABBRWML_A1"}
                            sensorList={extractSensorIds(popupData.backendData, "High_Power") || ["mcc15_sensor_001", "mcc15_sensor_002"]}
                            startTime={popupData.backendData?.query_time?.[0] || "2025-07-06 00:00:00"}
                            endTime={popupData.backendData?.query_time?.[1] || "2025-07-06 23:59:59"}
                            title="Product Transportation MCC15 Trend"
                            legendNames={extractSensorNames(popupData.backendData, "High_Power")}
                            targetValue={(() => {
                              // Extract target value from Product Transportation MCC15_SPC section if available
                              const mcc15Data = popupData.backendData?.High_Power?.["Product Transportation MCC15_SPC"];
                              if (mcc15Data?.Target) {
                                const targetValues = Object.values(mcc15Data.Target);
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
              ) : (
                // For TPH sections, show different tabs based on mill name from data
                <Tabs defaultValue={(() => {
                  // Get mill name from the backendData (this is the MILL NAME column from the main dashboard)
                  const millName = popupData.backendData?.sectionName || '';
                  const isCementMill = millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                  const isQualitySection = ["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section);
                  const isTPHEvents = popupData.section === "TPH Events";
                  
                  // Debug logging for default tab
                  if (isTPHEvents) {
                    console.log('=== Default Tab Debug ===');
                    console.log('Default tab will be:', (isCementMill && !isQualitySection && !isTPHEvents) ? "trend" : "table");
                  }
                  
                  // For Cement Mill Single RP Down, show only Table Data tab
                  // For Cement Mill 1 (general), show only Trend Analysis tab
                  const isCementMillSingleRP = isCementMill && popupData.section === "Single RP Down";
                  const isCementMill1 = isCementMill && popupData.section !== "Single RP Down";
                  return (isCementMillSingleRP) ? "table" : (isCementMill1) ? "trend" : (isCementMill && !isQualitySection && !isTPHEvents) ? "trend" : "table";
                })()} className="w-full">
                  <TabsList className={`grid w-full ${(() => {
                    const millName = popupData.backendData?.sectionName || '';
                    const isCementMill = millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                    const isQualitySection = ["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section);
                    const isTPHEvents = popupData.section === "TPH Events";
                    const isCementMillSingleRP = isCementMill && popupData.section === "Single RP Down";
                    const isCementMill1 = isCementMill && popupData.section !== "Single RP Down";
                    return (isCementMillSingleRP || isCementMill1) ? "grid-cols-1" : (isCementMill && !isQualitySection && !isTPHEvents) ? "grid-cols-1" : "grid-cols-2";
                  })()}`}>
                    {(() => {
                      const millName = popupData.backendData?.sectionName || '';
                      const isCementMill = millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                      const isQualitySection = ["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section);
                      const isTPHEvents = popupData.section === "TPH Events";
                      
                      // Debug logging for tab trigger
                      if (isTPHEvents) {
                        console.log('=== Tab Trigger Debug ===');
                        console.log('Should show Table Data tab:', (!isCementMill || isQualitySection || isTPHEvents));
                      }
                      
                      const isCementMillSingleRP = isCementMill && popupData.section === "Single RP Down";
                      const isCementMill1 = isCementMill && popupData.section !== "Single RP Down";
                      // Show Table Data tab only for Single RP Down in Cement Mill, or for non-Cement Mill sections, or Quality sections
                      // Do NOT show for Cement Mill 1 general sections (including TPH Events)
                      return (isCementMillSingleRP || (!isCementMill) || isQualitySection) && <TabsTrigger value="table">Table Data</TabsTrigger>;
                    })()}
                    {(() => {
                      const millName = popupData.backendData?.sectionName || '';
                      const isCementMill = millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                      const isQualitySection = ["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section);
                      const isCementMillSingleRP = isCementMill && popupData.section === "Single RP Down";
                      const isCementMill1 = isCementMill && popupData.section !== "Single RP Down";
                      // Show Trend Analysis tab for Cement Mill 1 (except Single RP Down), or for non-Quality sections
                      return !isQualitySection && (isCementMill1 || !isCementMillSingleRP) && <TabsTrigger value="trend">Trend Analysis</TabsTrigger>;
                    })()}
                  </TabsList>
                  
                  {(() => {
                    const millName = popupData.backendData?.sectionName || '';
                    const isCementMill = millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                    const isQualitySection = ["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section);
                    const isTPHEvents = popupData.section === "TPH Events";
                    
                    // Debug logging for TPH Events
                    if (isTPHEvents) {
                      console.log('=== TPH Events Debug ===');
                      console.log('popupData.section:', popupData.section);
                      console.log('popupData.data:', popupData.data);
                      console.log('popupData.backendData:', popupData.backendData);
                      console.log('millName:', millName);
                      console.log('isCementMill:', isCementMill);
                      console.log('isQualitySection:', isQualitySection);
                      console.log('isTPHEvents:', isTPHEvents);
                      console.log('Should show table:', (!isCementMill || isQualitySection || isTPHEvents));
                    }
                    
                    return (!isCementMill || isQualitySection || isTPHEvents) && (
                      <TabsContent value="table" className="mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      {popupData.data && Array.isArray(popupData.data) ? (
                        <div className="overflow-x-auto max-h-[75vh]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section) ? (
                                  (() => {
                                    // Get the first row to determine column structure
                                    if (Array.isArray(popupData.data) && popupData.data.length > 0) {
                                      const firstRow = popupData.data[0];
                                      const columns = Object.keys(firstRow);
                                      
                                      return (
                                        <>
                                          {columns.map((column, index) => (
                                            <TableHead key={index} className="w-[150px]">
                                              {column === 'time' ? 'Time' : 
                                               column.includes('45 Mic') ? '45 Mic' :
                                               column.includes('BLAINE') ? 'Blaine' :
                                               column}
                                            </TableHead>
                                          ))}
                                        </>
                                      );
                                    }
                                    
                                    // Fallback headers if no data
                                    return (
                                      <>
                                        <TableHead className="w-[150px]">Time</TableHead>
                                        <TableHead className="w-[120px]">45 Mic</TableHead>
                                        <TableHead className="w-[120px]">Blaine</TableHead>
                                      </>
                                    );
                                  })()
                                ) : popupData.section === "Single RP Down Events" || popupData.section === "TPH Events" ? (
                                  <>
                                    <TableHead className="w-[150px]">Start Time</TableHead>
                                    <TableHead className="w-[150px]">End Time</TableHead>
                                    <TableHead className="w-[120px]">Duration (min)</TableHead>
                                    <TableHead className="w-[120px]">Min Value</TableHead>
                                    <TableHead className="w-[120px]">Day Mean</TableHead>
                                    <TableHead className="w-[120px]">Drop %</TableHead>
                                  </>
                                ) : popupData.section === "Reduced Feed Operations" ? (
                                  <>
                                    <TableHead className="w-[150px]">Start Time</TableHead>
                                    <TableHead className="w-[150px]">End Time</TableHead>
                                    <TableHead className="w-[120px]">Duration (min)</TableHead>
                                    <TableHead className="w-[120px]">RPs Running</TableHead>
                                    <TableHead className="w-[120px]">Average TPH</TableHead>
                                    <TableHead className="w-[120px]">Minimum TPH</TableHead>
                                    <TableHead className="w-[120px]">Maximum TPH</TableHead>
                                  </>
                                ) : (popupData.section.includes("RP Down") || popupData.section === "Both RP Down") && Array.isArray(popupData.data) && popupData.data.length > 0 && popupData.data[0].scenario ? (
                                  <>
                                    <TableHead className="w-[200px]">Scenario</TableHead>
                                    <TableHead className="w-[150px]">Ramp Start</TableHead>
                                    <TableHead className="w-[150px]">Ramp End</TableHead>
                                    <TableHead className="w-[150px]">Duration (min)</TableHead>
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
                                  {["Quality", "45 Micron", "90 Micron", "Blaine"].includes(popupData.section) ? (
                                    <>
                                      {Object.entries(item).map(([key, value], cellIndex) => (
                                        <TableCell key={cellIndex}>
                                          {key === 'time' ? formatTime(value) : formatNumber(value)}
                                        </TableCell>
                                      ))}
                                    </>
                                  ) : popupData.section === "Single RP Down Events" || popupData.section === "TPH Events" ? (
                                    <>
                                      <TableCell>{formatTime(item.start)}</TableCell>
                                      <TableCell>{formatTime(item.end)}</TableCell>
                                      <TableCell>{formatNumber(item.duration_min)}</TableCell>
                                      <TableCell>{formatNumber(item.min_value)}</TableCell>
                                      <TableCell>{formatNumber(item.day_mean)}</TableCell>
                                      <TableCell>{formatNumber(item.drop_percent)}%</TableCell>
                                    </>
                                  ) : popupData.section === "Reduced Feed Operations" ? (
                                    <>
                                      <TableCell>{formatTime(item.period_start)}</TableCell>
                                      <TableCell>{formatTime(item.period_end)}</TableCell>
                                      <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
                                      <TableCell>{item.pumps_running === 1 ? "Single" : item.pumps_running === 2 ? "Both" : item.pumps_running || "N/A"}</TableCell>
                                      <TableCell>{formatNumber(item.avg_tph)}</TableCell>
                                      <TableCell>{formatNumber(item.min_tph)}</TableCell>
                                      <TableCell>{formatNumber(item.max_tph)}</TableCell>
                                    </>
                                  ) : (popupData.section.includes("RP Down") || popupData.section === "Both RP Down") && Array.isArray(popupData.data) && item.scenario ? (
                                    <>
                                      <TableCell className="font-medium">{item.scenario || `Event ${i + 1}`}</TableCell>
                                      <TableCell>{formatTime(item.ramp_start)}</TableCell>
                                      <TableCell>{formatTime(item.ramp_end)}</TableCell>
                                      <TableCell>{formatNumber(item.duration_minutes)}</TableCell>
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
                        <div>
                          <p className="text-gray-500">No table data available</p>
                          {(popupData.section === "TPH Events" || popupData.section === "Both RP Down") && (
                            <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                              <strong>Debug:</strong> popupData.data = {JSON.stringify(popupData.data)}
                              <br />
                              <strong>Section:</strong> {popupData.section}
                              <br />
                              <strong>Data type:</strong> {typeof popupData.data}
                              <br />
                              <strong>Is Array:</strong> {Array.isArray(popupData.data) ? 'Yes' : 'No'}
                              {Array.isArray(popupData.data) && popupData.data.length > 0 && (
                                <>
                                  <br />
                                  <strong>First item:</strong> {JSON.stringify(popupData.data[0])}
                                  <br />
                                  <strong>Has scenario:</strong> {popupData.data[0]?.scenario ? 'Yes' : 'No'}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  );
                  })()}
                  
                  <TabsContent value="trend" className="mt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Trend Analysis</h4>
                      <div className="bg-white rounded p-4 border">
                        <p className="text-gray-600 mb-4">
                          Real-time trend analysis for {popupData.section.toLowerCase()} data.
                          The chart shows sensor values over time for the selected period.
                        </p>
                        
                        {/* Show trend chart for TPH sections if device/sensor info is available, or for other sections if data exists */}
                        {(() => {
                          const isTPHSection = ["Reduced Feed Operations", "Single RP Down", "One RP Down", "Both RP Down", "TPH Events"].includes(popupData.section);
                          if (isTPHSection) {
                            return popupData.backendData?.TPH?.Device && popupData.backendData?.TPH?.sensor;
                          }
                          return popupData.data;
                        })() ? (
                          <div className="space-y-4">
                            {/* Debug: Log the full payload structure */}
                            {(() => {
                              console.log(`=== TPH Trend Chart Debug for ${popupData.section} ===`);
                              console.log('Full popupData:', popupData);
                              console.log('Backend data:', popupData.backendData);
                              console.log('TPH data:', popupData.backendData?.TPH);
                              console.log('Query time:', popupData.backendData?.query_time);
                              console.log('Selected time range:', selectedRange);
                              return null;
                            })()}
                            
                            {/* TPH Trend Chart for all TPH subsections */}
                            {["Reduced Feed Operations", "Single RP Down", "One RP Down", "Both RP Down", "Single RP Down Events", "TPH Events"].includes(popupData.section) && hasTrendData(popupData.backendData, popupData.section) && (
                              <TrendChart
                                deviceId={(() => {
                                  const deviceId = popupData.backendData?.TPH?.Device || extractDeviceId(popupData.backendData) || "ABBRWML_A1";
                                  console.log(`TrendChart deviceId for ${popupData.section}:`, deviceId);
                                  console.log(`TPH Device from payload:`, popupData.backendData?.TPH?.Device);
                                  console.log(`Extracted device ID:`, extractDeviceId(popupData.backendData));
                                  return deviceId;
                                })()}
                                sensorList={(() => {
                                  const sensorList = Object.keys(popupData.backendData?.TPH?.sensor || {}) || extractSensorIds(popupData.backendData, "TPH") || ["D49", "D5"];
                                  console.log(`TrendChart sensorList for ${popupData.section}:`, sensorList);
                                  console.log(`TPH sensor from payload:`, popupData.backendData?.TPH?.sensor);
                                  console.log(`Extracted sensor IDs:`, extractSensorIds(popupData.backendData, "TPH"));
                                  return sensorList;
                                })()}
                                startTime={(() => {
                                  const startTime = popupData.backendData?.query_time?.[0] || `${selectedRange.startDate} ${selectedRange.startTime}:00`;
                                  console.log(`TrendChart startTime for ${popupData.section}:`, startTime);
                                  return startTime;
                                })()}
                                endTime={(() => {
                                  const endTime = popupData.backendData?.query_time?.[1] || `${selectedRange.endDate} ${selectedRange.endTime}:59`;
                                  console.log(`TrendChart endTime for ${popupData.section}:`, endTime);
                                  return endTime;
                                })()}
                                title={`${popupData.section} Trend`}
                                targetValue={(() => {
                                  // Extract target value directly from TPH section
                                  const targetValue = popupData.backendData?.TPH?.target;
                                  return targetValue ? parseFloat(targetValue) : undefined;
                                })()}
                                events={(() => {
                                  // For cement mill, use stoppages data for highlighting (similar to raw mill ramp up logic)
                                  const millName = popupData.backendData?.sectionName || '';
                                  const isKlin = millName === "Kiln";
                                  const isCementMill = (millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill')) && !isKlin;
                                  if (isCementMill) {
                                    const stoppageEvents: any[] = [];
                                    
                                    // Get RP1 stoppages data from the backend data
                                    const rp1Stoppages = popupData.backendData?.TPH?.RP1_maintance || [];
                                    console.log('RP1 Stoppages Data for highlighting:', rp1Stoppages);
                                    if (Array.isArray(rp1Stoppages)) {
                                      rp1Stoppages.forEach((stoppage: any) => {
                                        // Map stoppage data to startTime/endTime format (same as raw mill ramp up logic)
                                        const startTime = stoppage['Start Date Time'];
                                        const endTime = stoppage['End Date Time'];
                                        
                                        if (startTime && endTime) {
                                          console.log('RP1 Stoppage Event - Start:', startTime, 'End:', endTime, 'Department:', stoppage['Department'], 'Category:', stoppage['Stoppage Category']);
                                          stoppageEvents.push({
                                            startTime: startTime,
                                            endTime: endTime,
                                            color: "#FF6B6B", // Red color for RP1 stoppages
                                            type: "RP1"
                                          });
                                        }
                                      });
                                    }
                                    
                                    // Get RP2 stoppages data from the backend data
                                    const rp2Stoppages = popupData.backendData?.TPH?.RP2_maintance || [];
                                    console.log('RP2 Stoppages Data for highlighting:', rp2Stoppages);
                                    if (Array.isArray(rp2Stoppages)) {
                                      rp2Stoppages.forEach((stoppage: any) => {
                                        // Map stoppage data to startTime/endTime format (same as raw mill ramp up logic)
                                        const startTime = stoppage['Start Date Time'];
                                        const endTime = stoppage['End Date Time'];
                                        
                                        if (startTime && endTime) {
                                          console.log('RP2 Stoppage Event - Start:', startTime, 'End:', endTime, 'Department:', stoppage['Department'], 'Category:', stoppage['Stoppage Category']);
                                          stoppageEvents.push({
                                            startTime: startTime,
                                            endTime: endTime,
                                            color: "#4ECDC4", // Teal color for RP2 stoppages
                                            type: "RP2"
                                          });
                                        }
                                      });
                                    }
                                    
                                    console.log('Final Cement Mill Stoppage Events for Chart:', stoppageEvents);
                                    return stoppageEvents.length > 0 ? stoppageEvents : undefined;
                                  }
                                  
                                  // For TPH Events, use the events data from TPH section
                                  if (popupData.section === "TPH Events" && popupData.backendData?.TPH?.events) {
                                    const tphEvents = popupData.backendData.TPH.events;
                                    console.log('TPH Events for highlighting:', tphEvents);
                                    
                                    // For Klin sections, use "Drop Events" as legend text
                                    const isKlin = popupData.backendData?.sectionName === "Kiln";
                                    const eventType = isKlin ? "Drop Events" : "TPH Event";
                                    
                                    return tphEvents.map((event: any, index: number) => ({
                                      startTime: event.start,
                                      endTime: event.end,
                                      color: "#ED1C24", // Red color for TPH events
                                      type: eventType
                                    }));
                                  }
                                  
                                  // For raw mill, use table data as before
                                  return popupData.data && Array.isArray(popupData.data) 
                                    ? popupData.data.map((item: any, index: number) => {
                                        let startTime, endTime;
                                        
                                        if (popupData.section === "Reduced Feed Operations") {
                                          startTime = item.period_start || item.start_time;
                                          endTime = item.period_end || item.end_time;
                                        } else if (popupData.section.includes("RP Down")) {
                                          startTime = item.ramp_start || item.start_time;
                                          endTime = item.ramp_end || item.end_time;
                                        }
                                        
                                        // For Single RP Down, color based on scenario
                                        let eventColor = undefined;
                                        if ((popupData.section === "Single RP Down" || popupData.section === "One RP Down") && item && item.scenario) {
                                          if (item.scenario.includes("RP1")) {
                                            eventColor = "#FF6B6B"; // Red for RP1
                                          } else if (item.scenario.includes("RP2")) {
                                            eventColor = "#4ECDC4"; // Teal for RP2
                                          }
                                        }
                                        
                                        // For Reduced Feed Operations, color based on RPs Running
                                        if (popupData.section === "Reduced Feed Operations" && item && item.pumps_running !== undefined) {
                                          if (item.pumps_running === 2) {
                                            eventColor = "#FFD700"; // Yellow for Both RPs
                                          } else if (item.pumps_running === 1) {
                                            eventColor = "#ED1C24"; // Red for Single RP
                                          }
                                        }
                                        
                                        // For Both RP Down, all events are red
                                        if (popupData.section === "Both RP Down") {
                                          eventColor = "#ED1C24"; // Red for Both RP Down events
                                        }
                                        
                                        return {
                                          startTime,
                                          endTime,
                                          color: eventColor // Use scenario-based color for Single RP Down
                                        };
                                      }).filter((event: any) => event.startTime && event.endTime)
                                    : undefined;
                                })()}
                                legendNames={(() => {
                                  // For Klin sections, use Klin-specific legend names
                                  const isKlin = popupData.backendData?.sectionName === "Kiln";
                                  if (isKlin) {
                                    return {
                                      normal: "Klin feed rate",
                                      event: "Drop Events"
                                    };
                                  }
                                  
                                  // For Cement Mill, use the sensor names from TPH section
                                  const tphSensor = popupData.backendData?.TPH?.sensor;
                                  if (tphSensor && typeof tphSensor === 'object') {
                                    return tphSensor;
                                  }
                                  
                                  // For Raw Mill TPH sections, use the predefined legend names
                                  if (popupData.section === "Single RP Down" || popupData.section === "One RP Down" || popupData.section === "Both RP Down") {
                                    return {
                                        normal: "Raw mill feed rate",
                                        event: "Ramp-up event"
                                    };
                                      }
                                  
                                  if (popupData.section === "Reduced Feed Operations") {
                                    return {
                                          normal: "Raw mill feed rate",
                                          event: "Low feed event"
                                    };
                                  }
                                  
                                  return undefined;
                                })()}
                                isCementMillTPH={(() => {
                                  const millName = popupData.backendData?.sectionName || '';
                                  return millName === "Cement Mill 1" || millName.toLowerCase().includes('cement mill');
                                })()}
                              />
                            )}
                            
                            
                            {/* Show message if no trend data available */}
                            
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-500 mb-2">
                              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <p className="text-lg font-medium text-gray-600">No Trend Data Available</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {["Reduced Feed Operations", "Single RP Down", "One RP Down", "Both RP Down"].includes(popupData.section) 
                                  ? "TPH sensor data is not available for this section."
                                  : "Trend data is not available for this section."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Popup Modal */}
      {maintenancePopup.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-1">
                stoppages <Wrench className="w-4 h-4 inline-block align-middle text-yellow-800" />
              </h3>
              <button onClick={closeMaintenancePopup} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <Tabs value={maintenancePopup.activeTab} onValueChange={tab => setMaintenancePopup(p => ({ ...p, activeTab: tab as 'RP1' | 'RP2' | 'Klin' }))}>
                <TabsList className="mb-4">
                  <TabsTrigger value="RP1">RP1 Maintenance</TabsTrigger>
                  <TabsTrigger value="RP2">RP2 Maintenance</TabsTrigger>
                  <TabsTrigger value="Klin">Klin Maintenance</TabsTrigger>
                </TabsList>
                <TabsContent value="RP1">
                  {maintenancePopup.rp1.length > 0 ? (
                    <div className="overflow-x-auto max-h-[60vh]">
                      <Table className="min-w-full border rounded-lg">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="px-4 py-2 text-left border-b">Start Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b">End Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Department</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Stoppage Category</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[140px] truncate cursor-pointer" title={maintenancePopup.rp1[0]?.["Reason of Stoppage"]}>
                              Reason of Stoppage
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Calculated Duration (H:M)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenancePopup.rp1.map((item, i) => (
                            <TableRow key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["Start Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["End Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Department"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Stoppage Category"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[140px] truncate cursor-pointer"
                                title={item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
                              >
                                {item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
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
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Department</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Stoppage Category</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[140px] truncate cursor-pointer" title={maintenancePopup.rp2[0]?.["Reason of Stoppage"]}>
                              Reason of Stoppage
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Calculated Duration (H:M)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenancePopup.rp2.map((item, i) => (
                            <TableRow key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["Start Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["End Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Department"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Stoppage Category"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[140px] truncate cursor-pointer"
                                title={item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
                              >
                                {item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
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
                <TabsContent value="Klin">
                  {maintenancePopup.klin.length > 0 ? (
                    <div className="overflow-x-auto max-h-[60vh]">
                      <Table className="min-w-full border rounded-lg">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="px-4 py-2 text-left border-b">Start Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b">End Date Time</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Department</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Stoppage Category</TableHead>
                            <TableHead className="px-4 py-2 text-left border-b max-w-[140px] truncate cursor-pointer" title={maintenancePopup.klin[0]?.["Reason of Stoppage"]}>
                              Reason of Stoppage
                            </TableHead>
                            <TableHead className="px-4 py-2 text-left border-b whitespace-nowrap">Calculated Duration (H:M)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenancePopup.klin.map((item, i) => (
                            <TableRow key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["Start Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{formatTimeIST(item["End Date Time"])}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Department"]}</TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Stoppage Category"]}</TableCell>
                              <TableCell
                                className="px-4 py-3 align-top border-b max-w-[140px] truncate cursor-pointer"
                                title={item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
                              >
                                {item["Other Reason of stoppage"] && Object.keys(item["Other Reason of stoppage"] || {}).length > 0 
                                  ? `${item["Reason of Stoppage"] ?? ''} - ${item["Other Reason of stoppage"] ?? ''}`
                                  : item["Reason of Stoppage"] ?? ''
                                }
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top border-b whitespace-nowrap">{item["Calculated Duration (H:M)"]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No Klin maintenance data available.</p>
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
