/**
 * Shared Framer Motion variants for the planner codex.
 * All components consume these so motion feels consistent.
 */
export const EASE = [0.16, 1, 0.3, 1]

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
}

export const pageStep = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
}

export const staggerParent = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
}

export const staggerChild = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export const cardHover = {
  whileHover: { y: -3 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

export const transitionSpring = { type: 'spring', stiffness: 350, damping: 30 }
export const transitionSmooth = { duration: 0.45, ease: EASE }
