
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Copy, Trash2, Users, Timer, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BreakRecord {
  id: string;
  name: string;
  start: string;
  end: string;
  duration: string;
  reason: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'overtime';
}

const Index = () => {
  const [associateName, setAssociateName] = useState('');
  const [breakRecords, setBreakRecords] = useState<BreakRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('breakTimeTrackerData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const reconstructedData = parsed.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: record.endTime ? new Date(record.endTime) : undefined,
        }));
        setBreakRecords(reconstructedData);
      } catch (error) {
        console.error('Error loading saved data:', error);
        toast.error('Failed to load saved data');
      }
    }
  }, []);

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('breakTimeTrackerData', JSON.stringify(breakRecords));
  }, [breakRecords]);

  // Helper functions
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const calculateCurrentDuration = (startTime: Date) => {
    return currentTime.getTime() - startTime.getTime();
  };

  const getDurationColor = (durationMs: number, status: string) => {
    const minutes = Math.floor(durationMs / 60000);
    
    if (status === 'active') {
      if (minutes > 32) return 'bg-red-100 text-red-800 border-red-200';
      if (minutes > 30) return 'bg-orange-100 text-orange-800 border-orange-200';
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    if (minutes > 32) return 'bg-red-500 text-white';
    if (minutes > 30) return 'bg-orange-500 text-white';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overtime':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const validateAssociateName = (name: string) => {
    if (!name.trim()) {
      toast.error('Please enter an associate name');
      return false;
    }

    const nameCount = breakRecords.filter(record => 
      record.name.toLowerCase() === name.toLowerCase()
    ).length;
    
    if (nameCount >= 2) {
      toast.error(`${name} has already been used twice. Cannot add more entries.`);
      return false;
    }

    return true;
  };

  const startBreak = (name: string) => {
    const now = new Date();
    const newRecord: BreakRecord = {
      id: `${name}-${now.getTime()}`,
      name: name,
      start: formatTime(now),
      end: '',
      duration: '',
      reason: '',
      startTime: now,
      status: 'active'
    };

    setBreakRecords(prev => [...prev, newRecord]);
    toast.success(`Break started for ${name}`, {
      description: `Started at ${formatTime(now)}`,
    });
  };

  const endBreak = (name: string) => {
    const now = new Date();
    
    setBreakRecords(prev => 
      prev.map(record => {
        if (record.name === name && record.status === 'active') {
          const duration = now.getTime() - record.startTime.getTime();
          const minutes = Math.floor(duration / 60000);
          
          let status: 'completed' | 'overtime' = 'completed';
          if (minutes > 32) {
            status = 'overtime';
            toast.error(`${name}'s break exceeded 32 minutes!`, {
              description: `Duration: ${formatDuration(duration)}`,
              duration: 5000,
            });
          } else if (minutes > 30) {
            toast.warning(`${name}'s break exceeded 30 minutes`, {
              description: `Duration: ${formatDuration(duration)}`,
              duration: 3000,
            });
          } else {
            toast.success(`Break ended for ${name}`, {
              description: `Duration: ${formatDuration(duration)}`,
            });
          }

          return {
            ...record,
            end: formatTime(now),
            duration: formatDuration(duration),
            endTime: now,
            status
          };
        }
        return record;
      })
    );
  };

  const recordTime = () => {
    const trimmedName = associateName.trim();
    
    if (!validateAssociateName(trimmedName)) {
      setAssociateName('');
      return;
    }

    const activeRecord = breakRecords.find(record => 
      record.name === trimmedName && record.status === 'active'
    );

    if (activeRecord) {
      endBreak(trimmedName);
    } else {
      startBreak(trimmedName);
    }

    setAssociateName('');
  };

  const updateReason = (id: string, reason: string) => {
    setBreakRecords(prev => 
      prev.map(record => 
        record.id === id ? { ...record, reason } : record
      )
    );
  };

  const deleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setBreakRecords(prev => prev.filter(record => record.id !== id));
      toast.success('Record deleted successfully');
    }
  };

  const copyTable = async () => {
    try {
      const tableText = breakRecords.map(record => 
        `${record.name}\t${record.start}\t${record.end}\t${record.duration}\t${record.reason}\t${record.status}`
      ).join('\n');
      
      const header = 'Associate Name\tBreak Start\tBreak End\tBreak Duration\tReason\tStatus\n';
      await navigator.clipboard.writeText(header + tableText);
      toast.success('Table copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy table');
    }
  };

  const downloadExcel = () => {
    const data = [
      ['Associate Name', 'Break Start', 'Break End', 'Break Duration', 'Reason', 'Status'],
      ...breakRecords.map(record => [
        record.name, 
        record.start, 
        record.end || 'Active', 
        record.duration || formatDuration(calculateCurrentDuration(record.startTime)), 
        record.reason,
        record.status
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Break Times');
    
    const fileName = `break_times_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel file downloaded!', {
      description: fileName
    });
  };

  const clearTable = () => {
    if (window.confirm('Are you sure you want to clear all break records? This action cannot be undone.')) {
      setBreakRecords([]);
      localStorage.removeItem('breakTimeTrackerData');
      toast.success('All records cleared successfully');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      recordTime();
    }
  };

  const getActiveBreaksCount = () => {
    return breakRecords.filter(record => record.status === 'active').length;
  };

  const getOvertimeBreaksCount = () => {
    return breakRecords.filter(record => record.status === 'overtime').length;
  };

  const getTotalBreaksToday = () => {
    const today = new Date().toDateString();
    return breakRecords.filter(record => 
      record.startTime.toDateString() === today
    ).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      <div className="max-w-7xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-3">
            <Timer className="h-10 w-10 text-blue-600" />
            Break Time Keeper Pro
          </h1>
          <p className="text-slate-600 text-lg">Professional break time tracking and management system</p>
          <div className="mt-4 text-sm text-slate-500">
            Current Time: {formatTime(currentTime)}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Active Breaks</p>
                  <p className="text-2xl font-bold text-blue-800">{getActiveBreaksCount()}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Overtime Breaks</p>
                  <p className="text-2xl font-bold text-orange-800">{getOvertimeBreaksCount()}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Total Today</p>
                  <p className="text-2xl font-bold text-green-800">{getTotalBreaksToday()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Records</p>
                  <p className="text-2xl font-bold text-slate-800">{breakRecords.length}</p>
                </div>
                <Users className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>
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
              <div className="flex-1 max-w-xs">
                <Input
                  type="text"
                  placeholder="Enter associate name"
                  value={associateName}
                  onChange={(e) => setAssociateName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button 
                  onClick={recordTime} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!associateName.trim()}
                >
                  {associateName && breakRecords.find(r => r.name === associateName && r.status === 'active') 
                    ? 'End Break' 
                    : 'Start Break'
                  }
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
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break Records Table */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-700 flex items-center justify-between">
              <span>Break Records</span>
              <span className="text-sm font-normal text-slate-500">
                {breakRecords.length} total records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Associate Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Break Start</TableHead>
                    <TableHead className="font-semibold text-slate-700">Break End</TableHead>
                    <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                    <TableHead className="font-semibold text-slate-700">Reason</TableHead>
                    <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        No break records yet. Start tracking breaks by entering an associate name above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakRecords.map((record) => {
                      const currentDuration = record.status === 'active' 
                        ? calculateCurrentDuration(record.startTime)
                        : record.endTime 
                          ? record.endTime.getTime() - record.startTime.getTime()
                          : 0;
                      
                      return (
                        <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className="capitalize text-sm">{record.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell>{record.start}</TableCell>
                          <TableCell>
                            {record.end || (
                              <span className="text-green-600 font-semibold flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Active
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium border ${getDurationColor(currentDuration, record.status)}`}>
                              {record.duration || formatDuration(currentDuration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Enter reason"
                              value={record.reason}
                              onChange={(e) => updateReason(record.id, e.target.value)}
                              className="max-w-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => deleteRecord(record.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Break Time Keeper Pro - Built for professional workplace management</p>
          <p className="mt-1">Data is automatically saved to local storage</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
