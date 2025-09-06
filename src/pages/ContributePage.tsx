import React from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  GitHub,
  Edit,
  Launch,
  Home,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ContributePage: React.FC = () => {
  const handleGitHubContribute = () => {
    window.open('https://github.com/9bow/kr-glossary', '_blank');
  };

  const handleDiscussionContribute = () => {
    window.open('https://github.com/9bow/kr-glossary/discussions', '_blank');
  };

  const handleIssuesContribute = () => {
    window.open('https://github.com/9bow/kr-glossary/issues', '_blank');
  };

  return (
    <Container maxWidth="lg">
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          홈
        </MuiLink>
        <Typography color="text.primary">기여하기</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
          기여하기
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          AI/ML 한국어 용어집 개선에 참여해주세요
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            GitHub 기반 협업
          </Typography>
          <Typography variant="body2">
            이 프로젝트는 GitHub Pages로 호스팅되며, 모든 기여는 GitHub Pull Request를 통해 이루어집니다.
          </Typography>
        </Alert>
      </Box>

      {/* 주요 기여 방법 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4, mb: 6 }}>
        {/* GitHub 리포지토리 기여 */}
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
          }}
          onClick={handleGitHubContribute}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <GitHub sx={{ fontSize: '4rem', color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              코드 기여
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              용어 추가, 코드 개선, 문서화 등
            </Typography>
            <Button variant="contained" fullWidth>
              GitHub에서 기여하기
            </Button>
          </CardContent>
        </Card>

        {/* 토론 참여 */}
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
          }}
          onClick={handleDiscussionContribute}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Edit sx={{ fontSize: '4rem', color: 'secondary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              의견 공유
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              용어 번역 토론, 개선 제안, 커뮤니티 참여
            </Typography>
            <Button variant="contained" color="secondary" fullWidth>
              토론 참여하기
            </Button>
          </CardContent>
        </Card>

        {/* 이슈 제기 */}
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
          }}
          onClick={handleIssuesContribute}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Launch sx={{ fontSize: '4rem', color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              이슈 제기
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              버그 신고, 기능 요청, 개선 제안
            </Typography>
            <Button variant="contained" color="warning" fullWidth>
              이슈 제기하기
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* 기여 가이드라인 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          기여 가이드라인
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              1. 용어 추가 및 수정
            </Typography>
            <Typography variant="body2" paragraph>
              • Fork 저장소를 생성하고 새로운 브랜치를 만드세요<br/>
              • data/terms/sample-terms.json 파일을 편집합니다<br/>
              • 검증 스크립트로 데이터 품질을 확인합니다<br/>
              • Pull Request를 생성하여 변경사항을 제출합니다
            </Typography>

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'secondary.main' }}>
              2. 품질 기준
            </Typography>
            <Typography variant="body2" paragraph>
              • 정확하고 명확한 한국어/영어 정의 제공<br/>
              • 최소 1개 이상의 실제 사용 예시<br/>
              • 신뢰할 수 있는 참고문헌 포함<br/>
              • 알파벳순 정렬 유지
            </Typography>

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'warning.main' }}>
              3. 자동 검증
            </Typography>
            <Typography variant="body2">
              모든 Pull Request는 자동으로 검증됩니다:<br/>
              • JSON 스키마 검증<br/>
              • 중복 용어 검사<br/>
              • 정렬 순서 확인<br/>
              • 빌드 테스트
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ContributePage;