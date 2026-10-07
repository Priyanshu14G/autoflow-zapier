import React, { useState } from 'react';
import { User, Workspace } from '../../types';
import { useToast } from '../ui/Toast';
import {
  User as UserIcon,
  Shield,
  Key,
  Bell,
  Plug,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Trash2,
  Lock,
  Globe
} from 'lucide-react';

interface SettingsViewProps {
  user: User;
  workspace: Workspace;
  onUpdateUser?: (updated: User) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  workspace,
  onUpdateUser,
  onUpdateWorkspace,
}) => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<
    'profile' | 'workspace' | 'security' | 'apiKeys' | 'notifications' | 'danger'
  >('profile');

  // Profile Form
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  // Workspace Form
  const [wsName, setWsName] = useState(workspace.name);

  // API Keys
  const [apiKeys, setApiKeys] = useState([
    { id: 'key_live_9481', name: 'Production Ingestion API Key', created: '2026-08-10', lastUsed: '5 mins ago' },
    { id: 'key_test_0192', name: 'Staging / CI Test Key', created: '2026-09-14', lastUsed: 'Yesterday' },
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Notifications
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnQuota, setNotifyOnQuota] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser?.({ ...user, name, email });
    showToast('Profile updated successfully', 'success');
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWorkspace?.({ ...workspace, name: wsName });
    showToast('Workspace settings saved', 'success');
  };

  const handleCreateApiKey = () => {
    const newKey = {
      id: `key_live_${Math.random().toString(36).substring(2, 10)}`,
      name: `API Token ${apiKeys.length + 1}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    setApiKeys([newKey, ...apiKeys]);
    showToast('New secret API key generated', 'success');
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    showToast('API key revoked immediately', 'info');
  };

  const handleCopyKey = (keyId: string) => {
    navigator.clipboard.writeText(keyId);
    setCopiedKey(keyId);
    showToast('API Key copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const menuSections = [
    { id: 'profile', label: 'Personal Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'workspace', label: 'Workspace Details', icon: <Globe className="w-4 h-4" /> },
    { id: 'apiKeys', label: 'API Keys & Secrets', icon: <Key className="w-4 h-4" /> },
    { id: 'security', label: 'Security & 2FA', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notification Settings', icon: <Bell className="w-4 h-4" /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Settings</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage your account profile, workspace security policies, and programmatic API access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {menuSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-left transition-colors ${
                activeSection === sec.id
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="md:col-span-3">
          {/* PROFILE */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Personal Profile</h3>
                <p className="text-xs text-neutral-400">Update your public name and primary notification email.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* WORKSPACE */}
          {activeSection === 'workspace' && (
            <form onSubmit={handleSaveWorkspace} className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Workspace Settings</h3>
                <p className="text-xs text-neutral-400">Organization identification and global defaults.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1">Workspace Slug</label>
                  <input
                    type="text"
                    disabled
                    value={workspace.slug}
                    className="w-full max-w-md bg-neutral-950/60 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Save Workspace
                </button>
              </div>
            </form>
          )}

          {/* API KEYS */}
          {activeSection === 'apiKeys' && (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">API Tokens & Webhook Access</h3>
                  <p className="text-xs text-neutral-400">Use secret tokens to trigger workflows and query execution telemetry.</p>
                </div>
                <button
                  onClick={handleCreateApiKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Key</span>
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs font-semibold text-neutral-200 block">{k.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                          {k.id.slice(0, 12)}••••••••••••
                        </span>
                        <button
                          onClick={() => handleCopyKey(k.id)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                        >
                          {copiedKey === k.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono block">
                        Created {k.created} · Last used {k.lastUsed}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeSection === 'security' && (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Security & Authentication Policies</h3>
                <p className="text-xs text-neutral-400">Configure Two-Factor Authentication and session timeouts.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Two-Factor Authentication (2FA)</span>
                    <span className="text-xs text-neutral-400">Enforce TOTP authenticator app verification on login.</span>
                  </div>
                  <button
                    onClick={() => showToast('2FA setup QR modal launched', 'info')}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200"
                  >
                    Enable 2FA
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Single Sign-On (SSO / SAML)</span>
                    <span className="text-xs text-neutral-400">Integrate Okta, Azure AD, or Google Workspace SSO.</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">Business Plan Only</span>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Notification Preferences</h3>
                <p className="text-xs text-neutral-400">Control when AutoFlow sends email and Slack alerts.</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Workflow Execution Failures</span>
                    <span className="text-xs text-neutral-400">Receive instant alert when any step throws an unhandled error.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnFailure}
                    onChange={(e) => setNotifyOnFailure(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-neutral-900 border-neutral-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Quota Threshold Warning</span>
                    <span className="text-xs text-neutral-400">Alert team when task usage reaches 80% and 95% of plan.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnQuota}
                    onChange={(e) => setNotifyOnQuota(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-neutral-900 border-neutral-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">Daily Executive Summary</span>
                    <span className="text-xs text-neutral-400">Receive a morning digest of successful executions and time saved.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-neutral-900 border-neutral-700"
                  />
                </label>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeSection === 'danger' && (
            <div className="p-6 rounded-2xl bg-rose-950/10 border border-rose-500/30 space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Danger Zone</h3>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Actions here are permanent and cannot be undone. Deleting this workspace will purge all active workflows, execution history, and integration keys.
              </p>

              <div className="pt-3 border-t border-rose-500/20 flex justify-end">
                <button
                  type="button"
                  onClick={() => showToast('Workspace deletion requires owner confirmation', 'error')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
