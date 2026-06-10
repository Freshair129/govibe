import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel = 'vs last month',
  iconBg = 'bg-indigo-100',
  iconColor = 'text-indigo-600',
  className = '',
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change == null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
        </div>
        {change != null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isNeutral ? 'text-gray-400' : isPositive ? 'text-green-600' : 'text-red-500'
          }`}>
            {isNeutral ? <Minus className="h-3.5 w-3.5" /> : isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {changeLabel && change != null && (
        <p className="text-xs text-gray-400 mt-0.5">{changeLabel}</p>
      )}
    </div>
  );
}
