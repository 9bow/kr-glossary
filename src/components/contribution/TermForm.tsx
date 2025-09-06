import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  GitHub,
  BugReport,
  Add,
  Edit,
} from '@mui/icons-material';
import type { Term, TermInput } from '../../types';

type ContributionType = 'add' | 'edit' | 'report';

interface TermFormProps {
  type: ContributionType;
  initialData?: Term | TermInput;
  onSubmit?: (data: TermInput) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const TermForm: React.FC<TermFormProps> = ({ type }) => {
  const getGitHubIssueUrl = () => {
    const baseUrl = 'https://github.com/9bow/kr-glossary/issues/new';

    switch (type) {
      case 'add':
        return `${baseUrl}?template=term-addition.yml&title=%5B%EC%9A%A9%EC%96%B4+%EC%B6%94%EA%B0%80%5D+`;
      case 'edit':
        return `${baseUrl}?template=term-modification.yml&title=%5B%EC%9A%A9%EC%96%B4+%EC%88%98%EC%A0%95%5D+`;
      case 'report':
        return `${baseUrl}?template=bug-report.yml&title=%5B%EB%AC%B8%EC%A0%9C+%EC%8B%A0%EA%B3%A0%5D+`;
      default:
        return baseUrl;
    }
  };

  const handleGitHubContribute = () => {
    window.open(getGitHubIssueUrl(), '_blank');
  };

  const getTitle = () => {
    switch (type) {
      case 'add': return '새 용어 추가';
      case 'edit': return '용어 수정';
      case 'report': return '문제 신고';
      default: return '용어 기여';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'add': return 'GitHub 이슈를 통해 새로운 AI/ML 용어를 제안해주세요.';
      case 'edit': return 'GitHub 이슈를 통해 기존 용어의 수정사항을 제안해주세요.';
      case 'report': return 'GitHub 이슈를 통해 발견한 문제를 신고해주세요.';
      default: return 'GitHub 이슈를 통해 용어집 개선에 참여해주세요.';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'add': return <Add sx={{ fontSize: 48 }} />;
      case 'edit': return <Edit sx={{ fontSize: 48 }} />;
      case 'report': return <BugReport sx={{ fontSize: 48 }} />;
      default: return <GitHub sx={{ fontSize: 48 }} />;
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3, color: 'primary.main' }}>
          {getIcon()}
        </Box>

        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          {getTitle()}
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          {getDescription()}
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            ISSUE 기반 워크플로우 안내
          </Typography>
          <Typography variant="body2">
            이 프로젝트는 GitHub 이슈를 통해 용어를 추가하고 수정하는 자동화된 워크플로우를 사용합니다.
            아래 버튼을 클릭하면 해당하는 이슈 템플릿으로 이동합니다.
          </Typography>
        </Alert>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            기여 절차:
          </Typography>
          <Box component="ol" sx={{ textAlign: 'left', maxWidth: 500, mx: 'auto', pl: 3 }}>
            <li>이슈 템플릿 작성 (자동 검증)</li>
            <li>관리자 승인 대기</li>
            <li>자동 PR 생성</li>
            <li>사이트 반영 완료</li>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHub />}
            onClick={handleGitHubContribute}
          >
            이슈 작성하기
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TermForm;
