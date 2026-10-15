import React, { useState } from 'react';
import { PRICING_PLANS } from '../../services/mockData';
import { PricingPlan } from '../../types';
import { useToast } from '../ui/Toast';
import {
  CreditCard,
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  Download,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const BillingView: React.FC = () => {
  const { showToast } = useToast();
  const [currentPlanId, setCurrentPlanId] = useState<string>('pro');
  const [tasksUsed, setTasksUsed] = useState(14280);

  const plans = PRICING_PLANS;
  const currentPlan = plans.find((p) => p.id === currentPlanId) || plans[2];

  const invoices = [
    { id: 'inv_1042', date: 'Oct 01, 2026', amount: '$99.00', status: 'Paid', plan: 'Pro Monthly' },
    { id: 'inv_1038', date: 'Sep 01, 2026', amount: '$99.00', status: 'Paid', plan: 'Pro Monthly' },
    { id: 'inv_1025', date: 'Aug 01, 2026', amount: '$29.00', status: 'Paid', plan: 'Starter Monthly' },
  ];

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.id === currentPlanId) {
      showToast('You are already on the ' + plan.name + ' plan', 'info');
      return;
    }
    setCurrentPlanId(plan.id);
    showToast(`Switched subscription to ${plan.name} plan!`, 'success');
  };

  const usagePercent = Math.min(
    100,
    Math.round((tasksUsed / currentPlan.tasksMonthly) * 100)
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Billing & Plans</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage your task quota, billing cadence, payment methods, and invoice history.
        </p>
      </div>

      {/* CURRENT USAGE OVERVIEW */}
      <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Current Subscription
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-lg font-bold text-neutral-100">{currentPlan.name} Plan</h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active & Auto-renewing
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{currentPlan.audience}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono text-neutral-100">
              ${currentPlan.priceMonthly}
              <span className="text-xs text-neutral-400 font-normal"> / month</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 pt-2 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">Monthly Task Quota:</span>
            <span className="text-neutral-200">
              <strong className="text-indigo-400">{tasksUsed.toLocaleString()}</strong> /{' '}
              {currentPlan.tasksMonthly.toLocaleString()} tasks ({usagePercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${usagePercent}%` }}
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>Billing cycle ends October 31, 2026</span>
            <span>Unused tasks do not roll over</span>
          </div>
        </div>
      </div>

      {/* PRICING TIERS COMPARISON */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-neutral-100">Choose Your Plan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isCurrent = p.id === currentPlanId;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-5 ${
                  p.popular
                    ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg ring-1 ring-indigo-500/30'
                    : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-neutral-100">{p.name}</h4>
                    {p.popular && (
                      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-neutral-100">
                      ${p.priceMonthly}
                    </span>
                    <span className="text-xs text-neutral-400">/ month</span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed min-h-[32px]">
                    {p.audience}
                  </p>

                  <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60 text-xs font-mono text-neutral-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Monthly Tasks:</span>
                      <strong className="text-neutral-100">{p.tasksMonthly.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Workflows:</span>
                      <strong className="text-neutral-100">{p.activeWorkflowsLimit}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Polling:</span>
                      <strong className="text-neutral-100">{p.checkFrequency}</strong>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(p)}
                  disabled={isCurrent}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
                    isCurrent
                      ? 'bg-neutral-800 text-neutral-400 cursor-default'
                      : p.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAYMENT METHOD & INVOICES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Method */}
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-100">Payment Method</h3>
          <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-200">
                VISA
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-200 block font-mono">
                  •••• 4242
                </span>
                <span className="text-[10px] text-neutral-500 font-mono block">
                  Expires 12/2028
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Payment method update dialog opened', 'info')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Update
            </button>
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted with 256-bit Stripe vault tokenization</span>
          </div>
        </div>

        {/* Invoice History */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Billing History</h3>
            <span className="text-xs font-mono text-neutral-400">PDF Invoices</span>
          </div>

          <div className="divide-y divide-neutral-800/60">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-neutral-200 block">{inv.plan}</span>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {inv.id} · {inv.date}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-neutral-200 font-semibold">{inv.amount}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {inv.status}
                  </span>
                  <button
                    onClick={() => showToast(`Downloaded invoice ${inv.id}.pdf`, 'success')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded hover:bg-neutral-800"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
