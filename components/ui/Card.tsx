import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPad?: boolean;
}

export function Card({ children, className = '', title, subtitle, action, noPad }: CardProps) {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-xl ${noPad ? '' : 'p-4'} ${className}`}
    >
      {(title || action) && (
        <div className={`flex items-start justify-between gap-2 ${noPad ? 'px-4 pt-4' : 'mb-3'}`}>
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {noPad && (title || action) ? (
        <div className="px-4 pb-4">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

interface CardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

export function CardGrid({ children, cols = 2, className = '' }: CardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return <div className={`grid ${gridCols[cols]} gap-3 ${className}`}>{children}</div>;
}

interface CardItemProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export function CardItem({ label, value, sub, accent }: CardItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-medium ${accent ? 'text-indigo-400' : 'text-zinc-100'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  );
}
