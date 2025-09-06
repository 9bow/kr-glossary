import React, { useState, useEffect } from 'react';
import {
  Alert,
  Collapse,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Close,
  WifiOff,
  SignalWifi1Bar,
  SignalWifi2Bar,
  SignalWifi4Bar,
  SignalCellularOff,
  DataSaverOn,
} from '@mui/icons-material';
import { useNetworkStatus, getConnectionQuality } from '../../hooks/useNetworkStatus';

const NetworkStatusBanner: React.FC = () => {
  const networkStatus = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  const connectionQuality = getConnectionQuality(networkStatus);

  // Show banner when offline or poor connection
  const shouldShowBanner = (
    !dismissed && 
    (!networkStatus.isOnline || connectionQuality.level === 'poor')
  );

  // Auto-dismiss good connections after a delay
  useEffect(() => {
    if (networkStatus.isOnline && connectionQuality.level !== 'poor') {
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, connectionQuality.level]);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!networkStatus.isOnline) {
      setDismissed(false);
    }
  }, [networkStatus.isOnline]);

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff />;
    }

    switch (connectionQuality.level) {
      case 'poor':
        return <SignalWifi1Bar />;
      case 'good':
        return <SignalWifi2Bar />;
      case 'excellent':
        return <SignalWifi4Bar />;
      default:
        return <SignalCellularOff />;
    }
  };

  const getSeverity = (): 'error' | 'warning' | 'info' | 'success' => {
    if (!networkStatus.isOnline) return 'error';
    if (connectionQuality.level === 'poor') return 'warning';
    if (connectionQuality.level === 'good') return 'info';
    return 'success';
  };

  const getMessage = () => {
    if (!networkStatus.isOnline) {
      return '인터넷에 연결되지 않았습니다. 캐시된 콘텐츠만 이용할 수 있습니다.';
    }

    if (connectionQuality.level === 'poor') {
      return '네트워크 연결이 불안정합니다. 일부 기능이 제한될 수 있습니다.';
    }

    return connectionQuality.description;
  };

  // Connection details for development/debug
  const showDetails = process.env.NODE_ENV === 'development';

  return (
    <>
      <Collapse in={shouldShowBanner}>
        <Alert
          severity={getSeverity()}
          icon={getStatusIcon()}
          action={
            <IconButton
              aria-label="알림 닫기"
              color="inherit"
              size="small"
              onClick={() => setDismissed(true)}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
          sx={{
            borderRadius: 0,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              {getMessage()}
            </Typography>

            {/* Connection details and data saver indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {networkStatus.saveData && (
                <Chip
                  icon={<DataSaverOn />}
                  label="데이터 절약 모드"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}

              {showDetails && networkStatus.isOnline && (
                <>
                  <Chip
                    label={`${networkStatus.effectiveType.toUpperCase()}`}
                    size="small"
                    variant="outlined"
                  />
                  {networkStatus.downlink > 0 && (
                    <Chip
                      label={`${networkStatus.downlink} Mbps`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </>
              )}

              {!networkStatus.isOnline && (
                <Typography variant="caption" color="text.secondary">
                  연결이 복구되면 자동으로 동기화됩니다.
                </Typography>
              )}
            </Box>

            {/* Loading indicator for poor connections */}
            {networkStatus.isOnline && connectionQuality.level === 'poor' && (
              <LinearProgress 
                variant="indeterminate" 
                sx={{ 
                  height: 2, 
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'warning.main'
                  }
                }} 
              />
            )}
          </Box>
        </Alert>
      </Collapse>

      {/* Connection quality indicator for good connections */}
      <Collapse in={networkStatus.isOnline && connectionQuality.level === 'excellent' && !dismissed}>
        <Alert
          severity="success"
          icon={<SignalWifi4Bar />}
          onClose={() => setDismissed(true)}
          sx={{
            borderRadius: 0,
            '& .MuiAlert-message': { py: 0.5 }
          }}
        >
          <Typography variant="body2">
            {connectionQuality.description}
          </Typography>
        </Alert>
      </Collapse>
    </>
  );
};

export default NetworkStatusBanner;