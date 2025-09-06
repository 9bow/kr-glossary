import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, GetApp, PhoneAndroid } from '@mui/icons-material';
import { usePWAInstall, isRunningAsPWA, getPWACapabilities } from '../../hooks/usePWAInstall';

const PWAInstallBanner: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const capabilities = getPWACapabilities();
  const runningAsPWA = isRunningAsPWA();

  useEffect(() => {
    // Don't show if already running as PWA or not installable
    if (runningAsPWA || isInstalled || !isInstallable) {
      return;
    }

    // Check if user previously dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-banner-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Show banner if not dismissed or dismissed more than 24 hours ago
    if (!dismissed || dismissedTime < oneDayAgo) {
      // Show after a delay to not interrupt initial page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [runningAsPWA, isInstalled, isInstallable]);

  const handleInstall = async () => {
    try {
      await promptInstall();
      setShowBanner(false);
    } catch (error) {
      console.error('PWA install failed:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-install-banner-dismissed', Date.now().toString());
  };

  const getInstallMessage = () => {
    if (capabilities.isIOS) {
      return {
        title: 'Safari에서 홈 화면에 추가하기',
        description: '공유 버튼(↗)을 탭한 후 "홈 화면에 추가"를 선택하세요.',
        action: '설치 방법 보기'
      };
    }

    return {
      title: '앱으로 설치하여 더 편리하게',
      description: '오프라인에서도 사용할 수 있고, 빠른 액세스와 알림 기능을 제공합니다.',
      action: '지금 설치'
    };
  };

  if (!showBanner || dismissed || runningAsPWA || isInstalled || !isInstallable) {
    return null;
  }

  const message = getInstallMessage();

  return (
    <Slide direction="up" in={showBanner} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          p: 2,
        }}
      >
        <Alert
          severity="info"
          variant="filled"
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 2,
            boxShadow: theme.shadows[8],
            maxWidth: 600,
            mx: 'auto',
            '& .MuiAlert-icon': {
              color: 'inherit'
            }
          }}
          icon={<PhoneAndroid />}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={handleInstall}
                disabled={isInstalling}
                startIcon={<GetApp />}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {isInstalling ? '설치 중...' : message.action}
              </Button>
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{ 
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <AlertTitle sx={{ color: 'inherit', fontWeight: 600 }}>
            {message.title}
          </AlertTitle>
          {!isMobile && message.description}
        </Alert>
      </Box>
    </Slide>
  );
};

export default PWAInstallBanner;