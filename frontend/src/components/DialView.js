import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * DialView - A gauge/dial component for displaying metric values
 * Shows current value with color-coded zones (green/yellow/red)
 */
const DialView = ({ 
  value, 
  title, 
  unit = '', 
  min = 0, 
  max = 100,
  thresholds = {
    warning: 70,  // Above this = yellow/orange
    critical: 90  // Above this = red
  },
  color = null, // Custom color override
  isLoading = false 
}) => {
  const theme = useTheme();

  // Normalize value to 0-100 range for the gauge
  const normalizedValue = useMemo(() => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    const numValue = Number(value);
    if (numValue < min) return 0;
    if (numValue > max) return 100;
    return ((numValue - min) / (max - min)) * 100;
  }, [value, min, max]);

  // Determine color based on thresholds
  const gaugeColor = useMemo(() => {
    if (color) return color;
    if (normalizedValue >= thresholds.critical) return '#D92A00'; // Red
    if (normalizedValue >= thresholds.warning) return '#CF8700'; // Orange
    return '#1FC700'; // Green
  }, [normalizedValue, thresholds, color]);

  // Format value for display
  const displayValue = useMemo(() => {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const num = Number(value);
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    if (num < 10) return num.toFixed(2);
    if (num < 100) return num.toFixed(1);
    return num.toFixed(0);
  }, [value]);

  // Calculate SVG arc path
  const radius = 80;
  const strokeWidth = 12;
  const centerX = 100;
  const centerY = 100;
  
  // Background arc (gray track) - 270° arc from 8:00 to 10:00
  const backgroundArc = describeArc(centerX, centerY, radius, -120, 150);
  
  // Value arc (colored) - full 270° arc, pathLength controls how much is shown
  const valueArc = describeArc(centerX, centerY, radius, -120, 150);

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        minHeight: 200 
      }}>
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      {/* Title */}
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          color: 'text.primary',
          textAlign: 'center',
          mb: 1,
          fontSize: '0.85rem'
        }}
      >
        {title}
      </Typography>

      {/* Gauge SVG */}
      <Box sx={{ position: 'relative', width: 200, height: 160 }}>
        <svg width="200" height="160" viewBox="0 0 200 140">
          {/* Background arc */}
          <path
            d={backgroundArc}
            fill="none"
            stroke={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Value arc with animation */}
          <motion.path
            d={valueArc}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: normalizedValue / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick, i) => {
            const angle = -120 + (tick / 100) * 270;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + (radius - 20) * Math.cos(rad);
            const y1 = centerY + (radius - 20) * Math.sin(rad);
            const x2 = centerX + (radius - 5) * Math.cos(rad);
            const y2 = centerY + (radius - 5) * Math.sin(rad);
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={theme.palette.text.secondary}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* Center value display */}
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              color: gaugeColor,
              lineHeight: 1
            }}
          >
            {displayValue}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}
          >
            {unit}
          </Typography>
        </Box>
      </Box>

      {/* Min/Max labels */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '80%',
        mt: -1
      }}>
        <Typography variant="caption" color="text.secondary">
          {min}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {max >= 1000 ? `${(max/1000).toFixed(0)}k` : max}
        </Typography>
      </Box>
    </Box>
  );
};

// Helper function to create SVG arc path (clockwise)
function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(' ');
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  // Convert to radians and adjust for SVG y-down coordinate system
  // Subtract 90° to make 0° at 12 o'clock, negate for clockwise
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

export default DialView;
