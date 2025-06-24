import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Download, Copy, Trash2, Users, Timer } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BreakRecord {
  name: string;
  start: string;
  end: string;
  duration: string;
  reason: string;
  startTime?: Date;
  endTime?: Date;
}

interface ActiveBreak {
  start: Date;
  end?: Date;
}

const Index = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [associateName, setAssociateName] = useState('');
  const [breakRecords, setBreakRecords] = useState<BreakRecord[]>([]);
  const [activeBreaks, setActiveBreaks] = useState<{ [key: string]: ActiveBreak }>({});

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('breakTableData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setBreakRecords(parsed);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('breakTableData', JSON.stringify(breakRecords));
  }, [breakRecords]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getDurationColor = (durationStr: string) => {
    const minutes = parseInt(durationStr.split('m')[0]);
    if (minutes > 32) return 'bg-red-500 text-white font-bold';
    if (minutes > 30) return 'bg-orange-500 text-black font-bold';
    return '';
  };

  const recordTime = () => {
    if (!associateName.trim()) {
      toast.error('Please enter an associate name');
      return;
    }

    // Count how many times this associate name has been used
    const nameCount = breakRecords.filter(record => record.name === associateName).length;
    
    // Check if this would be the third entry for this name
    if (nameCount >= 2) {
      toast.error(`${associateName} has already been used twice. Cannot add a third entry.`);
      setAssociateName('');
      return;
    }

    const now = new Date();
    const existingRecord = breakRecords.find(record => record.name === associateName && !record.end);

    if (existingRecord) {
      // End break - use the stored startTime Date object for calculation
      const startTime = existingRecord.startTime || new Date();
      const duration = formatDuration(now.getTime() - startTime.getTime());
      
      setBreakRecords(prev => 
        prev.map(record => 
          record.name === associateName && !record.end
            ? { ...record, end: formatTime(now), duration, endTime: now }
            : record
        )
      );

      setActiveBreaks(prev => {
        const updated = { ...prev };
        delete updated[associateName];
        return updated;
      });

      const minutes = parseInt(duration.split('m')[0]);
      if (minutes > 32) {
        toast.error(`${associateName}'s break exceeded 32 minutes!`, {
          duration: 5000,
        });
      } else if (minutes > 30) {
        toast.warning(`${associateName}'s break exceeded 30 minutes`, {
          duration: 3000,
        });
      } else {
        toast.success(`Break ended for ${associateName}`);
      }
    } else {
      // Start break
      const newRecord: BreakRecord = {
        name: associateName,
        start: formatTime(now),
        end: '',
        duration: '',
        reason: '',
        startTime: now,
      };

      setBreakRecords(prev => [...prev, newRecord]);
      setActiveBreaks(prev => ({ ...prev, [associateName]: { start: now } }));
      toast.success(`Break started for ${associateName}`);
    }

    setAssociateName('');
  };

  const updateReason = (index: number, reason: string) => {
    setBreakRecords(prev => 
      prev.map((record, i) => i === index ? { ...record, reason } : record)
    );
  };

  const copyTable = async () => {
    try {
      const tableText = breakRecords.map(record => 
        `${record.name}\t${record.start}\t${record.end}\t${record.duration}\t${record.reason}`
      ).join('\n');
      
      const header = 'Associate Name\tBreak Start\tBreak End\tBreak Duration\tReason\n';
      await navigator.clipboard.writeText(header + tableText);
      toast.success('Table copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy table');
    }
  };

  const downloadExcel = () => {
    const data = [
      ['Associate Name', 'Break Start', 'Break End', 'Break Duration', 'Reason'],
      ...breakRecords.map(record => [record.name, record.start, record.end, record.duration, record.reason])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Break Times');
    XLSX.writeFile(workbook, 'break_times.xlsx');
    toast.success('Excel file downloaded!');
  };

  const clearTable = () => {
    if (window.confirm('Are you sure you want to clear all break records?')) {
      setBreakRecords([]);
      setActiveBreaks({});
      localStorage.removeItem('breakTableData');
      toast.success('Table cleared successfully');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      recordTime();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      {/* Live Clock */}
      <div className="fixed top-4 left-4 z-10">
        <Card className="bg-slate-900 text-green-400 border-slate-700 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6" />
              <span className="font-mono text-xl font-bold">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto pt-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-3">
            <Timer className="h-10 w-10 text-blue-600" />
            Break Time Keeper Pro
          </h1>
          <p className="text-slate-600 text-lg">Professional break time tracking and management system</p>
        </div>

        {/* Control Section */}
        <Card className="mb-8 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Users className="h-5 w-5" />
              Associate Break Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Input
                type="text"
                placeholder="Enter associate name"
                value={associateName}
                onChange={(e) => setAssociateName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="max-w-xs"
              />
              <div className="flex gap-2 flex-wrap justify-center">
                <Button onClick={recordTime} className="bg-blue-600 hover:bg-blue-700">
                  {associateName && breakRecords.find(r => r.name === associateName && !r.end) ? 'End Break' : 'Start Break'}
                </Button>
                <Button onClick={copyTable} variant="outline" className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Table
                </Button>
                <Button onClick={downloadExcel} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>
                <Button onClick={clearTable} variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear Table
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break Records Table */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-700">Break Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="font-semibold text-slate-700">Associate Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Break Start</TableHead>
                    <TableHead className="font-semibold text-slate-700">Break End</TableHead>
                    <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                    <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        No break records yet. Start tracking breaks by entering an associate name above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakRecords.map((record, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">{record.name}</TableCell>
                        <TableCell>{record.start}</TableCell>
                        <TableCell>{record.end || <span className="text-green-600 font-semibold">Active</span>}</TableCell>
                        <TableCell className={`${getDurationColor(record.duration)} rounded px-2 py-1`}>
                          {record.duration || <span className="text-blue-600">In progress...</span>}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="Enter reason"
                            value={record.reason}
                            onChange={(e) => updateReason(index, e.target.value)}
                            className="max-w-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
