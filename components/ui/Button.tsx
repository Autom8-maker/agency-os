'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
    ghost:
      'bg-transparent hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-zinc-50',
    outline:
      'bg-transparent border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-50',
    danger:
      'bg-transparent border border-red-800 hover:bg-red-950 active:bg-red-900 text-red-400 hover:text-red-300',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 h-7',
    md: 'text-sm px-4 py-2 h-9',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <>
          <span
            className="spinner"
            style={{ width: size === 'sm' ? 12 : 14, height: size === 'sm' ? 12 : 14 }}
          />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
