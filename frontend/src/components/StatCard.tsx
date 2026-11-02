import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  color = 'blue'
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-[#1E88E5]',
    green: 'bg-green-50 text-[#43A047]',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#757575] mb-1">{title}</p>
          <p className="text-3xl font-semibold text-[#212121] mb-2">
            {value}
          </p>

          {trend && (
            <p
              className={`text-xs font-medium ${
                trendUp ? 'text-[#43A047]' : 'text-red-600'
              }`}
            >
              {trendUp ? '▲' : '▼'} {trend}
            </p>
          )}
        </div>

        <div
          className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}