// Reusable animated loading skeleton components

export function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-md ${width} ${height} ${className}`} />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 animate-pulse ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonAvatar({ size = 'h-10 w-10', className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-full ${size} shrink-0 ${className}`} />
  );
}

export function SkeletonStatCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 animate-pulse ${className}`}>
      <div className="flex justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
        <div className="h-5 w-16 bg-gray-200 rounded" />
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-32 bg-gray-200 rounded" />
    </div>
  );
}

// Default export: generic block skeleton
export default function LoadingSkeleton({
  rows = 3,
  className = '',
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className={`h-4 bg-gray-200 rounded ${i % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
          {i % 3 === 0 && <div className="h-3 bg-gray-200 rounded w-2/3" />}
        </div>
      ))}
    </div>
  );
}
