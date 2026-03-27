import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'default' | 'indigo' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    blue: 'bg-blue-950 text-blue-400 border-blue-800',
    green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    amber: 'bg-amber-950 text-amber-400 border-amber-800',
    red: 'bg-red-950 text-red-400 border-red-800',
    indigo: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    purple: 'bg-purple-950 text-purple-400 border-purple-800',
  };

  const dotColors = {
    default: 'bg-zinc-500',
    blue: 'bg-blue-400',
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    indigo: 'bg-indigo-400',
    purple: 'bg-purple-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-md font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'running' | 'done' | 'error' | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    pending: { variant: 'default', label: 'Pending' },
    running: { variant: 'amber', label: 'Running' },
    done: { variant: 'green', label: 'Done' },
    error: { variant: 'red', label: 'Error' },
  };

  const { variant, label } = config[status] || { variant: 'default', label: status };

  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
