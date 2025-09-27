import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? rest.name ?? generatedId;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-widest text-white/70"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/90 shadow-inner shadow-white/5 transition',
            'placeholder:text-white/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none',
            'hover:border-white/35 backdrop-blur-md',
            error && 'border-rose-400/80 focus:border-rose-400 focus:ring-rose-400/30',
            className
          )}
          {...rest}
        />
        {error ? (
          <p className="text-xs font-medium text-rose-300" role="alert">
            {error}
          </p>
        ) : (
          hint && <p className="text-xs text-white/60">{hint}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;
