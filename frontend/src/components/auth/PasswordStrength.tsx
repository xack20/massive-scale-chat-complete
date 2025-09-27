import React from 'react';

interface Props {
  password: string;
}

function scorePassword(pw: string) {
  let score = 0;
  if (!pw) return score;
  const variations = {
    digits: /\d/.test(pw),
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw)
  };
  score += Object.values(variations).filter(Boolean).length * 12;
  if (pw.length >= 16) score += 18;
  else if (pw.length >= 12) score += 12;
  else if (pw.length >= 8) score += 6;
  if (/([A-Za-z0-9])\1{2,}/.test(pw)) score -= 10;
  if (/(?:password|1234|qwerty|letmein)/i.test(pw)) score = 5;
  return Math.max(0, Math.min(72, score));
}

const STRENGTH_STEPS = [
  { min: 0, label: 'Very weak', gradient: 'from-rose-500/80 via-rose-400/70 to-amber-400/70', badge: 'text-rose-200' },
  { min: 20, label: 'Getting there', gradient: 'from-amber-400/80 via-amber-300/70 to-lime-300/70', badge: 'text-amber-100' },
  { min: 36, label: 'Secure', gradient: 'from-emerald-400/80 via-emerald-300/70 to-teal-300/70', badge: 'text-emerald-100' },
  { min: 54, label: 'Bulletproof', gradient: 'from-blue-400/80 via-indigo-400/80 to-purple-400/80', badge: 'text-indigo-100' }
];

export const PasswordStrength: React.FC<Props> = ({ password }) => {
  const score = scorePassword(password);
  const percent = password ? Math.min(100, Math.round((score / 72) * 100)) : 0;
  const tier = [...STRENGTH_STEPS].reverse().find(step => percent >= step.min) ?? STRENGTH_STEPS[0];
  const suggestions: string[] = [];

  if (password && password.length < 12) suggestions.push('Use at least 12 characters');
  if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) suggestions.push('Include numbers');
  if (!/[^A-Za-z0-9]/.test(password)) suggestions.push('Sprinkle special characters');

  return (
    <div
      className="soft-card space-y-3 border-white/15 bg-white/5 px-4 py-4 text-white/80"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
        <span>Password strength</span>
        <span className={`font-semibold ${tier.badge}`}>{tier.label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tier.gradient}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="space-y-1 text-xs text-white/60">
          {suggestions.slice(0, 2).map(hint => (
            <li key={hint} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-white/40" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrength;
