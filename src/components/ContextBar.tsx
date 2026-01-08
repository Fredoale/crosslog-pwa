import React from 'react';

interface ContextBarProps {
  icon: string;
  title: string;
  subtitle?: string;
  color?: 'blue' | 'purple' | 'orange' | 'indigo' | 'green';
}

export const ContextBar: React.FC<ContextBarProps> = ({
  icon,
  title,
  subtitle,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} text-white py-3 px-6 shadow-md`}>
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
