// Deadline-aware goal projection (replaces the old hardcoded "progress bucket" guess).
//
// monthlySaving = the share of the user's average monthly savings that is
// available for this goal (callers split total savings across unfinished goals).

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;
const inr = n => `₹${Math.ceil(n).toLocaleString('en-IN')}`;

export const projectGoal = ({ target, current, deadline, monthlySaving = 0, now = new Date() }) => {
  const remaining = Math.max(0, target - current);

  if (target > 0 && remaining === 0) {
    return {
      monthsLeft: null, requiredMonthly: 0, likelihood: 100,
      suggestion: 'Goal achieved! Consider allocating funds to investments.',
    };
  }

  if (!deadline) {
    const eta = monthlySaving > 0 ? Math.ceil(remaining / monthlySaving) : null;
    return {
      monthsLeft: null, requiredMonthly: null, likelihood: null,
      suggestion: eta
        ? `No deadline set. At your current pace you'd finish in about ${eta} month${eta === 1 ? '' : 's'}.`
        : 'Set a deadline to get a monthly deposit plan.',
    };
  }

  const monthsLeft = (new Date(deadline) - now) / MS_PER_MONTH;
  if (monthsLeft <= 0) {
    return {
      monthsLeft: 0, requiredMonthly: remaining, likelihood: 0,
      suggestion: `Deadline passed with ${inr(remaining)} still to go. Extend the deadline or deposit now.`,
    };
  }

  const requiredMonthly = remaining / Math.max(1, Math.ceil(monthsLeft));
  const ratio = monthlySaving > 0 ? monthlySaving / requiredMonthly : 0;
  const likelihood = Math.max(5, Math.min(99, Math.round(ratio * 100)));

  return {
    monthsLeft: Math.ceil(monthsLeft),
    requiredMonthly: Math.ceil(requiredMonthly),
    likelihood,
    suggestion: `Deposit ${inr(requiredMonthly)} per month to hit your deadline.`,
  };
};
