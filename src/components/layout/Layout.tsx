import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NetworkStatusBanner from '../common/NetworkStatusBanner';
import PWAInstallBanner from '../common/PWAInstallBanner';

const Layout: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        // 전체 레이아웃을 가운데 정렬하기 위한 컨테이너
        margin: '0 auto',
        maxWidth: '100%',
      }}
    >
      {/* Header - 100% width */}
      <Box
        sx={{
          width: '100%',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Header />
      </Box>

      {/* Network Status Banner */}
      <NetworkStatusBanner />

      {/* Main Content - 가운데 정렬 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          py: { xs: 1, sm: 2, md: 4 },
          minHeight: 'calc(100vh - 140px)', // Header와 Footer 높이를 고려한 최소 높이
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: {
              xs: '100%',
              sm: '540px',    // 작은 모바일
              md: '720px',    // 태블릿
              lg: '960px',    // 작은 데스크톱
              xl: '1140px',   // 큰 데스크톱
            },
            px: { xs: 2, sm: 3, md: 4 },
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Footer - 100% width */}
      <Box
        sx={{
          width: '100%',
          mt: 'auto',
        }}
      >
        <Footer />
      </Box>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </Box>
  );
};

export default Layout;
