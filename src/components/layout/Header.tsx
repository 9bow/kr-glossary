import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Tooltip,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Forest,
  Home,
  Info,
  FormatListBulleted,
  Groups,
  People,
  GetApp,
  AdminPanelSettings,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Header: React.FC = () => {
  const { toggleMode, getCurrentMode } = useTheme();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWAInstall();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [installSnackbar, setInstallSnackbar] = useState(false);

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handlePWAInstall = async () => {
    try {
      await promptInstall();
      setInstallSnackbar(true);
    } catch (error) {
      console.error('PWA install failed:', error);
    }
  };

  const handleInstallSnackbarClose = () => {
    setInstallSnackbar(false);
  };

  // 간단한 관리자 체크 (개발용)
  const isAdmin = () => {
    // 실제 운영에서는 제대로 된 인증 시스템을 사용해야 함
    const adminFlag = localStorage.getItem('kr-glossary-admin');
    return adminFlag === 'true' || process.env.NODE_ENV === 'development';
  };

  const navigationItems = [
    { label: '홈', path: '/', icon: <Home /> },
    { label: '소개', path: '/about', icon: <Info /> },
    { label: '조직', path: '/organizations', icon: <Groups /> },
    { label: '기여자', path: '/contributors', icon: <People /> },
    { label: '전체 용어', path: '/terms', icon: <FormatListBulleted /> },
  ];

  // 관리자 메뉴 아이템
  const adminItems = [
    { label: '관리자', path: '/admin', icon: <AdminPanelSettings /> },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ color: 'text.primary' }}>
          AI/ML 용어집
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton onClick={() => handleNavigation(item.path)}>
              {item.icon && (
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'text.primary' }}>
                  {item.icon}
                </Box>
              )}
              <ListItemText
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    color: 'text.primary'
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {/* 모바일용 기여 메뉴 */}
        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation('/contribute')}>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'text.primary' }}>
              <Forest />
            </Box>
            <ListItemText
              primary="용어 기여"
              sx={{
                '& .MuiListItemText-primary': {
                  color: 'text.primary'
                }
              }}
            />
          </ListItemButton>
        </ListItem>

        {/* 관리자 메뉴 (모바일) */}
        {isAdmin() && (
          <>
            <Divider sx={{ my: 1 }} />
            {adminItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleNavigation(item.path)}>
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'error.main' }}>
                    {item.icon}
                  </Box>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: 'error.main',
                        fontWeight: 600
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}


      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          width: '100%',
          left: 0,
          right: 0,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              aria-label="메뉴 열기"
              edge="start"
              onClick={handleMobileToggle}
              sx={{
                mr: 2,
                color: 'text.primary'
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'text.primary',
              fontWeight: 700,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {isMobile ? 'AI/ML 용어집' : 'AI/ML 용어집'}
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* 기여 버튼 */}
              <Button
                component={Link}
                to="/contribute"
                startIcon={<Forest />}
                sx={{
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                기여 방법
              </Button>

              {/* 관리자 버튼 (데스크톱) */}
              {isAdmin() && (
                <Button
                  component={Link}
                  to="/admin"
                  startIcon={<AdminPanelSettings />}
                  sx={{
                    color: 'error.main',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'error.light',
                      color: 'error.contrastText',
                    },
                  }}
                >
                  관리자
                </Button>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* PWA 설치 버튼 */}
            {isInstallable && !isInstalled && (
              <Tooltip title="앱 설치">
                <IconButton
                  onClick={handlePWAInstall}
                  disabled={isInstalling}
                  aria-label="PWA 설치"
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <GetApp />
                </IconButton>
              </Tooltip>
            )}

            {/* PWA 설치됨 표시 */}
            {isInstalled && (
              <Tooltip title="앱이 설치되었습니다">
                <Chip
                  icon={<GetApp />}
                  label="설치됨"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              </Tooltip>
            )}

            {/* 테마 토글 */}
            <Tooltip title="테마 변경">
              <IconButton
                onClick={toggleMode}
                aria-label="테마 변경"
                sx={{
                  color: 'text.primary'
                }}
              >
                {getCurrentMode() === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleMobileToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>

      {/* PWA 설치 완료 알림 */}
      <Snackbar
        open={installSnackbar}
        autoHideDuration={4000}
        onClose={handleInstallSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleInstallSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          앱이 성공적으로 설치되었습니다!
        </Alert>
      </Snackbar>
    </>
  );
};

export default Header;
