import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

const ICON_SIZE = 56 // w-14 h-14 = 56px
const MARGIN_BOTTOM = 24
const MARGIN_RIGHT = 24

/**
 * FloatingFoxCompanion — Draggable AI Mascot with smart magnetic corner snapping.
 * - Freely draggable across the screen.
 * - When dropped (even in the center), it magnetically glides with spring physics to the nearest corner.
 * - Prevents accidental chat opening during drag operations.
 * - Respects the left navigation sidebar when snapping to left corners.
 */
export default function FloatingFoxCompanion({ onClick, activeCount = 0 }) {
  const controls = useAnimation()
  const [currentCorner, setCurrentCorner] = useState('bottom-right')
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const activeCornerRef = useRef('bottom-right')

  const getLeftMargin = useCallback(() => {
    if (typeof window === 'undefined') return 24
    // Respect sidebar when on desktop
    return window.innerWidth >= 768 ? 96 : 24
  }, [])

  const calculateCornerOffsets = useCallback((corner) => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    const leftMargin = getLeftMargin()
    const maxShiftX = -(window.innerWidth - leftMargin - MARGIN_RIGHT - ICON_SIZE)
    const maxShiftY = -(window.innerHeight - MARGIN_BOTTOM - 24 - ICON_SIZE)

    switch (corner) {
      case 'top-left':
        return { x: maxShiftX, y: maxShiftY }
      case 'top-right':
        return { x: 0, y: maxShiftY }
      case 'bottom-left':
        return { x: maxShiftX, y: 0 }
      case 'bottom-right':
      default:
        return { x: 0, y: 0 }
    }
  }, [getLeftMargin])

  const snapToCorner = useCallback((corner) => {
    activeCornerRef.current = corner
    setCurrentCorner(corner)
    const { x, y } = calculateCornerOffsets(corner)
    controls.start({
      x,
      y,
      transition: {
        type: 'spring',
        stiffness: 380,
        damping: 26,
        mass: 0.8,
      },
    })
  }, [calculateCornerOffsets, controls])

  // Handle window resizing to keep icon firmly within the current corner
  useEffect(() => {
    const handleResize = () => {
      snapToCorner(activeCornerRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [snapToCorner])

  const handleDragStart = () => {
    isDraggingRef.current = true
    setIsDragging(true)
  }

  const handleDragEnd = (event, info) => {
    setIsDragging(false)
    // Small delay before clearing drag flag to prevent click event trigger
    setTimeout(() => {
      isDraggingRef.current = false
    }, 80)

    const clientX = info.point.x
    const clientY = info.point.y
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Determine nearest quadrant/corner based on drop point
    const isLeft = clientX < windowWidth / 2
    const isTop = clientY < windowHeight / 2

    let targetCorner = 'bottom-right'
    if (isTop && isLeft) targetCorner = 'top-left'
    else if (isTop && !isLeft) targetCorner = 'top-right'
    else if (!isTop && isLeft) targetCorner = 'bottom-left'
    else targetCorner = 'bottom-right'

    snapToCorner(targetCorner)
  }

  const handleTap = () => {
    if (isDraggingRef.current) return
    onClick?.()
  }

  const isLeft = currentCorner.includes('left')
  const isTop = currentCorner.includes('top')

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        animate={controls}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.15, cursor: 'grabbing' }}
        className="relative group cursor-grab active:cursor-grabbing touch-none"
      >
        {/* Dynamic Hover Tooltip (adapts based on whether icon is on left or right) */}
        {!isDragging && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink text-white text-xs font-semibold shadow-xl whitespace-nowrap border border-white/10 backdrop-blur-md z-50 ${
              isLeft
                ? 'left-full ml-3.5 -translate-x-1 group-hover:translate-x-0'
                : 'right-full mr-3.5 translate-x-1 group-hover:translate-x-0'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-coral fill-coral/15" />
            <span>Ask Fox Companion</span>
          </div>
        )}

        {/* Ambient Pulsing Glow Aura */}
        <div
          aria-hidden
          className={`absolute -inset-1 rounded-full bg-gradient-to-r from-coral via-[#FF9E79] to-coral opacity-60 blur-md transition-all duration-300 pointer-events-none ${
            isDragging ? 'opacity-90 blur-xl scale-125' : 'group-hover:opacity-90 group-hover:blur-lg animate-pulse'
          }`}
        />

        {/* Main Floating Orb Button */}
        <motion.button
          type="button"
          onClick={handleTap}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          animate={
            isDragging
              ? { y: 0 }
              : {
                  y: [0, -5, 0],
                }
          }
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 0.18 },
          }}
          aria-label="Open Fox Study Chat Companion"
          title="Open Fox Study Chat Companion"
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#C05A35] via-[#E8845F] to-[#FFA07A] p-[2.5px] shadow-[0_10px_28px_-6px_rgba(232,132,95,0.5)] flex items-center justify-center outline-none focus:ring-4 focus:ring-coral/30 cursor-grab active:cursor-grabbing"
        >
          {/* Inner Surface */}
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative overflow-hidden transition-colors group-hover:bg-[#FFF8F5]">
            {/* Mascot Image */}
            <img
              src="/logo-mark.png"
              alt="Fox Companion"
              draggable="false"
              className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-115 drop-shadow-xs pointer-events-none select-none"
            />
          </div>

          {/* Online Active Beacon */}
          <span
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white shadow-xs animate-pulse pointer-events-none"
            title="Fox Companion Online"
          />

          {/* Context Badge (active sources count) */}
          {activeCount > 0 && (
            <span
              className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-full bg-ink text-white text-[9px] font-extrabold shadow-sm ring-1 ring-white/60 leading-none pointer-events-none"
              title={`${activeCount} source${activeCount === 1 ? '' : 's'} in AI context`}
            >
              {activeCount}
            </span>
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}
