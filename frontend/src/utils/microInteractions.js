// Micro-interactions utilities for BSI Telemetry Reporting System
import { useState, useEffect, useCallback } from 'react';

// Sound effects for interactions (optional)
export const playSound = (soundType) => {
  if (typeof window !== 'undefined' && window.AudioContext) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (soundType) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        break;
      case 'success':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.15;
        break;
      case 'error':
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.1;
        break;
      case 'hover':
        oscillator.frequency.value = 1000;
        gainNode.gain.value = 0.05;
        break;
      default:
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
    }
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }
};

// Haptic feedback for mobile devices
export const triggerHaptic = (type = 'light') => {
  if (navigator.vibrate) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate([30, 10, 30]);
        break;
      case 'success':
        navigator.vibrate([10, 50, 10]);
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30, 50]);
        break;
      default:
        navigator.vibrate(10);
    }
  }
};

// Cursor trail effect
export const createCursorTrail = () => {
  if (typeof document === 'undefined') return;
  
  let trail = [];
  const maxTrailLength = 20;
  
  const handleMouseMove = (e) => {
    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = '9999';
    dot.style.left = e.clientX - 4 + 'px';
    dot.style.top = e.clientY - 4 + 'px';
    dot.style.opacity = '0.6';
    dot.style.transition = 'opacity 0.5s, transform 0.5s';
    
    document.body.appendChild(dot);
    trail.push(dot);
    
    if (trail.length > maxTrailLength) {
      const oldDot = trail.shift();
      oldDot.style.opacity = '0';
      oldDot.style.transform = 'scale(0)';
      setTimeout(() => oldDot.remove(), 500);
    }
    
    // Fade out trail dots
    setTimeout(() => {
      dot.style.opacity = '0';
      dot.style.transform = 'scale(0)';
    }, 100);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    trail.forEach(dot => dot.remove());
  };
};

// Particle effect for celebrations
export const createParticleEffect = (x, y, color = '#667eea') => {
  if (typeof document === 'undefined') return;
  
  const particleCount = 30;
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = '6px';
    particle.style.height = '6px';
    particle.style.borderRadius = '50%';
    particle.style.background = color;
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 5 + Math.random() * 5;
    const lifetime = 1000 + Math.random() * 1000;
    
    document.body.appendChild(particle);
    particles.push(particle);
    
    let opacity = 1;
    let currentX = x;
    let currentY = y;
    let velocityY = -Math.sin(angle) * velocity;
    let velocityX = Math.cos(angle) * velocity;
    
    const animate = () => {
      velocityY += 0.2; // gravity
      currentX += velocityX;
      currentY += velocityY;
      opacity -= 0.02;
      
      particle.style.left = currentX + 'px';
      particle.style.top = currentY + 'px';
      particle.style.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }
};

// Ripple effect for buttons
export const createRipple = (event, element) => {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
};

// Typing effect for text
export const useTypingEffect = (text, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(prev => prev + text[currentIndex]);
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return { displayText, isComplete };
};

// Countdown timer with visual feedback
export const useCountdown = (targetDate, onComplete) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate - new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    };
    
    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    
    return () => clearInterval(timer);
  }, [targetDate, onComplete]);
  
  return { timeLeft, isComplete };
};

// Magnetic effect for buttons
export const useMagneticEffect = (element) => {
  useEffect(() => {
    if (!element) return;
    
    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * 0.2;
      const deltaY = (e.clientY - centerY) * 0.2;
      
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };
    
    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
    };
    
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [element]);
};

// Parallax scrolling effect
export const useParallax = (speed = 0.5) => {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset * speed);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);
  
  return offset;
};

// Intersection observer for scroll animations
export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);
    
    observer.observe(ref);
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return [setRef, isVisible];
};

// Loading skeleton animation
export const SkeletonLoader = ({ width, height, className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: width || '100%',
      height: height || '20px',
      borderRadius: '4px'
    }}
  />
);

// Progress ring component
export const ProgressRing = ({ progress, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e0e0e0"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#gradient)"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.5s ease'
        }}
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Custom hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      
      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const parts = shortcut.toLowerCase().split('+');
        const requiredCtrl = parts.includes('ctrl');
        const requiredShift = parts.includes('shift');
        const requiredAlt = parts.includes('alt');
        const requiredKey = parts.find(p => !['ctrl', 'shift', 'alt'].includes(p));
        
        if (
          ctrl === requiredCtrl &&
          shift === requiredShift &&
          alt === requiredAlt &&
          key === requiredKey
        ) {
          e.preventDefault();
          callback();
        }
      });
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Local storage with auto-save
export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);
  
  return [value, setStoredValue];
};

// Debounce hook for search inputs
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Copy to clipboard with feedback
export const copyToClipboard = async (text, onSuccess, onError) => {
  try {
    await navigator.clipboard.writeText(text);
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    if (onError) onError(error);
    return false;
  }
};

// Theme switcher with smooth transitions
export const useThemeSwitcher = () => {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme, setTheme]);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return { theme, toggleTheme };
};
