import React, { useState } from 'react';
import { Calendar } from './calendar';
import { Button } from './button';
import { Input } from './input';
import { DateRange } from 'react-day-picker';

const PREsetS = [
  'Custom',
  'Today',
  'Yesterday',
  'Current Week',
  'Previous Week',
  'Previous 7 Days',
  'Current Month',
  'Previous Month',
  'Previous 3 Months',
  'Previous 12 Months',
  'Current Year',
  'Previous Year',
];

export interface TimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  onCancel: () => void;
  onApply: () => void;
}

// Helper to format Date to YYYY-MM-DD
function formatDateYMD(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get time range based on preset
function getTimeRangeFromPreset(preset: string): TimeRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  switch (preset) {
    case 'Today':
      return {
        startDate: formatDateYMD(today),
        startTime: '00:00',
        endDate: formatDateYMD(today),
        endTime: '23:59',
      };
    case 'Yesterday':
      return {
        startDate: formatDateYMD(yesterday),
        startTime: '00:00',
        endDate: formatDateYMD(yesterday),
        endTime: '23:59',
      };
    case 'Current Week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        startDate: formatDateYMD(startOfWeek),
        startTime: '00:00',
        endDate: formatDateYMD(endOfWeek),
        endTime: '23:59',
      };
    case 'Previous Week':
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        startDate: formatDateYMD(startOfLastWeek),
        startTime: '00:00',
        endDate: formatDateYMD(endOfLastWeek),
        endTime: '23:59',
      };
    case 'Previous 7 Days':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return {
        startDate: formatDateYMD(sevenDaysAgo),
        startTime: '00:00',
        endDate: formatDateYMD(today),
        endTime: '23:59',
      };
    case 'Current Month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatDateYMD(startOfMonth),
        startTime: '00:00',
        endDate: formatDateYMD(endOfMonth),
        endTime: '23:59',
      };
    case 'Previous Month':
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: formatDateYMD(startOfLastMonth),
        startTime: '00:00',
        endDate: formatDateYMD(endOfLastMonth),
        endTime: '23:59',
      };
    case 'Previous 3 Months':
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return {
        startDate: formatDateYMD(threeMonthsAgo),
        startTime: '00:00',
        endDate: formatDateYMD(today),
        endTime: '23:59',
      };
    case 'Previous 12 Months':
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      return {
        startDate: formatDateYMD(twelveMonthsAgo),
        startTime: '00:00',
        endDate: formatDateYMD(today),
        endTime: '23:59',
      };
    case 'Current Year':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: formatDateYMD(startOfYear),
        startTime: '00:00',
        endDate: formatDateYMD(endOfYear),
        endTime: '23:59',
      };
    case 'Previous Year':
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: formatDateYMD(startOfLastYear),
        startTime: '00:00',
        endDate: formatDateYMD(endOfLastYear),
        endTime: '23:59',
      };
    default:
      return {
        startDate: formatDateYMD(today),
        startTime: '00:00',
        endDate: formatDateYMD(today),
        endTime: '23:59',
      };
  }
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange, onCancel, onApply }) => {
  const [selectedPreset, setSelectedPreset] = useState('Today');
  const [range, setRange] = useState<TimeRange>({
    ...value,
    startDate: value.startDate,
    endDate: value.endDate,
  });
  // For calendar range selection
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: range.startDate ? new Date(range.startDate) : undefined,
    to: range.endDate ? new Date(range.endDate) : undefined,
  });

  // Handlers
  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'Custom') {
      const newRange = getTimeRangeFromPreset(preset);
      setRange(newRange);
      // Don't call onChange immediately - wait for Apply button
      // Sync calendar
      setCalendarRange({
        from: newRange.startDate ? new Date(newRange.startDate) : undefined,
        to: newRange.endDate ? new Date(newRange.endDate) : undefined,
      });
    }
  };

  const handleInputChange = (field: keyof TimeRange, val: string) => {
    // Always expect YYYY-MM-DD from input
    let newRange = { ...range, [field]: val };
    
    // Automatically set default times when dates are changed
    if (field === 'startDate') {
      newRange.startTime = '00:00';
    } else if (field === 'endDate') {
      newRange.endTime = '23:59';
    }
    
    setRange(newRange);
    // Don't call onChange immediately - wait for Apply button
    // Sync calendar if start/end date changes
    if (field === 'startDate' || field === 'endDate') {
      setCalendarRange({
        from: field === 'startDate' ? (val ? new Date(val) : undefined) : (range.startDate ? new Date(range.startDate) : undefined),
        to: field === 'endDate' ? (val ? new Date(val) : undefined) : (range.endDate ? new Date(range.endDate) : undefined),
      });
    }
  };

  // Calendar range select handler
  const handleCalendarSelect = (selected: DateRange | undefined) => {
    setCalendarRange(selected);
    if (selected?.from) {
      const startDate = formatDateYMD(selected.from);
      let endDate = startDate;
      if (selected.to) {
        endDate = formatDateYMD(selected.to);
      }
      const newRange = { 
        ...range, 
        startDate, 
        endDate,
        startTime: '00:00',  // Auto-set start time to 00:00
        endTime: '23:59'     // Auto-set end time to 23:59
      };
      setRange(newRange);
      // Don't call onChange immediately - wait for Apply button
    }
  };

  // Apply button handler - triggers data loading
  const handleApply = () => {
    onChange(range); // Trigger data loading with current range
    onApply(); // Call the original onApply function
  };

  return (
    <div className="flex bg-white rounded-lg shadow-lg w-[500px] min-w-[380px] max-w-[98vw]">
      {/* Left: Presets */}
      <div className="w-44 border-r p-2">
        <ul className="space-y-0.5">
          {PREsetS.map(preset => (
            <li key={preset}>
              <button
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition font-medium ${selectedPreset === preset ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: Date/Time & Calendar */}
      <div className="flex-1 p-2 flex flex-col gap-2 w-full max-w-[320px]">
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>
            <label className="block text-xs font-medium mb-0.5">Start Date *</label>
            <Input type="date" value={range.startDate} onChange={e => handleInputChange('startDate', e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">End Date *</label>
            <Input type="date" value={range.endDate} onChange={e => handleInputChange('endDate', e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center w-full">
          <Calendar
            mode="range"
            selected={calendarRange}
            onSelect={handleCalendarSelect}
            className="w-full max-w-[320px] mx-auto"
          />
        </div>
        <div className="flex justify-end gap-2 mt-2 w-full">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="default" onClick={handleApply} className="w-full max-w-[120px]">Apply</Button>
        </div>
      </div>
    </div>
  );
}; 