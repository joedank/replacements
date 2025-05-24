import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Tag } from 'antd';
import { ClearOutlined, DownloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Global log storage
let logEntries: LogEntry[] = [];
let logUpdateCallbacks: ((logs: LogEntry[]) => void)[] = [];

// Override console methods to capture logs
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const captureLog = (level: LogEntry['level'], message: string, ...args: any[]) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: args.length > 0 ? args : undefined,
  };
  
  logEntries.push(entry);
  
  // Keep only last 500 entries
  if (logEntries.length > 500) {
    logEntries = logEntries.slice(-500);
  }
  
  // Notify all subscribers
  logUpdateCallbacks.forEach(cb => cb([...logEntries]));
  
  // Still log to original console
  originalConsole[level](message, ...args);
};

// Override console methods
console.debug = (message: string, ...args: any[]) => captureLog('debug', message, ...args);
console.info = (message: string, ...args: any[]) => captureLog('info', message, ...args);
console.warn = (message: string, ...args: any[]) => captureLog('warn', message, ...args);
console.error = (message: string, ...args: any[]) => captureLog('error', message, ...args);

export const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    // Subscribe to log updates
    const updateLogs = (newLogs: LogEntry[]) => {
      setLogs(newLogs);
    };
    
    logUpdateCallbacks.push(updateLogs);
    setLogs([...logEntries]);
    
    return () => {
      logUpdateCallbacks = logUpdateCallbacks.filter(cb => cb !== updateLogs);
    };
  }, []);

  const clearLogs = () => {
    logEntries = [];
    setLogs([]);
  };

  const downloadLogs = () => {
    const content = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${
        log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'debug': return 'blue';
      case 'info': return 'green';
      case 'warn': return 'orange';
      case 'error': return 'red';
    }
  };

  const filteredLogs = filter 
    ? logs.filter(log => 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase()))
      )
    : logs;

  if (!visible) {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 1000 
      }}>
        <Button 
          type="primary" 
          icon={<EyeOutlined />} 
          onClick={() => setVisible(true)}
          size="small"
        >
          Debug ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      width: 600, 
      maxHeight: '60vh',
      zIndex: 1000 
    }}>
      <Card
        title="Debug Console"
        size="small"
        extra={
          <Space>
            <input
              placeholder="Filter logs..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 150 }}
            />
            <Button 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={downloadLogs}
            >
              Export
            </Button>
            <Button 
              icon={<ClearOutlined />} 
              size="small"
              onClick={clearLogs}
            >
              Clear
            </Button>
            <Button 
              icon={<EyeInvisibleOutlined />} 
              size="small"
              onClick={() => setVisible(false)}
            >
              Hide
            </Button>
          </Space>
        }
        style={{ 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          maxHeight: '40vh', 
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {filteredLogs.length === 0 ? (
            <Text type="secondary">No logs yet...</Text>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} style={{ marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                  <Tag color={getLevelColor(log.level)} style={{ marginRight: 0 }}>
                    {log.level.toUpperCase()}
                  </Tag>
                </Space>
                <Paragraph style={{ margin: 0, marginTop: 2 }}>
                  {log.message}
                </Paragraph>
                {log.data && (
                  <pre style={{ 
                    margin: '4px 0 0 0', 
                    padding: 4, 
                    backgroundColor: '#f5f5f5',
                    borderRadius: 2,
                    fontSize: 11,
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};