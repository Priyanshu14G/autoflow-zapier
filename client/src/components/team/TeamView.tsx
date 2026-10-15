import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { useToast } from '../ui/Toast';
import {
  Users,
  Plus,
  Mail,
  Shield,
  UserPlus,
  MoreVertical,
  CheckCircle2,
  Clock,
  History,
  X
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt: string;
}

export const TeamView: React.FC = () => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([
    {
      id: 'm-1',
      name: 'Alex Chen',
      email: 'alex.ops@autoflow.io',
      role: 'owner',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      joinedAt: '2026-08-01',
    },
    {
      id: 'm-2',
      name: 'Sarah Miller',
      email: 'sarah.pm@autoflow.io',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      joinedAt: '2026-08-15',
    },
    {
      id: 'm-3',
      name: 'David Kim',
      email: 'david.dev@autoflow.io',
      role: 'editor',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
      joinedAt: '2026-09-02',
    },
    {
      id: 'm-4',
      name: 'Elena Rostova',
      email: 'elena.qa@autoflow.io',
      role: 'viewer',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80',
      joinedAt: '2026-09-20',
    },
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');

  const auditLogs = [
    { id: 'l1', user: 'Alex Chen', action: 'Published workflow', target: 'Customer Inbound AI Triage (v4)', time: '2 hours ago' },
    { id: 'l2', user: 'Sarah Miller', action: 'Connected integration', target: 'PostgreSQL Production DB', time: '1 day ago' },
    { id: 'l3', user: 'David Kim', action: 'Created webhook key', target: 'Stripe Churn Recovery', time: '3 days ago' },
    { id: 'l4', user: 'Elena Rostova', action: 'Invited team member', target: 'elena.qa@autoflow.io', time: '2 weeks ago' },
  ];

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setMembers([...members, newMember]);
    showToast(`Invitation dispatched to ${inviteEmail} (${inviteRole})`, 'success');
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  const handleUpdateRole = (id: string, newRole: UserRole) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    showToast('Role updated successfully', 'success');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Team & Permissions</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage workspace collaborators, access control tiers, and team audit logs.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-100">
            Workspace Members ({members.length})
          </h3>
          <span className="text-xs font-mono text-neutral-400">Pro Plan: Up to 50 seats</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800/80 bg-neutral-950/60 text-neutral-400 font-medium">
              <th className="py-3 px-5">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Permissions</th>
              <th className="py-3 px-4 font-mono">Joined Date</th>
              <th className="py-3 px-5 text-right">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-neutral-800/30 transition-colors">
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-100 block">{member.name}</span>
                      <span className="text-[11px] font-mono text-neutral-400 block">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <select
                    value={member.role}
                    disabled={member.role === 'owner'}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 capitalize focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>

                <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                  {member.role === 'owner' && 'Full workspace control & billing owner'}
                  {member.role === 'admin' && 'Can manage workflows, members & credentials'}
                  {member.role === 'editor' && 'Can build, edit and test workflows'}
                  {member.role === 'viewer' && 'Read-only access to workflows and execution logs'}
                </td>

                <td className="py-3.5 px-4 font-mono text-neutral-400 text-[11px]">
                  {member.joinedAt}
                </td>

                <td className="py-3.5 px-5 text-right">
                  <span className="text-[11px] font-mono text-emerald-400">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden space-y-0">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Workspace Activity Audit Log</h3>
            <p className="text-xs text-neutral-400">PostgreSQL-ready audit trail of all administrative events</p>
          </div>
          <span className="text-xs font-mono text-indigo-400">Real-time Stream</span>
        </div>

        <div className="p-5 divide-y divide-neutral-800/60 space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-200">{log.user}</span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400">{log.action}</span>
                <span className="font-mono text-indigo-300">"{log.target}"</span>
              </div>
              <span className="text-neutral-500 font-mono text-[11px]">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-neutral-100">Invite Team Member</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="admin">Admin - Can configure workspace, keys, & workflows</option>
                  <option value="editor">Editor - Can build and test automation pipelines</option>
                  <option value="viewer">Viewer - Read-only observer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
