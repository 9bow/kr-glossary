import React from 'react';
import {
  Box,
  Typography,
  Link,
  Divider,
} from '@mui/material';


const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    introduction: [
      { label: '용어집 소개', href: '/about' },
      { label: '기여 방법', href: '/contribute' },
    ],
    community: [
      { label: '조직', href: '/organizations' },
      { label: '기여자', href: '/contributors' },
    ],
    glossary: [
      { label: '용어 목록', href: '/terms' },
      { label: '용어 검색', href: '/search' },
    ],
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '600px', md: '960px', lg: '1280px', xl: '1536px' },
          margin: '0 auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: 4,
        }}
      >
        {/* Main Footer Content */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 120px 120px 120px',
            md: '1fr 120px 120px 120px'
          },
          gap: { xs: 3, sm: 2, md: 3 },
          alignItems: 'start'
        }}>
          {/* Project Info Section */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              AI/ML 용어집
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              모두가 함께 만드는 한국어 AI/ML 용어집은<br />
              번역과 이해를 돕는 오픈소스 프로젝트입니다.
            </Typography>

          </Box>

          {/* Introduction Section */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, width: '120px' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
              소개
            </Typography>
            {footerLinks.introduction.map((link) => (
              <Box key={link.label} sx={{ mb: 1 }}>
                <Link
                  href={link.href}
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'block',
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {link.label}
                </Link>
              </Box>
            ))}
          </Box>

          {/* Community Section */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, width: '120px' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
              구성원
            </Typography>
            {footerLinks.community.map((link) => (
              <Box key={link.label} sx={{ mb: 1 }}>
                <Link
                  href={link.href}
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'block',
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {link.label}
                </Link>
              </Box>
            ))}
          </Box>

          {/* Glossary Section */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, width: '120px' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
              용어집
            </Typography>
            {footerLinks.glossary.map((link) => (
              <Box key={link.label} sx={{ mb: 1 }}>
                <Link
                  href={link.href}
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'block',
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {link.label}
                </Link>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'center', sm: 'space-between' },
            alignItems: { xs: 'center', sm: 'center' },
            gap: { xs: 1, sm: 2 },
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} AI/ML 용어집. MIT 라이선스 하에 배포됩니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Made with love by PyTorch.KR
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
