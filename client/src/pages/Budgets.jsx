import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import { formatINR } from '../utils/currency.js';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  RefreshCw,
  Edit3,
  Gauge,
  Clock,
  Sliders,
  Calendar,
  X,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Layers,
  ArrowRight,
  ArrowLeft,
  Brain,
  Hourglass,
  Percent,
  Compass,
  Smile,
  Frown,
  Check,
  Plus,
  Loader2,
  Target,
  Info,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const SIMULATION_LOADING_STEPS = [
  '🔍 Searching Amazon.in & Flipkart for live alternatives...',
  '📊 Analyzing current market prices & availability...',
  '💰 Calculating savings timeline & cushion impact...',
  '🎯 Building your personalized sacrifice plan...',
];

const categoryIcons = {
  Food: '🍔',
  Shopping: '🛍️',
  Transport: '🚗',
  Bills: '📄',
  Entertainment: '🎮',
  Health: '💊',
  Savings: '💰',
  Investments: '📈',
};

const samplePurchases = [
  { item: 'Apple AirPods', amount: 14900, category: 'Shopping', icon: '🎧' },
  { item: 'Zara Trench Jacket', amount: 4990, category: 'Shopping', icon: '🧥' },
  { item: 'Mountain Bike', amount: 20000, category: 'Shopping', icon: '🚲' },
  { item: 'Weekend Staycation', amount: 11500, category: 'Entertainment', icon: '🏖️' },
  { item: 'Philips Air Fryer', amount: 6490, category: 'Shopping', icon: '🍳' },
  { item: 'Fine Dining Dinner', amount: 2800, category: 'Food', icon: '🍷' },
  { item: 'Flagship Smartphone', amount: 69900, category: 'Shopping', icon: '📱' },
];

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Modals state
  const [showRecalibrateModal, setShowRecalibrateModal] = useState(false);
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [recalibrateLimit, setRecalibrateLimit] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [newAmountInput, setNewAmountInput] = useState('');

  // 🛡️ Universal Multi-Step Purchase Assistant State
  const [wizardStep, setWizardStep] = useState(1); // 1: Input & Market Price, 2: Smart Alternatives, 3: Timeline & Plan
  const [simItem, setSimItem] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simCategory, setSimCategory] = useState('Shopping');
  const [marketData, setMarketData] = useState(null);
  const [isEstimatingMarket, setIsEstimatingMarket] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simLoadingStepIndex, setSimLoadingStepIndex] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [targetMonths, setTargetMonths] = useState(1);

  // 🔒 Lock background body scrolling when any modal is open
  const isAnyModalOpen = Boolean(showRecalibrateModal || editingBudget || showFrictionModal || showFormulaModal);

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isAnyModalOpen]);

  // Cycle through futuristic AI status messages while calculating
  useEffect(() => {
    let interval;
    if (simulating) {
      setSimLoadingStepIndex(0);
      interval = setInterval(() => {
        setSimLoadingStepIndex((prev) => (prev + 1) % SIMULATION_LOADING_STEPS.length);
      }, 700);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulating]);

  const loadBudgets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const res = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudgets(Array.isArray(res.data.budgets) ? res.data.budgets : []);
      setMonthlyIncome(res.data.monthlyIncome || 0);
    } catch (err) {
      console.error('Failed to load guardrails:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets(false);

    // 1. Background Polling Interval (every 4s for instant Telegram sync)
    const interval = setInterval(() => {
      loadBudgets(true);
    }, 4000);

    // 2. Window Focus Re-fetch
    const handleFocus = () => {
      loadBudgets(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // ==========================================
  // ⚡ DYNAMIC BURN-RATE, PACING & ZERO-GUILT POOL
  // ==========================================
  const pacingMetrics = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
    const monthProgressPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));

    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent || 0), 0);
    const remainingBudget = Math.max(0, totalBudget - totalSpent);
    const budgetUsagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Daily & Weekly velocities
    const currentDailyBurn = currentDay > 0 ? totalSpent / currentDay : 0;
    const safeDailyVelocity = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
    const safeWeeklyVelocity = safeDailyVelocity * 7;

    // 💎 ZERO-GUILT POOL CALCULATION
    // Total discretionary allocation minus discretionary spending so far
    const committedBills = budgets
      .filter((b) => b.category_name === 'Bills')
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

    const committedSavings = budgets
      .filter((b) => ['Savings', 'Investments'].includes(b.category_name))
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

    const discretionaryLimit = Math.max(0, totalBudget - committedBills - committedSavings);
    const discretionarySpent = budgets
      .filter((b) => !['Bills', 'Savings', 'Investments'].includes(b.category_name))
      .reduce((sum, b) => sum + parseFloat(b.spent || 0), 0);

    const zeroGuiltPool = Math.max(0, discretionaryLimit - discretionarySpent);
    const zeroGuiltDailyVelocity = daysRemaining > 0 ? zeroGuiltPool / daysRemaining : 0;
    const zeroGuiltUsagePercent = discretionaryLimit > 0 ? Math.min(100, Math.round((discretionarySpent / discretionaryLimit) * 100)) : 0;

    // Burn rate ratio
    const burnRatio = monthProgressPercent > 0 ? budgetUsagePercent / monthProgressPercent : 1;

    let burnStatus = {
      label: 'Optimal Pacing',
      color: 'emerald',
      badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      dotClass: 'bg-emerald-400',
      description: `Pacing safely at ${burnRatio.toFixed(1)}x benchmark`,
      severity: 'safe',
    };

    if (burnRatio > 1.35 || (totalBudget > 0 && totalSpent > totalBudget)) {
      burnStatus = {
        label: 'Critical Runway Burn',
        color: 'rose',
        badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        dotClass: 'bg-rose-400',
        description: `Consuming budget ${burnRatio.toFixed(1)}x faster than calendar days`,
        severity: 'critical',
      };
    } else if (burnRatio > 1.1) {
      burnStatus = {
        label: 'Elevated Velocity',
        color: 'amber',
        badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        dotClass: 'bg-amber-400',
        description: `Spending velocity is ${burnRatio.toFixed(1)}x of target pace`,
        severity: 'warning',
      };
    } else if (burnRatio >= 0.85) {
      burnStatus = {
        label: 'Balanced Pace',
        color: 'teal',
        badgeClass: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
        dotClass: 'bg-teal-400',
        description: `Spending aligned with calendar (Day ${currentDay}/${daysInMonth})`,
        severity: 'balanced',
      };
    }

    return {
      currentDay,
      daysInMonth,
      daysRemaining,
      monthProgressPercent,
      totalBudget,
      totalSpent,
      remainingBudget,
      budgetUsagePercent,
      currentDailyBurn,
      safeDailyVelocity,
      safeWeeklyVelocity,
      burnRatio,
      burnStatus,
      // Zero-guilt pool metrics
      committedBills,
      committedSavings,
      discretionaryLimit,
      discretionarySpent,
      zeroGuiltPool,
      zeroGuiltDailyVelocity,
      zeroGuiltUsagePercent,
    };
  }, [budgets]);

  // Open Recalibrate Modal with current limit
  const openRecalibrateModal = () => {
    setRecalibrateLimit(
      pacingMetrics.totalBudget > 0
        ? pacingMetrics.totalBudget.toString()
        : monthlyIncome > 0
        ? monthlyIncome.toString()
        : '12000'
    );
    setShowRecalibrateModal(true);
  };

  // Submit AI Recalibration
  const handleRecalibrateSubmit = async (e) => {
    e.preventDefault();
    const limitNum = parseFloat(recalibrateLimit);
    if (!limitNum || isNaN(limitNum) || limitNum <= 0) {
      toast.error('Please enter a valid monthly limit.');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/budgets/generate-ai', {
        monthly_limit: limitNum,
        total_budget: limitNum,
      });

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      toast.success(res.data.message || `AI Guardrails recalibrated to ${formatINR(limitNum)}!`);
      setShowRecalibrateModal(false);
      loadBudgets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to recalibrate guardrails.');
    } finally {
      setGenerating(false);
    }
  };

  // Submit Individual Category Limit Update
  const handleSaveBudgetUpdate = async (e) => {
    e.preventDefault();
    if (!editingBudget || !newAmountInput) return;
    try {
      await api.put(`/budgets/${editingBudget.id}`, {
        amount: parseFloat(newAmountInput),
      });
      toast.success(
        `Updated ${editingBudget.category_name} ceiling to ${formatINR(parseFloat(newAmountInput))}!`
      );
      setEditingBudget(null);
      setNewAmountInput('');
      loadBudgets();
    } catch (err) {
      toast.error('Failed to update guardrail');
    }
  };

  const openEditCategory = (b) => {
    setEditingBudget(b);
    setNewAmountInput(b.amount.toString());
  };

  // 💡 AI Market Price Lookup — always fresh, no client-side cache
  // 💡 AI Market Price Lookup — always fresh with Indian Category Price Floor enforcement
  const handleMarketLookup = async (itemToLookup = simItem, priceToLookup = simAmount, forceSet = false) => {
    const query = itemToLookup?.trim();
    if (!query) return;

    const currentPrice = parseFloat(priceToLookup || 0);
    setIsEstimatingMarket(true);
    try {
      const res = await api.post('/budgets/market-estimate', { item: query, price: currentPrice });
      if (res.data) {
        setMarketData(res.data);
        const shouldUpdatePrice = forceSet || !simAmount || parseFloat(simAmount) <= 0 || res.data.isBelowFloor;
        if (shouldUpdatePrice && res.data.estimatedPrice) {
          setSimAmount(res.data.estimatedPrice.toString());
        }
        if (res.data.suggestedCategory) {
          setSimCategory(res.data.suggestedCategory);
        }
        if (res.data.isBelowFloor && res.data.floorWarning) {
          toast.info(res.data.floorWarning, { duration: 4000 });
        }
      }
    } catch (err) {
      console.warn('Market lookup error:', err);
    } finally {
      setIsEstimatingMarket(false);
    }
  };

  // 🛡️ Run Multi-Step Pre-Spend Purchase Check
  const handleRunFrictionCheck = async (e, targetStep = 2) => {
    e?.preventDefault();
    let amt = parseFloat(simAmount);
    if (!simItem.trim() || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid item name and purchase amount.');
      return;
    }

    // Category Price Floor Guard: If user entered an unrealistically low price (e.g. ₹11 for bike)
    if (marketData?.isBelowFloor && marketData?.minFloor && amt < marketData.minFloor) {
      const benchmarkPrice = marketData.estimatedPrice || marketData.minFloor;
      toast.info(`Adjusting to realistic market benchmark of ₹${benchmarkPrice.toLocaleString()} for ${simItem.trim()}`);
      amt = benchmarkPrice;
      setSimAmount(benchmarkPrice.toString());
    }

    setSimulating(true);
    try {
      // Always fetch fresh market estimate for the exact item+price the user entered
      const [res, marketRes] = await Promise.all([
        api.post('/budgets/friction-check', {
          item: simItem.trim(),
          amount: amt,
          category: simCategory,
          timelineMonths: parseFloat(targetMonths || 1),
        }),
        api.post('/budgets/market-estimate', { item: simItem.trim(), price: amt }).catch(() => null),
      ]);

      if (res?.data) setSimResult(res.data);
      if (marketRes?.data) setMarketData(marketRes.data);
      setWizardStep(targetStep);
    } catch (err) {
      console.error('Purchase check error:', err);
      toast.error('Failed to evaluate purchase safety.');
    } finally {
      setSimulating(false);
    }
  };

  // ✨ Switch to AI-Recommended Alternative & Live Recalculate
  const handleSwitchAlternative = (alt) => {
    const newPrice = alt.price;
    const newPriceStr = newPrice.toString();
    setSimItem(alt.name);
    setSimAmount(newPriceStr);
    toast.success(`Switched to ${alt.name}! Saves ₹${alt.savings?.toLocaleString()} 🎉`);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // Auto-recalculate friction check with new alternative price and transition to Step 3
    setSimulating(true);
    const frictionPromise = api.post('/budgets/friction-check', {
      item: alt.name,
      amount: newPrice,
      category: simCategory,
      timelineMonths: parseFloat(targetMonths || 1),
    });

    const marketPromise = api.post('/budgets/market-estimate', {
      item: alt.name,
      price: newPrice,
    }).catch(() => null);

    Promise.all([frictionPromise, marketPromise])
      .then(([res, marketRes]) => {
        if (res?.data) {
          setSimResult(res.data);
        }
        if (marketRes?.data) {
          setMarketData(marketRes.data);
        }
        setWizardStep(3);
      })
      .catch((err) => {
        console.error('Error switching alternative:', err);
        setWizardStep(3);
      })
      .finally(() => {
        setSimulating(false);
      });
  };

  const selectSamplePurchase = (sample) => {
    setSimItem(sample.item);
    setSimAmount(sample.amount.toString());
    setSimCategory(sample.category);
    setSimResult(null);
    setWizardStep(1);
    handleMarketLookup(sample.item, sample.amount);
  };

  // 🔄 UNFILTERED DIRECT AI ALTERNATIVES: Trusting backend completely without fake math scaling
  const dynamicAlternatives = useMemo(() => {
    if (!marketData?.alternatives || !Array.isArray(marketData.alternatives)) return [];
    return marketData.alternatives;
  }, [marketData]);

  // 🎯 Dynamic Timeline-Based Evaluation & Goal Trade-Off Calculations
  const dynamicMetrics = useMemo(() => {
    if (!simResult || !simResult.amount) return null;
    const price = parseFloat(simResult.amount || 0);
    const months = parseFloat(targetMonths || 1);
    const isSplit = months > 1;
    const monthlyCost = isSplit ? Math.round(price / months) : price;
    const weeklyCost = Math.round(monthlyCost / 4.3);
    const zeroGuiltPool = parseFloat(simResult.zeroGuiltPool || 0);

    // Remaining safe pool after monthly allocation
    const remainingPool = zeroGuiltPool - monthlyCost;
    const poolImpactPercent = zeroGuiltPool > 0 ? Math.round((monthlyCost / zeroGuiltPool) * 100) : 100;

    // Strict Programmatic Score calculation for chosen timeline
    let score = 1;
    let severity = 'safe';
    let verdict = isSplit ? '100% Safe Goal Pace' : '100% Safe to Buy: Guilt-Free';
    let statusBadge = isSplit ? 'Safe Monthly Flow' : 'Guilt-Free';

    if (zeroGuiltPool <= 0 || monthlyCost > zeroGuiltPool) {
      const overextensionRatio = zeroGuiltPool > 0 ? (monthlyCost / zeroGuiltPool) : (monthlyCost / 1000);
      const hazardScore = Math.round(15 / Math.max(1, overextensionRatio));
      score = Math.max(1, Math.min(15, hazardScore));
      severity = 'critical';
      verdict = isSplit ? 'Exceeds Safe Monthly Buffer' : 'Major Budget Hazard: Exceeds Safe Money';
      statusBadge = 'Severe Overextension';
    } else {
      const poolRemainingRatio = (zeroGuiltPool - monthlyCost) / zeroGuiltPool;
      const computedScore = Math.round(16 + poolRemainingRatio * 82);
      score = Math.max(16, Math.min(99, computedScore));

      if (score >= 70) {
        severity = 'safe';
        verdict = isSplit ? '100% Safe Goal Pace' : '100% Safe to Buy: Guilt-Free';
        statusBadge = isSplit ? 'Safe Monthly Flow' : 'Guilt-Free';
      } else if (score >= 40) {
        severity = 'balanced';
        verdict = isSplit ? 'Comfortable Monthly Pace' : 'Moderate Spend: Looks Good';
        statusBadge = 'Balanced Margin';
      } else {
        severity = 'warning';
        verdict = 'Tight Monthly Margin';
        statusBadge = 'Tight Cashflow';
      }
    }

    // Safety cushion days used (based on daily safe velocity)
    const safeDailyVelocity = simResult.safeDailyVelocity > 0 ? simResult.safeDailyVelocity : (zeroGuiltPool / 30 || 100);
    const cushionDays = parseFloat((monthlyCost / safeDailyVelocity).toFixed(1));

    // Savings timeline impact
    const savingsTimelineWeeks = isSplit
      ? Math.round(months * 4.3)
      : (simResult.savingsDelayWeeks || Math.max(0.5, parseFloat(((price / (simResult.monthlySavingsRate || 3000)) * 4.3).toFixed(1))));
    const savingsTimelineMonths = isSplit
      ? months
      : (simResult.savingsDelayMonths || Math.max(0.1, parseFloat((price / (simResult.monthlySavingsRate || 3000)).toFixed(1))));

    // Dynamic shortfall and category sacrifice adjustments based on live timeline
    const shortfall = Math.max(0, monthlyCost - zeroGuiltPool);
    let categoryCuts = [];
    if (shortfall > 0 && Array.isArray(simResult.categoryCuts) && simResult.categoryCuts.length > 0) {
      let remainingShortfall = shortfall;
      for (const cut of simResult.categoryCuts) {
        if (remainingShortfall <= 0) break;
        const scaledCut = Math.min(cut.cutAmount, remainingShortfall);
        if (scaledCut > 50) {
          categoryCuts.push({
            category: cut.category,
            currentBudget: cut.currentBudget,
            cutAmount: Math.round(scaledCut),
            newBudget: Math.round(cut.currentBudget - scaledCut),
            percentCut: Math.round((scaledCut / cut.currentBudget) * 100),
          });
          remainingShortfall -= scaledCut;
        }
      }
    } else if (shortfall > 0 && Array.isArray(simResult.activeCategories) && simResult.activeCategories.length > 0) {
      let remainingShortfall = shortfall;
      for (const cat of simResult.activeCategories) {
        if (remainingShortfall <= 0) break;
        const maxCut = (cat.amount || 0) * 0.5;
        const scaledCut = Math.min(maxCut, remainingShortfall);
        if (scaledCut > 100) {
          categoryCuts.push({
            category: cat.name,
            currentBudget: Math.round(cat.amount),
            cutAmount: Math.round(scaledCut),
            newBudget: Math.round(cat.amount - scaledCut),
            percentCut: Math.round((scaledCut / cat.amount) * 100),
          });
          remainingShortfall -= scaledCut;
        }
      }
    }

    // Unified Single Target Monthly Savings Goal & Gentle Adjustment (Realistic, non-punitive)
    const gentleTip = isSplit
      ? `Save ${formatINR(monthlyCost)}/mo (≈ ${formatINR(weeklyCost)}/wk) across ${months} months by gently pacing non-essential discretionary spending.`
      : `Allocate ${formatINR(monthlyCost)} upfront from your safe buffer without compromising your core living cushion.`;

    return {
      price,
      months,
      isSplit,
      monthlyCost,
      weeklyCost,
      remainingPool,
      poolImpactPercent,
      score,
      severity,
      verdict,
      statusBadge,
      cushionDays,
      savingsTimelineWeeks,
      savingsTimelineMonths,
      shortfall,
      categoryCuts,
      gentleTip,
    };
  }, [simResult, targetMonths]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 sm:p-8 max-w-7xl mx-auto"
    >
      {/* 1. Header & Telegram Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-bold text-xs tracking-wider uppercase">
            <ShieldCheck size={16} />
            Smart Spending Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            AI Spending Guardrails
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time burn rate velocity, safe spending pool & purchase safety checker.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Telegram Sync Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telegram Sync Active</span>
          </div>

          <button
            onClick={() => loadBudgets(false)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-xs transition"
            title="Refresh Guardrails"
          >
            <RefreshCw size={15} />
          </button>

          {/* Smart Purchase Checker Trigger */}
          <button
            onClick={() => setShowFrictionModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 active:scale-95 transition border border-slate-800"
            title="Smart Purchase Checker & Goal Plan"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Smart Purchase Checker</span>
          </button>

          <button
            onClick={openRecalibrateModal}
            disabled={generating}
            className="premium-btn px-4 py-2 flex items-center gap-2 text-xs font-semibold shadow-md active:scale-95 transition"
          >
            <Sparkles size={15} />
            {generating ? 'Recalibrating...' : 'Recalibrate AI'}
          </button>
        </div>
      </div>

      {/* 2. Top Row: Zero-Guilt Pool Hero Card & Burn-Rate Speedometer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 💎 HERO CARD 1: THE "ZERO-GUILT POOL" METRIC PANEL */}
        <div className="glass-card p-6 sm:p-7 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl relative overflow-hidden rounded-3xl border border-emerald-500/30 flex flex-col justify-between">
          <div className="absolute -right-16 -bottom-16 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={16} />
                Zero-Guilt Pool Available
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold text-emerald-100 border border-white/20">
                100% Safe to Spend
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {formatINR(pacingMetrics.zeroGuiltPool)}
            </div>

            <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
              Safe cash for dining, shopping & fun. Bills & Savings Vault are 100% isolated and protected.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-emerald-500/30 space-y-2">
            <div className="flex justify-between text-xs text-emerald-100 font-medium">
              <span>Discretionary Pool Consumed</span>
              <span>{pacingMetrics.zeroGuiltUsagePercent}%</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pacingMetrics.zeroGuiltUsagePercent}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <div className="flex justify-between text-[11px] text-emerald-200 pt-1">
              <span>Safe Daily Discretionary:</span>
              <strong className="text-white font-bold">{formatINR(pacingMetrics.zeroGuiltDailyVelocity)}/day</strong>
            </div>
          </div>
        </div>

        {/* ⚡ CARD 2: MAIN BURN-RATE SPEEDOMETER (Spans 2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white shadow-xl relative overflow-hidden rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

          {/* Top Spend Row */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge size={14} className="text-primary-400" />
                  Monthly Burn Rate & Pacing
                </div>
                <div
                  onClick={openRecalibrateModal}
                  className="text-3xl sm:text-4xl font-extrabold text-white mt-1 flex items-baseline gap-2 cursor-pointer group"
                  title="Click to recalibrate total monthly limit"
                >
                  <span>{formatINR(pacingMetrics.totalSpent)}</span>
                  <span className="text-base font-normal text-slate-400 group-hover:text-primary-300 transition flex items-center gap-1">
                    / {formatINR(pacingMetrics.totalBudget)} ceiling
                    <Edit3 size={13} className="opacity-0 group-hover:opacity-100 transition text-primary-400" />
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 self-start sm:self-auto ${pacingMetrics.burnStatus.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${pacingMetrics.burnStatus.dotClass}`} />
                <span>{pacingMetrics.burnStatus.label}</span>
              </div>
            </div>

            {/* Benchmark Track Bar */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>
                  Budget Used: <strong>{pacingMetrics.budgetUsagePercent.toFixed(0)}%</strong>
                </span>
                <span>
                  Cycle Day: <strong>{pacingMetrics.currentDay} of {pacingMetrics.daysInMonth} ({pacingMetrics.monthProgressPercent}%)</strong>
                </span>
              </div>

              <div className="relative w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pacingMetrics.budgetUsagePercent)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    pacingMetrics.budgetUsagePercent > 100
                      ? 'bg-rose-500'
                      : pacingMetrics.budgetUsagePercent > pacingMetrics.monthProgressPercent + 10
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                  }`}
                />
                {/* Benchmark Needle */}
                <div
                  style={{ left: `${pacingMetrics.monthProgressPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-sm z-10"
                  title={`Day ${pacingMetrics.currentDay} Target Benchmark`}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                <span>{formatINR(pacingMetrics.remainingBudget)} remaining buffer</span>
                <span>{pacingMetrics.burnStatus.description}</span>
              </div>
            </div>
          </div>

          {/* 4-Column Bottom Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Zap size={11} className="text-amber-400" />
                Daily Burn
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {formatINR(pacingMetrics.currentDailyBurn)}/d
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                Safe Daily Cap
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {formatINR(pacingMetrics.safeDailyVelocity)}/d
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <TrendingUp size={11} className="text-blue-400" />
                Safe Weekly
              </div>
              <div className="text-sm font-bold text-blue-300 mt-0.5">
                {formatINR(pacingMetrics.safeWeeklyVelocity)}/w
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Clock size={11} className="text-teal-400" />
                Runway Left
              </div>
              <div className="text-sm font-bold text-teal-300 mt-0.5">
                {pacingMetrics.daysRemaining} days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Category Guardrails Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Sliders size={14} className="text-primary-600" />
            <span>Category Spending Channels (Click to customize)</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {budgets.length} Active Guardrails
          </span>
        </div>

        {budgets.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500 rounded-3xl">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-bold text-slate-700 text-base">No Guardrails Active for this Month</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Recalibrate AI" to establish automated spending limits!
            </p>
            <button
              onClick={openRecalibrateModal}
              className="mt-4 premium-btn px-5 py-2 text-xs inline-flex items-center gap-2"
            >
              <Sparkles size={14} /> Set Up Monthly Limit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b, i) => {
              const spent = parseFloat(b.spent || 0);
              const limit = parseFloat(b.amount || 0);
              const remaining = limit - spent;
              const usagePercent = limit > 0 ? (spent / limit) * 100 : 0;
              const catSafeDaily = pacingMetrics.daysRemaining > 0 ? Math.max(0, remaining / pacingMetrics.daysRemaining) : 0;
              const isOver = spent > limit;
              const isElevated = usagePercent > pacingMetrics.monthProgressPercent + 15;
              const icon = categoryIcons[b.category_name] || b.icon || '📦';

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openEditCategory(b)}
                  className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-xs hover:border-primary-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group bg-white relative overflow-hidden"
                >
                  <div>
                    {/* Header: Icon + Category + Edit Trigger */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0 border border-slate-200/60 group-hover:scale-105 transition">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-primary-600 transition">
                            {b.category_name}
                          </h4>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {b.is_ai_generated ? 'AI Guardrail' : 'Custom Ceiling'}
                          </div>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition">
                        <Edit3 size={14} />
                      </div>
                    </div>

                    {/* Spend & Limit Row */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                        {formatINR(spent)}
                        <span className="text-xs font-normal text-slate-400 ml-1.5">
                          / {formatINR(limit)}
                        </span>
                      </div>

                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isOver
                          ? 'bg-rose-50 text-rose-700'
                          : isElevated
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {usagePercent.toFixed(0)}%
                      </span>
                    </div>

                    {/* Progress Meter */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, usagePercent)}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${
                          isOver
                            ? 'bg-rose-500'
                            : isElevated
                            ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                            : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Footer Row: Buffer & Velocity */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-slate-500'}`}>
                      {isOver ? `Over by ${formatINR(Math.abs(remaining))}` : `${formatINR(remaining)} left`}
                    </span>
                    <span className="text-slate-400 font-medium">
                      Safe: <strong className="text-slate-700 font-semibold">{formatINR(catSafeDaily)}/d</strong>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Interactive "Recalibrate AI" Modal */}
      <AnimatePresence>
        {showRecalibrateModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !generating) {
                setShowRecalibrateModal(false);
              }
            }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleRecalibrateSubmit}
              className="glass-card p-6 w-full max-w-md space-y-4 bg-white shadow-2xl border border-slate-200 rounded-3xl my-auto max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-primary-100 text-primary-600">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Recalibrate AI Guardrails</h3>
                    <p className="text-[11px] text-slate-500">Auto-distributes limits & recalculates daily burn</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecalibrateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Total Limit Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Total Monthly Spending Ceiling (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="500"
                    placeholder="e.g. 12000"
                    className="input-premium pl-9 text-base font-bold text-slate-900 w-full"
                    value={recalibrateLimit}
                    onChange={(e) => setRecalibrateLimit(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quick Presets
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['8000', '12000', '15000', '20000', '25000', '50000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRecalibrateLimit(preset)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                        recalibrateLimit === preset
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ₹{parseInt(preset).toLocaleString()}
                    </button>
                  ))}
                  {monthlyIncome > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecalibrateLimit(monthlyIncome.toString())}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Match Income (₹{monthlyIncome.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview of Recalculated Velocities */}
              {parseFloat(recalibrateLimit) > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Target Safe Daily Spend:</span>
                    <strong className="text-emerald-700 font-bold">
                      ₹{Math.round(parseFloat(recalibrateLimit) / pacingMetrics.daysInMonth).toLocaleString()}/day
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Target Safe Weekly Runway:</span>
                    <strong className="text-slate-800 font-bold">
                      ₹{Math.round((parseFloat(recalibrateLimit) / pacingMetrics.daysInMonth) * 7).toLocaleString()}/wk
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={generating}
                  className="premium-btn flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} />
                  {generating ? 'Calculating...' : 'Apply & Recalculate'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecalibrateModal(false)}
                  className="btn-secondary flex-1 py-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Interactive Category Limit Adjustment Modal */}
      <AnimatePresence>
        {editingBudget && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditingBudget(null);
              }
            }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveBudgetUpdate}
              className="glass-card p-6 w-full max-w-sm space-y-4 bg-white shadow-2xl border border-slate-200 rounded-3xl my-auto max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-lg border border-slate-200">
                    {categoryIcons[editingBudget.category_name] || '📦'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {editingBudget.category_name} Guardrail
                    </h3>
                    <p className="text-[10px] text-slate-400">Spent so far: {formatINR(parseFloat(editingBudget.spent || 0))}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Monthly Limit Ceiling (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="100"
                    className="input-premium pl-9 text-base font-bold text-slate-900 w-full"
                    value={newAmountInput}
                    onChange={(e) => setNewAmountInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {parseFloat(newAmountInput) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 flex justify-between">
                  <span>New Safe Daily Velocity:</span>
                  <strong className="text-slate-900">
                    ₹{Math.max(0, Math.round((parseFloat(newAmountInput) - parseFloat(editingBudget.spent || 0)) / pacingMetrics.daysRemaining)).toLocaleString()}/day
                  </strong>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button type="submit" className="premium-btn flex-1 py-2.5 text-xs font-semibold">
                  Save Guardrail
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="btn-secondary flex-1 py-2.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Universal Multi-Step Interactive Purchase Assistant Modal */}
      <AnimatePresence>
        {showFrictionModal && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !simulating) {
                setShowFrictionModal(false);
              }
            }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-3xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl overflow-y-auto my-auto max-h-[90vh] transition-all duration-500 border ${
                simulating
                  ? 'border-indigo-500/60 shadow-[0_0_40px_rgba(99,102,241,0.25)]'
                  : 'border-slate-200'
              }`}
            >
              {/* Futuristic Scanning Line */}
              {simulating && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 z-20"
                />
              )}

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300 ${
                    simulating
                      ? 'bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-indigo-500/30 ring-4 ring-indigo-100'
                      : 'bg-gradient-to-br from-primary-600 to-indigo-600'
                  }`}>
                    <Sparkles size={20} className={simulating ? 'animate-pulse text-cyan-200' : ''} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        Smart Purchase Assistant
                      </h3>
                      {simulating && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-[10px] font-bold text-indigo-600 animate-pulse">
                          Evaluating...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Dynamic market intelligence, AI alternatives & guilt-free sacrifice planning.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !simulating && setShowFrictionModal(false)}
                  disabled={simulating}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 🧭 Multi-Step Interactive Wizard Progress Bar */}
              <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-slate-100/90 rounded-2xl">
                {[
                  { step: 1, label: '1. Item & Price', icon: '🛍️' },
                  { step: 2, label: '2. Smart Alternatives', icon: '💡' },
                  { step: 3, label: '3. Timeline & Plan', icon: '🎯' },
                ].map((s) => {
                  const isActive = wizardStep === s.step;
                  const isCompleted = wizardStep > s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      disabled={simulating}
                      onClick={() => {
                        if (s.step === 1 || simResult) {
                          setWizardStep(s.step);
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                          : isCompleted
                          ? 'text-primary-700 hover:bg-white/60'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <span className="text-xs">{s.icon}</span>
                      <span className="hidden sm:inline truncate">{s.label}</span>
                      <span className="sm:hidden">{s.step}</span>
                      {isCompleted && <Check size={13} className="text-emerald-500 shrink-0 ml-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* ⚡ LIVE AI SCANNING CARD (DURING SIMULATION) */}
              <AnimatePresence>
                {simulating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    className="mb-5"
                  >
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 text-white relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl pointer-events-none rounded-full" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 blur-2xl pointer-events-none rounded-full" />

                      <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                          <Sparkles size={22} className="animate-spin text-cyan-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              AI Decision Intelligence
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Step {simLoadingStepIndex + 1} / 4
                            </span>
                          </div>
                          <div className="h-6 overflow-hidden mt-1">
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={simLoadingStepIndex}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.22 }}
                                className="text-sm font-bold text-white tracking-tight"
                              >
                                {SIMULATION_LOADING_STEPS[simLoadingStepIndex]}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Multi-step progress bar */}
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-4 overflow-hidden relative">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-teal-300 rounded-full"
                          initial={{ width: '25%' }}
                          animate={{
                            width:
                              simLoadingStepIndex === 0
                                ? '30%'
                                : simLoadingStepIndex === 1
                                ? '60%'
                                : simLoadingStepIndex === 2
                                ? '85%'
                                : '98%',
                          }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ======================================================= */}
              {/* STEP 1: INPUT & MARKET PRICE LOOKUP                    */}
              {/* ======================================================= */}
              {wizardStep === 1 && !simulating && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <form onSubmit={(e) => handleRunFrictionCheck(e, 2)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-7">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Item or Purchase Name
                          </label>
                          <button
                            type="button"
                            onClick={() => handleMarketLookup(simItem, simAmount, true)}
                            disabled={!simItem.trim() || isEstimatingMarket}
                            className="text-[11px] text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 disabled:opacity-40 transition"
                          >
                            {isEstimatingMarket ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            <span>Auto-Estimate Price</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Sony WH-1000XM5, Zara Coat, Goa Trip, Air Fryer..."
                          className="input-premium w-full text-sm font-medium"
                          value={simItem}
                          onChange={(e) => setSimItem(e.target.value)}
                          onBlur={() => {
                            if (simItem.trim() && (!simAmount || parseFloat(simAmount) <= 0)) {
                              handleMarketLookup(simItem);
                            }
                          }}
                          disabled={simulating}
                          required
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Price (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            placeholder="14900"
                            className="input-premium pl-8 text-sm font-bold w-full"
                            value={simAmount}
                            onChange={(e) => setSimAmount(e.target.value)}
                            disabled={simulating}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* ✨ AI Market Price Suggestion Banner with Category Price Floor Warning */}
                    {marketData && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-2xl border flex flex-col gap-2 text-xs transition-all ${
                          marketData.isBelowFloor
                            ? 'bg-amber-50/90 border-amber-300/80 text-amber-950'
                            : 'bg-indigo-50/80 border-indigo-200/70 text-indigo-950'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{marketData.icon || '🛍️'}</span>
                            <div>
                              <span className="font-bold">AI Market Estimate: </span>
                              <span className={`font-extrabold ${marketData.isBelowFloor ? 'text-amber-800' : 'text-indigo-700'}`}>
                                {formatINR(marketData.estimatedPrice)}
                              </span>
                              {marketData.priceRange && (
                                <span className="text-[11px] text-slate-500 ml-1.5">
                                  (Typical range: {formatINR(marketData.priceRange.min)} – {formatINR(marketData.priceRange.max)})
                                </span>
                              )}
                            </div>
                          </div>
                          {parseFloat(simAmount) !== marketData.estimatedPrice && (
                            <button
                              type="button"
                              onClick={() => {
                                setSimAmount(marketData.estimatedPrice.toString());
                                if (marketData.suggestedCategory) setSimCategory(marketData.suggestedCategory);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-white font-bold text-[11px] transition self-start sm:self-auto shrink-0 shadow-2xs ${
                                marketData.isBelowFloor
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              {marketData.isBelowFloor ? `Use Realistic Price (${formatINR(marketData.estimatedPrice)})` : 'Use Suggested Price'}
                            </button>
                          )}
                        </div>

                        {marketData.floorWarning && (
                          <div className="flex items-start gap-1.5 text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-xl border border-amber-200/70 font-medium">
                            <span className="shrink-0">⚠️</span>
                            <span>{marketData.floorWarning}</span>
                          </div>
                        )}
                      </motion.div>
                    )}


                    {/* Quick Pre-fill Samples */}
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                        Or test instant realistic examples:
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {samplePurchases.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={simulating}
                            onClick={() => selectSamplePurchase(sample)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-[11px] font-medium text-slate-700 border border-slate-200/70 whitespace-nowrap transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span>{sample.icon}</span>
                            <span>{sample.item}</span>
                            <span className="font-bold text-slate-900">({formatINR(sample.amount)})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 1 Action Button */}
                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={simulating || !simItem.trim() || !simAmount || parseFloat(simAmount) <= 0}
                        className="premium-btn py-3 px-6 text-xs font-bold flex items-center gap-2 rounded-2xl shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles size={15} className="text-amber-300" />
                        <span>Analyze & Compare Alternatives</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ======================================================= */}
              {/* STEP 2: SMART COMPARISON & ALTERNATIVES                */}
              {/* ======================================================= */}
              {wizardStep === 2 && !simulating && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-primary-50 border border-indigo-100/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} />
                        Your Selected Item
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                        {simCategory}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{marketData?.icon || '🛍️'}</span>
                          <span>{simItem}</span>
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {marketData?.itemSummary || `Planned purchase of ${simItem} @ ${formatINR(parseFloat(simAmount))}`}
                        </p>
                      </div>
                      <div className="text-xl font-black text-slate-900 self-start sm:self-auto">
                        {formatINR(parseFloat(simAmount))}
                      </div>
                    </div>

                    {marketData?.costPerUse && (
                      <div className="mt-2.5 pt-2.5 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-medium">
                        <span>Cost-Per-Use Utility:</span>
                        <strong className="text-indigo-950 font-bold">{marketData.costPerUse}</strong>
                      </div>
                    )}
                  </div>

                  {/* AI Recommended Alternatives */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-primary-600" />
                        AI Value Comparison & Smarter Alternatives
                      </h4>
                      <span className="text-[10px] text-slate-400">Click any option to switch</span>
                    </div>

                    <div className="space-y-2.5">
                      {dynamicAlternatives && dynamicAlternatives.length > 0 ? (
                        dynamicAlternatives.map((alt, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-slate-900">{alt.name}</span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  {alt.badge || 'Smart Value'}
                                </span>
                                {alt.savings > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-extrabold">
                                    Save {formatINR(alt.savings)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {alt.reason}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                              <div className="text-right">
                                <div className="text-sm font-black text-slate-900">{formatINR(alt.price)}</div>
                                <div className="text-[10px] text-slate-400">real AI price</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSwitchAlternative(alt)}
                                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-primary-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 group-hover:scale-102 cursor-pointer active:scale-95"
                              >
                                <Sparkles size={12} className="text-amber-300" />
                                <span>Switch</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                          Comparing market alternatives for "{simItem}"...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Longevity & Utility Insight */}
                  {marketData?.valueInsight && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-2 text-xs text-emerald-900">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Value Insight: </strong>
                        <span>{marketData.valueInsight}</span>
                      </div>
                    </div>
                  )}

                  {/* Step 2 Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="premium-btn py-2.5 px-5 text-xs font-bold flex items-center gap-2 rounded-2xl shadow-md active:scale-95"
                    >
                      <span>Proceed to Timeline & Plan</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ======================================================= */}
              {/* STEP 3: TIMELINE SELECTION & SACRIFICE PLAN             */}
              {/* ======================================================= */}
              {wizardStep === 3 && !simulating && dynamicMetrics && simResult && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  {/* Verdict & Safety Score Dial */}
                  <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    dynamicMetrics.severity === 'safe'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : dynamicMetrics.severity === 'balanced'
                      ? 'bg-teal-50/80 border-teal-200 text-teal-900'
                      : dynamicMetrics.severity === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                        dynamicMetrics.severity === 'safe'
                          ? 'bg-emerald-100 text-emerald-700'
                          : dynamicMetrics.severity === 'balanced'
                          ? 'bg-teal-100 text-teal-700'
                          : dynamicMetrics.severity === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {dynamicMetrics.severity === 'safe' ? '🟢' : dynamicMetrics.severity === 'balanced' ? '🔵' : dynamicMetrics.severity === 'warning' ? '🟠' : '🔴'}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
                          <span>Purchase Verdict</span>
                          <span className="px-2 py-0.5 rounded-md bg-black/10 text-[10px] font-extrabold">
                            {dynamicMetrics.statusBadge}
                          </span>
                        </div>
                        <div className="text-lg font-black">{dynamicMetrics.verdict}</div>
                      </div>
                    </div>

                    {/* Score Dial with Formula Info Trigger & Tooltip */}
                    <div className="flex items-center gap-3 self-end sm:self-auto relative">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-end gap-1">
                          <span>Purchase Safety Score</span>
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() => setShowFormulaModal(true)}
                              onMouseEnter={() => setShowFormulaTooltip(true)}
                              onMouseLeave={() => setShowFormulaTooltip(false)}
                              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition shadow-2xs"
                              title="Calculation formula & logic"
                            >
                              <Info size={11} />
                            </button>

                            {/* Transparent Tooltip Hover */}
                            <AnimatePresence>
                              {showFormulaTooltip && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                  className="absolute right-0 bottom-6 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-xl z-30 pointer-events-none border border-slate-700"
                                >
                                  <div className="font-bold text-cyan-300 mb-0.5">Transparent Formula:</div>
                                  <div>Score evaluates monthly cost vs your safe discretionary cash buffer. Click icon for full math breakdown.</div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{dynamicMetrics.score} / 100</div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center font-bold text-sm text-slate-800 shadow-xs">
                        {dynamicMetrics.score}%
                      </div>
                    </div>
                  </div>

                  {/* ⏱️ Interactive Timeline Selector Tabs */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-600" />
                        Target Savings Timeline
                      </span>
                      <span className="text-xs font-bold text-indigo-600">
                        {targetMonths === 1 ? '100% Upfront' : `${targetMonths} Months (${formatINR(dynamicMetrics.monthlyCost)}/mo)`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { label: 'Immediate', months: 1, desc: '100% Upfront' },
                        { label: '1 Month', months: 1, desc: 'Next Cycle' },
                        { label: '2.5 Months', months: 2.5, desc: '10 Weeks' },
                        { label: '3 Months', months: 3, desc: 'Quarterly' },
                        { label: '6 Months', months: 6, desc: '6 Parts' },
                      ].map((opt, idx) => {
                        const isSelected = targetMonths === opt.months && (opt.label !== 'Immediate' || targetMonths === 1);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTargetMonths(opt.months)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span className="text-[9px] opacity-75 font-normal">
                              {opt.months === 1
                                ? formatINR(dynamicMetrics.price)
                                : `${formatINR(Math.round(dynamicMetrics.price / opt.months))}/mo`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3 Humanized Telemetry Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Savings Timeline Impact */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Clock size={14} className="text-primary-600" />
                        Target Savings Pace
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {dynamicMetrics.isSplit
                          ? `${dynamicMetrics.months} mos (≈ ${dynamicMetrics.savingsTimelineWeeks} wks)`
                          : dynamicMetrics.savingsTimelineWeeks < 4
                          ? `${dynamicMetrics.savingsTimelineWeeks} weeks`
                          : `${dynamicMetrics.savingsTimelineMonths} months`}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {dynamicMetrics.isSplit
                          ? `Paced across ${dynamicMetrics.savingsTimelineWeeks} weeks with zero vault impact.`
                          : 'Time required to replenish this into your savings buffer.'}
                      </p>
                    </div>

                    {/* 2. Extra Money Status */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                        <Percent size={14} className="text-amber-600" />
                        Safe Extra Cash Status
                      </div>
                      <div className={`text-xl font-black ${
                        dynamicMetrics.remainingPool >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}>
                        {dynamicMetrics.remainingPool >= 0
                          ? `${formatINR(dynamicMetrics.remainingPool)} left`
                          : `${formatINR(Math.abs(dynamicMetrics.remainingPool))} over limit`}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {dynamicMetrics.poolImpactPercent}% of safe extra cash used {dynamicMetrics.isSplit ? 'per month' : ''}.
                      </p>
                    </div>

                    {/* 3. Safety Cushion Cost */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                        <ShieldCheck size={14} className="text-teal-600" />
                        Living Cushion Cost
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {dynamicMetrics.cushionDays} days {dynamicMetrics.isSplit ? '/mo' : ''}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Days of normal living buffer used by this {dynamicMetrics.isSplit ? 'installment' : 'purchase'}.
                      </p>
                    </div>
                  </div>

                  {/* 🎯 DYNAMIC CATEGORY SACRIFICE PLAN (The Complex Calculation UI) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-cyan-400" />
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {dynamicMetrics.categoryCuts && dynamicMetrics.categoryCuts.length > 0 ? 'Dynamic Sacrifice Plan' : 'Target Monthly Savings Goal'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {dynamicMetrics.categoryCuts && dynamicMetrics.categoryCuts.length > 0 
                            ? 'Mathematically calculated category adjustments to fund this purchase.' 
                            : 'Fund this comfortably without touching core bills or savings.'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold self-start sm:self-auto flex items-center gap-1">
                        <ShieldCheck size={12} />
                        100% Protected Vault
                      </span>
                    </div>

                    {/* Show Category Cuts if Shortfall Exists */}
                    {dynamicMetrics.categoryCuts && dynamicMetrics.categoryCuts.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] text-amber-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <AlertTriangle size={13} />
                          Required Adjustments (₹{dynamicMetrics.shortfall?.toLocaleString()}/mo shortfall)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dynamicMetrics.categoryCuts.map((cut, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-white">{cut.category}</div>
                                <div className="text-[10px] text-slate-400">Cut {cut.percentCut}%</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-rose-400">-₹{cut.cutAmount.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">New: ₹{cut.newBudget.toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unified Savings Target Panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] text-cyan-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                            <Clock size={13} />
                            {dynamicMetrics.isSplit ? 'Target Monthly Pace' : 'Upfront Allocation'}
                          </div>
                          <div className="text-2xl font-black text-white mt-1.5">
                            {formatINR(dynamicMetrics.monthlyCost)}
                            <span className="text-xs text-slate-400 font-normal ml-1">
                              {dynamicMetrics.isSplit ? '/ month' : ' upfront'}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-2 pt-2 border-t border-white/10">
                          {dynamicMetrics.isSplit ? (
                            <>≈ <strong className="text-cyan-300">{formatINR(dynamicMetrics.weeklyCost)}/week</strong> over <strong>{dynamicMetrics.months} months</strong></>
                          ) : (
                            <>One-time purchase from your safe discretionary spending buffer</>
                          )}
                        </div>
                      </div>

                      {/* AI Coach Advice */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                            <Sparkles size={13} />
                            AI Coach Insight
                          </div>
                          <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                            {simResult.psychologyAdvice || dynamicMetrics.gentleTip}
                          </p>
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          {simResult.alternativeAction || 'Zero impact on rent, utility bills, or emergency savings.'}
                        </div>
                      </div>
                    </div>

                    {/* 100% Protected Vault Guarantee Badge */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <ShieldCheck size={15} />
                        <span>Essential Bills, Rent & Savings Vault:</span>
                      </div>
                      <strong className="text-emerald-400 font-bold">₹0 Touched (100% Protected)</strong>
                    </div>
                  </div>

                  {/* Step 3 Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ArrowLeft size={14} />
                      <span>Adjust Alternatives & Prices</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFrictionModal(false)}
                      className="premium-btn py-2.5 px-5 text-xs font-bold rounded-2xl shadow-md active:scale-95"
                    >
                      <span>Done & Apply Plan</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📐 FORMULA INFO & TRANSPARENCY MODAL */}
      <AnimatePresence>
        {showFormulaModal && (
          <div
            className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowFormulaModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                  <Calculator size={18} />
                  <span>Purchase Safety Formula</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Close Formula"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 text-cyan-300 font-mono text-xs border border-indigo-500/30 text-center shadow-inner">
                <code>Score = 16 + ((Safe Extra Cash - Monthly Cost) / Safe Extra Cash) × 82</code>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <div>
                    <strong className="text-slate-900">Monthly Cost Allocation: </strong>
                    Purchase price divided by your chosen timeline (e.g. ₹20,000 / 2.5 mos = ₹8,000/mo). Immediate = 100% upfront.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <div>
                    <strong className="text-slate-900">Safe Extra Cash (Zero-Guilt Pool): </strong>
                    Safe discretionary cash remaining after fully securing essential bills, rent, and savings vault.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <div>
                    <strong className="text-slate-900">Overextension Protection: </strong>
                    If the monthly cost exceeds your available safe cash, the score is strictly clamped between <strong>1 and 15</strong> (Critical Hazard) to protect against debt.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 font-medium">
                  🟢 <strong>70–100</strong>: Guilt-Free (Healthy buffer)
                </div>
                <div className="p-2 rounded-xl bg-teal-50 text-teal-800 font-medium">
                  🔵 <strong>40–69</strong>: Balanced Spend
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-800 font-medium">
                  🟠 <strong>16–39</strong>: Tight Margin
                </div>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800 font-medium">
                  🔴 <strong>1–15</strong>: Severe Hazard
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}