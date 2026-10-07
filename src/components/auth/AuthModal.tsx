import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../ui/Toast';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'verify';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAuthenticated: (user: User) => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserAuthenticated,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('alex.ops@autoflow.io');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Alex Chen');
  const [verificationCode, setVerificationCode] = useState('941203');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate authenticating against backend Auth Service
    await new Promise((r) => setTimeout(r, 600));

    if (mode === 'forgot') {
      setIsLoading(false);
      showToast('Password reset instructions sent to ' + email, 'success');
      setMode('login');
      return;
    }

    if (mode === 'signup') {
      setIsLoading(false);
      showToast('Account created! Please verify your email code.', 'info');
      setMode('verify');
      return;
    }

    if (mode === 'verify') {
      setIsLoading(false);
      showToast('Email verified successfully! Welcome to AutoFlow.', 'success');
    }

    const authenticatedUser: User = {
      id: `usr_${Date.now().toString(36)}`,
      name: name || 'Alex Chen',
      email: email || 'alex.ops@autoflow.io',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'owner',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCurrentUser(authenticatedUser);
    onUserAuthenticated(authenticatedUser);
    showToast(`Signed in as ${authenticatedUser.name}`, 'success');
    setIsLoading(false);
    onClose();
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const googleUser: User = {
      id: 'usr_google_9921',
      name: 'Alex Chen',
      email: 'alex.chen@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'owner',
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCurrentUser(googleUser);
    onUserAuthenticated(googleUser);
    showToast('Authenticated via Google OAuth 2.0', 'success');
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                {mode === 'login' && 'Sign in to AutoFlow'}
                {mode === 'signup' && 'Create your AutoFlow account'}
                {mode === 'forgot' && 'Reset your password'}
                {mode === 'verify' && 'Verify your email'}
              </h2>
              <p className="text-xs text-neutral-400">
                {mode === 'login' && 'Access workflows, integrations and execution metrics'}
                {mode === 'signup' && 'Start building production-ready automations'}
                {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
                {mode === 'verify' && 'Enter the 6-digit verification code sent to your email'}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth button */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800/60 text-xs font-semibold text-neutral-200 transition-colors shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-neutral-800 flex-1" />
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
                  or with email
                </span>
                <div className="h-px bg-neutral-800 flex-1" />
              </div>
            </>
          )}

          {/* Full Name field (signup) */}
          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-medium text-neutral-400 block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          {mode !== 'verify' && (
            <div>
              <label className="text-[11px] font-medium text-neutral-400 block mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-neutral-400">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Email verification code field */}
          {mode === 'verify' && (
            <div>
              <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                6-digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm font-mono tracking-widest text-center text-neutral-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                  {mode === 'verify' && 'Verify & Enter Platform'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Footer toggle modes */}
          <div className="pt-2 text-center text-xs text-neutral-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
