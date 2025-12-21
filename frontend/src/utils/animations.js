// Animation utilities for BSI Telemetry Reporting System
import { motion } from 'framer-motion';

// Common animation variants
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.6
};

// Card animations
export const cardVariants = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  hover: { 
    scale: 1.05, 
    y: -8,
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
};

// Staggered container animations
export const staggerContainer = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Item animations for staggered lists
export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
};

// Slide animations
export const slideInFromLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 }
};

export const slideInFromTop = {
  initial: { opacity: 0, y: -50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 }
};

export const slideInFromBottom = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 }
};

// Scale animations
export const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 }
};

// Fade animations
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

// Button hover animations
export const buttonHover = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 17 }
};

// Icon animations
export const iconRotate = {
  whileHover: { rotate: 360 },
  transition: { duration: 0.6 }
};

export const iconPulse = {
  animate: { scale: [1, 1.2, 1] },
  transition: { duration: 2, repeat: Infinity }
};

// Loading animations
export const loadingSpinner = {
  animate: { rotate: 360 },
  transition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
};

export const loadingPulse = {
  animate: { opacity: [0.4, 1, 0.4] },
  transition: { duration: 1.5, repeat: Infinity }
};

// Status indicator animations
export const statusOnline = {
  animate: { 
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1]
  },
  transition: { duration: 2, repeat: Infinity }
};

export const statusWarning = {
  animate: { 
    scale: [1, 1.1, 1],
    opacity: [1, 0.6, 1]
  },
  transition: { duration: 1, repeat: Infinity }
};

export const statusError = {
  animate: { 
    scale: [1, 1.15, 1],
    opacity: [1, 0.5, 1]
  },
  transition: { duration: 0.5, repeat: Infinity }
};

// Map marker animations
export const markerPulse = {
  animate: { 
    scale: [1, 1.3, 1],
    opacity: [1, 0.7, 1]
  },
  transition: { duration: 2, repeat: Infinity }
};

// Chart animations
export const chartEntry = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { 
    pathLength: 1, 
    opacity: 1,
    transition: { duration: 1.5, ease: 'easeInOut' }
  }
};

// Notification animations
export const notificationSlide = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 300, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 30 }
};

// Modal animations
export const modalScale = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { type: 'spring', stiffness: 300, damping: 30 }
};

// Tooltip animations
export const tooltipFade = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.2 }
};

// List item animations
export const listItemSlide = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3 }
};

// Progress bar animations
export const progressGrow = {
  initial: { width: 0 },
  animate: { width: '100%' },
  transition: { duration: 1, ease: 'easeOut' }
};

// Custom hooks for animations
export const usePageAnimation = () => {
  return {
    initial: 'initial',
    animate: 'in',
    exit: 'out',
    variants: pageVariants,
    transition: pageTransition
  };
};

export const useCardAnimation = (index = 0) => {
  return {
    initial: 'initial',
    animate: 'animate',
    whileHover: 'hover',
    whileTap: 'tap',
    variants: cardVariants,
    transition: { delay: index * 0.1 }
  };
};

// Spring animation configurations
export const springConfig = {
  type: 'spring',
  stiffness: 100,
  damping: 10
};

export const gentleSpring = {
  type: 'spring',
  stiffness: 50,
  damping: 15
};

export const bouncySpring = {
  type: 'spring',
  stiffness: 300,
  damping: 5
};

// Easing functions
export const easing = {
  easeInOut: 'easeInOut',
  easeOut: 'easeOut',
  easeIn: 'easeIn',
  anticipate: 'anticipate'
};

// Duration presets
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  extraSlow: 1
};

// Animation presets for common use cases
export const presets = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durations.normal }
  },
  
  // Card hover
  cardHover: {
    whileHover: { 
      scale: 1.02,
      y: -4,
      boxShadow: '0 12px 40px rgba(102, 126, 234, 0.15)'
    },
    transition: { duration: durations.fast }
  },
  
  // Button interactions
  buttonPress: {
    whileTap: { scale: 0.98 },
    transition: { duration: durations.fast }
  },
  
  // Loading states
  loading: {
    animate: { rotate: 360 },
    transition: { 
      duration: 1.5, 
      repeat: Infinity, 
      ease: 'linear' 
    }
  },
  
  // Status indicators
  statusIndicator: {
    animate: { 
      scale: [1, 1.2, 1],
      opacity: [1, 0.7, 1]
    },
    transition: { 
      duration: 2, 
      repeat: Infinity 
    }
  }
};

// Helper function to create staggered animations
export const createStaggeredAnimation = (delay = 0.1) => ({
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
});

// Helper function to create hover animations
export const createHoverAnimation = (scale = 1.05, y = -4) => ({
  whileHover: { scale, y },
  transition: { duration: durations.fast }
});

// Animation component wrapper
export const AnimatedContainer = ({ children, variants = pageVariants, ...props }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={variants}
    transition={pageTransition}
    {...props}
  >
    {children}
  </motion.div>
);

// Higher-order component for adding animations
export const withAnimation = (Component, animationProps = {}) => {
  return function AnimatedComponent(props) {
    return (
      <motion.div {...animationProps}>
        <Component {...props} />
      </motion.div>
    );
  };
};
