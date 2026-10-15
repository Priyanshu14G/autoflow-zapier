import React from 'react';
import {
  Mail,
  MessageSquare,
  Sparkles,
  Table,
  GitBranch,
  Database,
  Globe,
  FileText,
  Clock,
  Zap,
  CreditCard,
  Send,
  Boxes,
  Cpu,
  Layers,
  Terminal,
  Filter,
  Repeat
} from 'lucide-react';

interface AppIconProps {
  app: string;
  className?: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({ app, className = 'w-5 h-5', size = 20 }) => {
  const norm = app.toLowerCase();

  switch (norm) {
    case 'gmail':
    case 'email':
      return <Mail size={size} className={`text-red-400 ${className}`} />;
    case 'slack':
      return <MessageSquare size={size} className={`text-emerald-400 ${className}`} />;
    case 'gemini':
    case 'ai':
      return <Sparkles size={size} className={`text-indigo-400 ${className}`} />;
    case 'sheets':
    case 'google sheets':
      return <Table size={size} className={`text-emerald-400 ${className}`} />;
    case 'github':
      return <GitBranch size={size} className={`text-neutral-200 ${className}`} />;
    case 'postgresql':
    case 'postgres':
      return <Database size={size} className={`text-sky-400 ${className}`} />;
    case 'http':
    case 'webhook':
      return <Globe size={size} className={`text-cyan-400 ${className}`} />;
    case 'notion':
      return <FileText size={size} className={`text-neutral-100 ${className}`} />;
    case 'schedule':
      return <Clock size={size} className={`text-amber-400 ${className}`} />;
    case 'stripe':
      return <CreditCard size={size} className={`text-violet-400 ${className}`} />;
    case 'discord':
      return <MessageSquare size={size} className={`text-indigo-400 ${className}`} />;
    case 'telegram':
      return <Send size={size} className={`text-sky-400 ${className}`} />;
    case 'logic':
    case 'condition':
      return <Filter size={size} className={`text-amber-400 ${className}`} />;
    case 'loop':
      return <Repeat size={size} className={`text-purple-400 ${className}`} />;
    case 'formatter':
      return <Terminal size={size} className={`text-teal-400 ${className}`} />;
    default:
      return <Zap size={size} className={`text-indigo-400 ${className}`} />;
  }
};
