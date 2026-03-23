import React from 'react';
import { 
  Box, 
  Typography, 
  Chip,
  Paper
} from '@mui/material';
import { 
  Wifi, 
  WifiOff, 
  HelpOutline
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const StatusCard = ({ selectedNode, selectedBaseStation, onlineCount, offlineCount, unknownCount }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gridColumn: 'span 1',
        gridRow: 'span 1'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Node and Base Station Info */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              mb: 0.5,
              color: 'text.primary'
            }}
          >
            {selectedNode || 'All Nodes'}
          </Typography>
          {selectedBaseStation && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.85rem', sm: '0.9rem' }
              }}
            >
              {selectedBaseStation}
            </Typography>
          )}
        </Box>

        {/* Status Counts */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Chip
              icon={<Wifi />}
              label={`${onlineCount} Online`}
              color="success"
              size="small"
              sx={{ 
                background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                color: 'white',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'flex-start',
                '& .MuiChip-icon': {
                  marginLeft: '8px'
                }
              }}
            />
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }}>
            <Chip
              icon={<WifiOff />}
              label={`${offlineCount} Offline`}
              color="error"
              size="small"
              sx={{ 
                background: 'linear-gradient(135deg, #F44336, #d32f2f)',
                color: 'white',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'flex-start',
                '& .MuiChip-icon': {
                  marginLeft: '8px'
                }
              }}
            />
          </motion.div>
          
          {unknownCount > 0 && (
            <motion.div whileHover={{ scale: 1.02 }}>
              <Chip
                icon={<HelpOutline />}
                label={`${unknownCount} Unknown`}
                color="warning"
                size="small"
                sx={{ 
                  background: 'linear-gradient(135deg, #FF9800, #f57c00)',
                  color: 'white',
                  fontWeight: 600,
                  width: '100%',
                  justifyContent: 'flex-start',
                  '& .MuiChip-icon': {
                    marginLeft: '8px'
                  }
                }}
              />
            </motion.div>
          )}
        </Box>
      </motion.div>
    </Paper>
  );
};

export default StatusCard;
