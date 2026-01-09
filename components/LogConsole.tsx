
import React, { useState } from 'react';
import { useLogger, LogEntry } from '../context/LogContext';

const LogConsole: React.FC = () => {
  const { logs, clearLogs } = useLogger();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-black/80 text-shogi-accent border border-shogi-accent/50 px-3 py-2 rounded-lg shadow-lg hover:bg-black z-50 flex items-center gap-2 text-xs font-mono"
      >
        <i className="fa-solid fa-terminal"></i>
        <span>Debug Console</span>
        {logs.length > 0 && (
          <span className="bg-shogi-accent text-black px-1.5 rounded-full text-[10px] font-bold">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  const getSourceColor = (source: string) => {
    switch(source) {
      case 'Lishogi': return 'text-green-400';
      case 'Gemini': return 'text-blue-400';
      case 'YaneuraOu': return 'text-orange-400';
      case 'System': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'request': return 'fa-arrow-up';
      case 'response': return 'fa-arrow-down';
      case 'error': return 'fa-triangle-exclamation text-red-500';
      case 'success': return 'fa-check text-green-500';
      default: return 'fa-info-circle';
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[600px] h-[400px] bg-[#1a1816] border-t-2 md:border-l-2 border-shogi-accent/30 shadow-2xl z-50 flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="flex justify-between items-center p-2 bg-black/50 border-b border-white/10">
        <div className="flex items-center gap-2 text-shogi-accent font-bold">
          <i className="fa-solid fa-terminal"></i>
          <span>System Logs</span>
        </div>
        <div className="flex gap-2">
          <button onClick={clearLogs} className="px-2 py-1 hover:bg-white/10 rounded text-gray-400">
            <i className="fa-solid fa-trash mr-1"></i> Clear
          </button>
          <button onClick={() => setIsOpen(false)} className="px-2 py-1 hover:bg-white/10 rounded text-gray-400">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#111]">
        {logs.length === 0 && (
          <div className="text-gray-600 text-center mt-10">No logs recorded yet.</div>
        )}
        {logs.map(log => (
          <div key={log.id} className="border-b border-white/5 pb-1">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded"
              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
            >
              <span className="text-gray-500 w-16 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 } as any)}
              </span>
              <span className={`font-bold w-16 shrink-0 ${getSourceColor(log.source)}`}>
                [{log.source}]
              </span>
              <i className={`fa-solid ${getTypeIcon(log.type)} w-4 text-center text-gray-500`}></i>
              <span className={`${log.type === 'error' ? 'text-red-400' : 'text-gray-300'} truncate flex-1`}>
                {log.summary}
              </span>
              {log.details && (
                <i className={`fa-solid fa-chevron-right text-[10px] text-gray-600 transition-transform ${expandedLogId === log.id ? 'rotate-90' : ''}`}></i>
              )}
            </div>
            
            {/* Expanded Details */}
            {expandedLogId === log.id && log.details && (
              <div className="bg-black/50 p-2 mt-1 rounded text-gray-400 overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all">
                  {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogConsole;
