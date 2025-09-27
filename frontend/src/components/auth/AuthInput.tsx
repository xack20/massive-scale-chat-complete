import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({ label, error, className = '', ...rest }) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
};

export default AuthInput;
