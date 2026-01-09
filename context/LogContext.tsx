
import React, { createContext, useContext, useState, useCallback } from 'react';

export type LogSource = 'Lishogi' | 'Gemini' | 'System' | 'YaneuraOu';
export type LogType = 'info' | 'success' | 'error' | 'request' | 'response';

export interface LogEntry {
  id: string;
  timestamp: number;
  source: LogSource;
  type: LogType;
  summary: string;
  details?: any;
}

interface LogContextType {
  logs: LogEntry[];
  addLog: (source: LogSource, type: LogType, summary: string, details?: any) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((source: LogSource, type: LogType, summary: string, details?: any) => {
    setLogs(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        source,
        type,
        summary,
        details
      },
      ...prev.slice(0, 99) // Keep last 100 logs
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogger = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }
  return context;
};
