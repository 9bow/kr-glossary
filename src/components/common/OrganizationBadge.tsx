import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,

  Link,
} from '@mui/material';
import {
  Verified,
  Business,
  School,
  Group,
  MenuBook,
  Home,
  LinkedIn,
  Facebook,
  Twitter,
  Instagram,
  YouTube,

} from '@mui/icons-material';
import type { Organization } from '../../types';

interface OrganizationBadgeProps {
  organization: Organization;
  size?: 'small' | 'medium' | 'large';
  showLogo?: boolean;
  showDescription?: boolean;
  variant?: 'chip' | 'card' | 'inline';
}

const OrganizationBadge: React.FC<OrganizationBadgeProps> = ({
  organization,
  size = 'medium',
  showLogo = true,
  showDescription = false,
  variant = 'chip',
}) => {
  const [logoSize, setLogoSize] = useState<{width: number, height: number} | null>(null);

  // 로고 크기를 계산하는 함수
  const calculateLogoSize = (naturalWidth: number, naturalHeight: number, maxSize: number) => {
    const aspectRatio = naturalWidth / naturalHeight;
    const isLandscape = naturalWidth > naturalHeight;

    if (isLandscape) {
      // 가로가 긴 경우
      return {
        width: maxSize,
        height: maxSize / aspectRatio,
      };
    } else {
      // 세로가 긴 경우 또는 정사각형
      return {
        width: maxSize * aspectRatio,
        height: maxSize,
      };
    }
  };

  // 로고 경로 생성 함수
  const getLogoPath = useCallback((orgHomepage: string) => {
    // 한글 이름을 영문 도메인으로 변환 시도
    const koreanToDomainMap: Record<string, string> = {
      '제이펍': 'jpub.tistory.com',
      '비제이퍼블릭': 'bjpublic.tistory.com',
      '길벗': 'gilbut.co.kr',
      '루비페이퍼': 'rubypaper.co.kr',
      '인사이트': 'insightbook.co.kr',
      '위키북스': 'wikibook.co.kr',
      '영진닷컴': 'youngjin.com',
      '생능출판사': 'booksr.co.kr',
      '한빛미디어': 'hanbit.co.kr',
      '골든래빗': 'goldenrabbit.co.kr',
      '정보문화사': 'icc.co.kr',
      '에이콘출판': 'acornpub.co.kr',
      '책만': 'bookand.co.kr',
      '파이토치 한국 사용자 모임': 'pytorch.kr'
    };

    // 조직 이름으로부터 도메인 찾기 시도
    const orgName = organization.name;
    if (koreanToDomainMap[orgName]) {
      return `/logos/${koreanToDomainMap[orgName]}.png`;
    }

    // URL에서 도메인 추출
    try {
      if (orgHomepage) {
        const urlObj = new URL(orgHomepage);
        let domain = urlObj.hostname;
        // www. 제거
        domain = domain.replace(/^www\./, '');
        return `/logos/${domain}.png`;
      }
    } catch {
      console.warn(`Invalid homepage URL:`, orgHomepage);
    }

    // fallback: 기존 방식
    const sanitizedName = orgHomepage
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '')
      .replace(/\s+/g, '-');
    return `/logos/${sanitizedName}.png`;
  }, [organization.name]);

  // 로고 이미지 로딩 및 크기 계산
  useEffect(() => {
    if (showLogo && organization.logo) {
      const img = new Image();
      img.onload = () => {
        const maxSize = variant === 'card' ? 48 : variant === 'inline' ? 20 : 32;
        const calculatedSize = calculateLogoSize(img.naturalWidth, img.naturalHeight, maxSize);
        setLogoSize(calculatedSize);
      };
      img.onerror = () => {
        console.warn(`Failed to load logo for ${organization.name}:`, getLogoPath(organization.homepage));
        setLogoSize(null); // 로고 로드 실패 시 null로 설정
      };
      img.src = getLogoPath(organization.homepage);
    }
  }, [organization.homepage, organization.name, organization.logo, showLogo, variant, getLogoPath]);

  const getOrganizationIcon = (type: Organization['type']) => {
    switch (type) {
      case 'publisher':
        return <MenuBook fontSize="small" />;
      case 'university':
        return <School fontSize="small" />;
      case 'company':
        return <Business fontSize="small" />;
      case 'community':
        return <Group fontSize="small" />;
      default:
        return <Business fontSize="small" />;
    }
  };

  // 소셜 서비스 아이콘과 URL 생성 함수
  const getSocialIcon = (platform: string, handle: string) => {
    const baseUrls = {
      linkedin: 'https://linkedin.com/company/',
      facebook: 'https://facebook.com/',
      twitter: 'https://twitter.com/',
      instagram: 'https://instagram.com/',
      youtube: 'https://youtube.com/@',
      github: 'https://github.com/',
    };

    // 플랫폼별 색상과 스타일
    const platformStyles = {
      linkedin: {
        color: '#0077b5',
        bgcolor: 'rgba(0, 119, 181, 0.1)',
        hoverColor: '#005885',
      },
      facebook: {
        color: '#1877f2',
        bgcolor: 'rgba(24, 119, 242, 0.1)',
        hoverColor: '#166fe5',
      },
      twitter: {
        color: '#1da1f2',
        bgcolor: 'rgba(29, 161, 242, 0.1)',
        hoverColor: '#1a91da',
      },
      instagram: {
        color: '#e4405f',
        bgcolor: 'rgba(228, 64, 95, 0.1)',
        hoverColor: '#d73527',
      },
      youtube: {
        color: '#ff0000',
        bgcolor: 'rgba(255, 0, 0, 0.1)',
        hoverColor: '#cc0000',
      },
    };

    const icons = {
      linkedin: <LinkedIn fontSize="small" />,
      facebook: <Facebook fontSize="small" />,
      twitter: <Twitter fontSize="small" />,
      instagram: <Instagram fontSize="small" />,
      youtube: <YouTube fontSize="small" />,
    };

    const style = platformStyles[platform as keyof typeof platformStyles] || {
      color: 'text.secondary',
      bgcolor: 'action.hover',
      hoverColor: 'text.primary',
    };

    return {
      icon: icons[platform as keyof typeof icons],
      url: baseUrls[platform as keyof typeof baseUrls] + handle,
      style,
    };
  };

  const getOrganizationColor = (type: Organization['type']) => {
    switch (type) {
      case 'publisher':
        return 'primary';
      case 'university':
        return 'secondary';
      case 'company':
        return 'success';
      case 'community':
        return 'info';
      default:
        return 'default';
    }
  };

  // 더 다양한 배경 색상 옵션
  const getOrganizationBgColor = (_type: Organization['type'], name: string) => {
    const colors = [
      'primary.main',
      'secondary.main',
      'success.main',
      'info.main',
      'warning.main',
      'error.main',
      'primary.light',
      'secondary.light',
      'success.light',
      'info.light',
      'warning.light',
      'error.light',
    ];

    // 이름의 해시값을 기반으로 색상 선택 (더 다양한 분배)
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const colorIndex = Math.abs(hash) % colors.length;

    return colors[colorIndex];
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'small':
        return { fontSize: '0.75rem', py: 0.5, px: 1 };
      case 'large':
        return { fontSize: '0.875rem', py: 1, px: 2 };
      default:
        return { fontSize: '0.8125rem', py: 0.75, px: 1.5 };
    }
  };

  if (variant === 'chip') {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {organization.name}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {organization.description}
            </Typography>
            {organization.social && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {Object.entries(organization.social).map(([platform, handle]) => {
                  if (!handle) return null;
                  const { icon, url, style } = getSocialIcon(platform, handle);
                  return (
                    <Link
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        bgcolor: style.bgcolor,
                        color: style.color,
                        textDecoration: 'none',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          bgcolor: style.color,
                          color: 'white',
                          transform: 'scale(1.1)',
                        },
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {icon}
                    </Link>
                  );
                })}
              </Box>
            )}
          </Box>
        }
        arrow
      >
        <Chip
          icon={<Verified />}
          label={organization.name}
          color={getOrganizationColor(organization.type)}
          variant="filled"
          size={size === 'small' ? 'small' : 'medium'}
          sx={{
            ...getSizeStyles(size),
            backgroundColor: getOrganizationBgColor(organization.type, organization.name),
            color: 'white',
            '& .MuiChip-icon': {
              color: 'white',
            },
            '&:hover': {
              backgroundColor: getOrganizationBgColor(organization.type, organization.name),
              opacity: 0.8,
            },
          }}
          component={Link}
          href={organization.homepage}
          target="_blank"
          rel="noopener noreferrer"
          clickable
        />
      </Tooltip>
    );
  }

  if (variant === 'card') {
    return (
      <Box
        sx={{
          position: 'relative',
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          minHeight: 120, // 로고가 상단에 배치될 수 있도록 최소 높이 설정
        }}
      >
        {showLogo && organization.logo && logoSize && (
          <Box
            component="img"
            src={getLogoPath(organization.homepage)}
            alt={organization.name}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: logoSize.width,
              height: logoSize.height,
              objectFit: 'contain',
              borderRadius: 1,
            }}
            onError={(e) => {
              // 이미지 로드 실패 시 숨김 처리
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}

        <Box sx={{ flex: 1, pr: 7 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {getOrganizationIcon(organization.type)}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {organization.name}
            </Typography>
            <Verified sx={{ color: 'success.main' }} />
          </Box>

          {showDescription && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {organization.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={organization.type === 'publisher' ? '출판사' :
                     organization.type === 'university' ? '대학교' :
                     organization.type === 'company' ? '기업' : '커뮤니티'}
              size="small"
              color={getOrganizationColor(organization.type)}
              variant="filled"
            />

          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link
            href={organization.homepage}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              홈페이지 방문
            </Typography>
          </Link>

          {/* 소셜 서비스 핸들들 */}
          {organization.social && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(organization.social).map(([platform, handle]) => {
                if (!handle) return null;
                const { icon, url, style } = getSocialIcon(platform, handle);
                return (
                  <Tooltip key={platform} title={`${platform.charAt(0).toUpperCase() + platform.slice(1)} 방문`}>
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: style.bgcolor,
                        color: style.color,
                        textDecoration: 'none',
                        transition: 'all 0.2s ease-in-out',
                        border: '1px solid transparent',
                        '&:hover': {
                          bgcolor: style.color,
                          color: 'white',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                        },
                      }}
                    >
                      {icon}
                    </Link>
                  </Tooltip>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Inline variant
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {showLogo && organization.logo && logoSize && (
        <Box
          component="img"
          src={getLogoPath(organization.homepage)}
          alt={organization.name}
          sx={{
            width: logoSize.width,
            height: logoSize.height,
            objectFit: 'contain',
            borderRadius: 0.5,
          }}
          onError={(e) => {
            // 이미지 로드 실패 시 숨김 처리
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
      {getOrganizationIcon(organization.type)}
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {organization.name}
      </Typography>
      <Verified sx={{ fontSize: 16, color: 'success.main' }} />
    </Box>
  );
};

export default OrganizationBadge;
