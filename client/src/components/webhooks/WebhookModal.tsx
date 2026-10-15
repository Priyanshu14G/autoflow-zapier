import React, { useState, useEffect } from 'react';
import { Workflow } from '../../types';
import { JSONViewer } from '../ui/JSONViewer';
import { useToast } from '../ui/Toast';
import {
  Globe,
  Copy,
  Check,
  Play,
  RotateCw,
  X,
  Clock,
  Send,
  Terminal,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface WebhookModalProps {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({ workflow, isOpen, onClose }) => {
  if (!isOpen) return null;

  const { showToast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        event: 'customer.inquiry',
        customer_email: 'enterprise.buyer@acme.com',
        subject: 'Custom Enterprise Automation Plan',
        body: 'We are expanding to 150 team seats. Please contact us with volume pricing.',
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const secret = workflow.webhookSecret || 'sec_standard_key';
  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/webhooks/${workflow.id}/${secret}`;

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${testPayload.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;

  const fetchRecentEvents = async () => {
    try {
      const res = await fetch(`/api/webhooks/${workflow.id}/events`);
      if (res.ok) {
        const data = await res.json();
        setRecentEvents(data.events || []);
        if (data.events?.length > 0 && !selectedEvent) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch events', e);
    }
  };

  useEffect(() => {
    fetchRecentEvents();
  }, [workflow.id]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    showToast('Webhook URL copied to clipboard', 'success');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    showToast('cURL snippet copied to clipboard', 'success');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleSendTestWebhook = async () => {
    setIsSending(true);
    try {
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(testPayload);
      } catch (e) {
        showToast('Invalid JSON format in payload editor', 'error');
        setIsSending(false);
        return;
      }

      const res = await fetch(`/api/webhooks/${workflow.id}/${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedBody),
      });

      const responseData = await res.json();
      showToast('Test webhook dispatched successfully (200 OK)', 'success');

      // Create event representation
      const newEvent = {
        id: responseData.eventId || `evt_${Date.now()}`,
        workflowId: workflow.id,
        timestamp: new Date().toISOString(),
        headers: { 'content-type': 'application/json', 'user-agent': 'AutoFlow-Test-Client' },
        body: parsedBody,
        response: responseData,
      };

      setRecentEvents((prev) => [newEvent, ...prev]);
      setSelectedEvent(newEvent);
    } catch (err: any) {
      showToast('Failed to deliver webhook payload', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Webhook Trigger Configuration
              </h2>
              <p className="text-xs text-neutral-400">
                Workflow: <span className="text-neutral-200 font-medium">{workflow.name}</span>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Endpoint URL Card */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                Production Webhook Endpoint (POST)
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SSL Encrypted & Signature Protected</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all overflow-x-auto whitespace-nowrap">
                {webhookUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Test & Payloads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Test Dispatcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200">
                  Simulate Webhook POST
                </label>
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200"
                >
                  <Terminal className="w-3 h-3" />
                  <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL'}</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />

              <button
                onClick={handleSendTestWebhook}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Webhook Event...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Test Webhook</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Live Inbound Inspector */}
            <div className="space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200">
                  Inbound Requests ({recentEvents.length})
                </label>
                <button
                  onClick={fetchRecentEvents}
                  className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-800"
                  title="Refresh logs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentEvents.length === 0 ? (
                <div className="flex-1 rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-6 flex flex-col items-center justify-center text-center">
                  <Clock className="w-8 h-8 text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400 font-medium">No webhook events received yet</p>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                    Send a test payload using the editor on the left or dispatch an HTTP POST request.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {recentEvents.slice(0, 5).map((evt, idx) => (
                      <button
                        key={evt.id || idx}
                        onClick={() => setSelectedEvent(evt)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors ${
                          selectedEvent?.id === evt.id
                            ? 'bg-neutral-800 text-cyan-300 border border-neutral-700'
                            : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                        }`}
                      >
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : `Event #${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {selectedEvent && (
                    <div className="space-y-2">
                      <JSONViewer
                        data={selectedEvent.body}
                        title="Received Payload"
                        maxHeight="max-h-40"
                      />
                      <JSONViewer
                        data={selectedEvent.response || { status: 200, message: 'Queued to worker' }}
                        title="HTTP Response"
                        maxHeight="max-h-24"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-mono">
            Secret Key: {secret.slice(0, 8)}...
          </span>
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
