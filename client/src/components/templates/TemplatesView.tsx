import React, { useState } from 'react';
import { Template } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import {
  Search,
  Sparkles,
  ArrowRight,
  Flame,
  LayoutGrid,
  CheckCircle2,
  Copy
} from 'lucide-react';

interface TemplatesViewProps {
  templates: Template[];
  onUseTemplate: (template: Template) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onUseTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    'Communication',
    'Developer Tools',
    'Productivity',
    'Finance',
    'Operations',
  ];

  const filtered = templates.filter((tpl) => {
    const matchesCategory =
      selectedCategory === 'All' || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.name.toLowerCase().includes(search.toLowerCase()) ||
      tpl.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            Workflow Template Marketplace
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Battle-tested automation recipes ready to deploy in seconds.
          </p>
        </div>

        <span className="text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
          {templates.length} Verified Production Recipes
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates (AI triage, Slack alerts, Sheets sync...)"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="p-5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-800/40 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {/* Apps used icons */}
                <div className="flex items-center -space-x-1">
                  {tpl.apps.map((app, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <AppIcon app={app} size={14} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {tpl.popular && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Flame className="w-3 h-3" /> Popular
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded-full">
                    {tpl.stepsCount} steps
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-100 leading-snug">
                  {tpl.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mt-1.5">
                  {tpl.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 font-medium">
                {tpl.category}
              </span>

              <button
                onClick={() => onUseTemplate(tpl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <span>Use Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
