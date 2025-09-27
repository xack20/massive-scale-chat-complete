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
  score += Object.values(variations).filter(Boolean).length * 10;
  if (pw.length >= 12) score += 20; else if (pw.length >= 8) score += 10;
  if (pw.length >= 16) score += 10;
  if (/([A-Za-z0-9])\1{2,}/.test(pw)) score -= 10; // penalty for repeats
  return Math.max(0, Math.min(60, score));
}

export const PasswordStrength: React.FC<Props> = ({ password }) => {
  const score = scorePassword(password);
  const percent = (score / 60) * 100;
  let color = 'bg-red-500';
  let label = 'Weak';
  if (percent >= 66) { color = 'bg-green-600'; label = 'Strong'; }
  else if (percent >= 40) { color = 'bg-yellow-500'; label = 'Medium'; }
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-2 w-full bg-gray-200 rounded">
        <div className={`h-2 rounded ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-gray-600">Password strength: {label}</p>
    </div>
  );
};

export default PasswordStrength;
