import React, { useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface GiscusCommentsProps {
  termId: string;
  termTitle: string;
}

const GiscusComments: React.FC<GiscusCommentsProps> = ({
  termId,
  termTitle,
}) => {
  useEffect(() => {
    // 환경 변수에서 Giscus 설정 가져오기
    const giscusRepo = import.meta.env.VITE_GISCUS_REPO || '9bowcc/kr-glossary';
    const giscusRepoId = import.meta.env.VITE_GISCUS_REPO_ID || 'your-repo-id';
    const giscusCategory = import.meta.env.VITE_GISCUS_CATEGORY || 'General';
    const giscusCategoryId = import.meta.env.VITE_GISCUS_CATEGORY_ID || 'your-category-id';

    // Giscus 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    // Giscus 설정
    script.setAttribute('data-repo', giscusRepo);
    script.setAttribute('data-repo-id', giscusRepoId);
    script.setAttribute('data-category', giscusCategory);
    script.setAttribute('data-category-id', giscusCategoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', termId);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'ko');

    // 기존 Giscus 요소 제거 및 새로 추가
    const existingGiscus = document.getElementById('giscus-container');
    if (existingGiscus) {
      existingGiscus.innerHTML = '';
    }

    const container = document.getElementById('giscus-container');
    if (container) {
      container.appendChild(script);
    }

    // 클린업 함수
    return () => {
      const giscusElement = document.querySelector('.giscus');
      if (giscusElement) {
        giscusElement.remove();
      }
    };
  }, [termId]);

  // Giscus 설정이 완료되지 않은 경우 안내 메시지 표시
  const isGiscusConfigured = import.meta.env.VITE_GISCUS_REPO_ID &&
                            import.meta.env.VITE_GISCUS_CATEGORY_ID;

  if (!isGiscusConfigured) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            커뮤니티 토론
          </Typography>
          <Typography variant="body2">
            이 용어에 대한 토론은 곧 활성화될 예정입니다.
            궁금한 점이나 의견이 있으시면{' '}
            <a
              href={`https://github.com/${import.meta.env.VITE_GITHUB_OWNER || '9bowcc'}/${import.meta.env.VITE_GITHUB_REPO || 'kr-glossary'}/discussions`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              GitHub Discussions
            </a>
            에서 자유롭게 나누어주세요.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        커뮤니티 토론
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        "{termTitle}" 용어에 대한 의견이나 질문을 자유롭게 나누어주세요.
        모든 토론은 GitHub Discussions에서 관리됩니다.
      </Typography>

      {/* Giscus 컨테이너 */}
      <Box
        id="giscus-container"
        sx={{
          '& .giscus': {
            width: '100%',
          },
          '& .giscus-frame': {
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      />

      {/* 로딩 중일 때 표시할 내용 */}
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body2">
          댓글 시스템을 불러오는 중...
        </Typography>
      </Box>
    </Box>
  );
};

export default GiscusComments;
