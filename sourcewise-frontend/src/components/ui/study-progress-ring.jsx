import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

const StudyProgressRing = ({ 
  progress = 0, 
  size = 120, 
  strokeWidth = 8, 
  label, 
  showPercentage = true,
  className 
}) => {
  const [currentProgress, setCurrentProgress] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (currentProgress / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentProgress(progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1ECE6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#swCoralGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 2px 6px rgba(232, 132, 95, 0.45))',
          }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="swCoralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8845F" />
            <stop offset="100%" stopColor="#D96F4A" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-2xl font-extrabold tabular-nums text-[#1E1B16]">
            {Math.round(currentProgress)}%
          </span>
        )}
        {label && (
          <span className="text-xs font-medium text-[#6B625C] mt-1">{label}</span>
        )}
      </div>
    </div>
  )
}

export { StudyProgressRing }
