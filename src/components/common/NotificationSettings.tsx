import React, { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Chip,
  FormGroup,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Notifications,
  NotificationsOff,
  NotificationsActive,
  Info,
  Science,
  Settings,
} from '@mui/icons-material';
import { usePushNotifications, testNotification } from '../../hooks/usePushNotifications';

interface NotificationPreferences {
  newTerms: boolean;
  termUpdates: boolean;
  weeklyDigest: boolean;
  importantAnnouncements: boolean;
}

const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    permission,
    subscription,
    isSubscribing,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification-preferences');
    return saved ? JSON.parse(saved) : {
      newTerms: true,
      termUpdates: false,
      weeklyDigest: true,
      importantAnnouncements: true,
    };
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
    localStorage.setItem('notification-preferences', JSON.stringify(newPreferences));
  };

  const handleSubscriptionToggle = async () => {
    if (subscription) {
      await unsubscribe();
    } else {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }
      await subscribe();
    }
  };

  const getStatusChip = () => {
    if (!isSupported) {
      return <Chip icon={<NotificationsOff />} label="지원 안됨" color="default" size="small" />;
    }

    if (permission === 'denied') {
      return <Chip icon={<NotificationsOff />} label="차단됨" color="error" size="small" />;
    }

    if (subscription) {
      return <Chip icon={<NotificationsActive />} label="구독 중" color="success" size="small" />;
    }

    if (permission === 'granted') {
      return <Chip icon={<Notifications />} label="허용됨" color="info" size="small" />;
    }

    return <Chip icon={<NotificationsOff />} label="비활성" color="default" size="small" />;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <NotificationsOff color="disabled" />
            <Typography variant="h6" color="text.secondary">
              알림 기능
            </Typography>
          </Box>
          <Alert severity="info">
            현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
            Chrome, Firefox, Safari 등의 최신 브라우저를 사용해주세요.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Notifications color="primary" />
            <Typography variant="h6">
              알림 설정
            </Typography>
          </Box>
          {getStatusChip()}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                주소창의 🔒 아이콘을 클릭하여 알림 설정을 변경할 수 있습니다.
              </Typography>
            </Box>
          </Alert>
        )}

        {/* 메인 구독 스위치 */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={!!subscription}
                onChange={handleSubscriptionToggle}
                disabled={isSubscribing || permission === 'denied'}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>푸시 알림 받기</Typography>
                {isSubscribing && <CircularProgress size={16} />}
              </Box>
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
            새로운 용어 추가, 업데이트 등의 중요한 소식을 받아보세요.
          </Typography>
        </Box>

        {/* 알림 선호도 설정 */}
        {subscription && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings fontSize="small" />
              알림 종류별 설정
            </Typography>

            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.newTerms}
                    onChange={() => handlePreferenceChange('newTerms')}
                    size="small"
                  />
                }
                label="새로운 용어 추가"
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                새로운 AI/ML 용어가 추가될 때마다 알림을 받습니다.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.termUpdates}
                    onChange={() => handlePreferenceChange('termUpdates')}
                    size="small"
                  />
                }
                label="용어 업데이트"
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                기존 용어의 정의나 번역이 업데이트될 때 알림을 받습니다.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.weeklyDigest}
                    onChange={() => handlePreferenceChange('weeklyDigest')}
                    size="small"
                  />
                }
                label="주간 요약"
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                매주 새로 추가된 용어들의 요약을 받습니다.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.importantAnnouncements}
                    onChange={() => handlePreferenceChange('importantAnnouncements')}
                    size="small"
                  />
                }
                label="중요한 공지사항"
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                플랫폼의 중요한 업데이트나 공지사항을 받습니다.
              </Typography>
            </FormGroup>
          </>
        )}

        {/* 테스트 버튼 */}
        {subscription && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Science />}
                onClick={testNotification}
              >
                알림 테스트
              </Button>
              <Tooltip title="테스트 알림을 보내 설정이 올바른지 확인합니다">
                <IconButton size="small">
                  <Info fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}

        {/* 고급 설정 */}
        {process.env.NODE_ENV === 'development' && subscription && (
          <>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="text"
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              고급 설정 {showAdvanced ? '숨기기' : '보기'}
            </Button>

            {showAdvanced && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>디버그 정보</Typography>
                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <div>Permission: {permission}</div>
                  <div>Endpoint: {subscription?.endpoint?.substring(0, 50)}...</div>
                  <div>P256DH: {subscription?.keys.p256dh?.substring(0, 20)}...</div>
                  <div>Auth: {subscription?.keys.auth?.substring(0, 20)}...</div>
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;