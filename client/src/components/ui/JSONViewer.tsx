import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface JSONViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
}

export const JSONViewer: React.FC<JSONViewerProps> = ({ data, title, maxHeight = 'max-h-64' }) => {
  const [copied, setCopied] = useState(false);

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 overflow-hidden text-xs font-mono">
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 bg-neutral-900/60 text-neutral-400">
          <span className="text-[11px] font-medium tracking-wide uppercase">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] hover:text-neutral-200 transition-colors py-0.5 px-1.5 rounded bg-neutral-800/60"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
      <div className={`p-3 overflow-auto ${maxHeight} text-neutral-300 font-mono leading-relaxed select-text`}>
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
};
