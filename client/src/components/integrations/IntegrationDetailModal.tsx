import React, { useState } from 'react';
import { Integration } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { useToast } from '../ui/Toast';
import {
  X,
  ShieldCheck,
  ExternalLink,
  Check,
  Zap,
  Globe,
  Radio,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';

interface IntegrationDetailModalProps {
  integration: Integration;
  isOpen: boolean;
  onClose: () => void;
  onToggleConnection: (integrationId: string, accountName?: string) => void;
}

export const IntegrationDetailModal: React.FC<IntegrationDetailModalProps> = ({
  integration,
  isOpen,
  onClose,
  onToggleConnection,
}) => {
  if (!isOpen) return null;

  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInput, setAccountInput] = useState(
    integration.connectedAccount || `${integration.slug}.verified@workspace.io`
  );

  const handleConnect = async () => {
    setIsConnecting(true);
    // Simulate OAuth consent handshake or API key validation
    await new Promise((r) => setTimeout(r, 700));

    onToggleConnection(integration.id, accountInput);
    setIsConnecting(false);
    showToast(
      integration.connected
        ? `Disconnected ${integration.name}`
        : `Connected ${integration.name} (${accountInput}) successfully!`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/40 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 shadow-lg"
              style={{
                backgroundColor: `${integration.iconBg}20`,
                borderColor: `${integration.iconBg}40`,
              }}
            >
              <AppIcon app={integration.slug} size={24} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">{integration.name}</h2>
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                  {integration.category}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-md">
                {integration.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-200">
                  Authentication Method:
                </span>
                <span className="text-xs text-indigo-400 font-mono">
                  {integration.authMethod}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {integration.connected
                  ? `Connected account: ${integration.connectedAccount}`
                  : 'Ready to authenticate with OAuth 2.0 PKCE flow'}
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors ${
                integration.connected
                  ? 'bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 border border-neutral-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : integration.connected ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Connect {integration.name}</span>
                </>
              )}
            </button>
          </div>

          {/* Triggers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Available Triggers ({integration.triggers.length})
              </h3>
            </div>

            {integration.triggers.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                No trigger events for this provider (Actions only).
              </p>
            ) : (
              <div className="space-y-2">
                {integration.triggers.map((trig) => (
                  <div
                    key={trig.id}
                    className="p-3 rounded-xl border border-neutral-800/80 bg-neutral-950/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-200">{trig.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500 capitalize">
                        {trig.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {trig.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                Available Actions ({integration.actions.length})
              </h3>
            </div>

            {integration.actions.length === 0 ? (
              <p className="text-xs text-neutral-500 italic p-3 rounded-lg bg-neutral-950/40 border border-neutral-800/60">
                No actions defined for this provider.
              </p>
            ) : (
              <div className="space-y-2">
                {integration.actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-neutral-800/80 bg-neutral-950/50 space-y-1"
                  >
                    <span className="text-xs font-semibold text-neutral-200 block">{act.name}</span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <span>Read API Documentation</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
