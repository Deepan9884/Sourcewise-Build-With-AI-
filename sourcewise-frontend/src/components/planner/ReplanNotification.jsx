import { motion, AnimatePresence } from 'framer-motion'

/**
 * ReplanNotification — wax-seal toast for auto/manual replans.
 */
export default function ReplanNotification({ notification, onDismiss, onReview }) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="p-4 rounded-2xl bg-[#FFF7ED] border border-amber-200 flex items-center gap-3 shadow-sm"
          role="status"
        >
          <motion.span
            initial={{ rotate: -18, scale: 0.6 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8845F] to-[#C05A35] text-white flex items-center justify-center text-lg shrink-0 shadow"
          >
            🔄
          </motion.span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1E1B16]">{notification.title}</p>
            <p className="text-xs text-[#5B544E] truncate">{notification.body}</p>
          </div>
          {onReview && (
            <button onClick={onReview} className="text-xs font-bold text-[#C05A35] hover:underline shrink-0">
              Review
            </button>
          )}
          <button onClick={onDismiss} className="text-xs text-[#8A817B] hover:text-[#1E1B16] shrink-0 px-1" aria-label="Dismiss notification">✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
