import React, { useState } from 'react';
import { Integration } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { IntegrationDetailModal } from './IntegrationDetailModal';
import {
  Search,
  CheckCircle2,
  Plug,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowRight
} from 'lucide-react';

interface IntegrationsViewProps {
  integrations: Integration[];
  onToggleConnection: (id: string, accountName?: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  integrations,
  onToggleConnection,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalIntegration, setActiveModalIntegration] = useState<Integration | null>(null);

  const categories = [
    'All',
    'Communication',
    'Productivity',
    'CRM',
    'Developer Tools',
    'Finance',
    'Databases',
    'AI',
  ];

  const filtered = integrations.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            Integration Marketplace
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Connect third-party platforms with enterprise OAuth 2.0 and API keys.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{connectedCount} Connected Providers</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers (Slack, Gmail, Stripe, Postgres...)"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Pills */}
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

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveModalIntegration(item)}
            className="p-5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-800/40 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: `${item.iconBg}20`,
                    borderColor: `${item.iconBg}40`,
                  }}
                >
                  <AppIcon app={item.slug} size={20} />
                </div>

                {item.connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-neutral-500 bg-neutral-800/60 px-2 py-0.5 rounded-full">
                    {item.authMethod}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mt-1">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <div className="flex items-center gap-2">
                <span>{item.triggers.length} triggers</span>
                <span aria-hidden="true">·</span>
                <span>{item.actions.length} actions</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-200 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-neutral-500">
          <Plug className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-neutral-400">No integrations match your search</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Try searching for another service or choose "All" categories.
          </p>
        </div>
      )}

      {/* Integration Modal */}
      {activeModalIntegration && (
        <IntegrationDetailModal
          integration={activeModalIntegration}
          isOpen={Boolean(activeModalIntegration)}
          onClose={() => setActiveModalIntegration(null)}
          onToggleConnection={onToggleConnection}
        />
      )}
    </div>
  );
};
