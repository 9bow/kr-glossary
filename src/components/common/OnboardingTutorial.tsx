import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Search, Add, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const OnboardingTutorial: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hasVisited = localStorage.getItem('has-visited-tutorial');
    const dontShow = localStorage.getItem('tutorial-dont-show-again');

    if (!hasVisited && !dontShow) {
      const timer = setTimeout(() => setOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('has-visited-tutorial', 'true');
  };

  const handleDontShowAgain = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      localStorage.setItem('tutorial-dont-show-again', 'true');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI/ML 용어집에 오신 것을 환영합니다!
          </Typography>
          <Button onClick={handleClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <Close fontSize="small" />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          AI/ML 한국어 용어의 일관성 있는 번역을 제공하는 커뮤니티 용어집입니다.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>🔍 용어 검색:</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            영문 또는 한국어로 AI/ML 용어를 검색하세요
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>✏️ 용어 기여:</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            GitHub Issues를 통해 새로운 용어를 제안하거나 기존 용어를 개선하세요
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <FormControlLabel
          control={<Checkbox onChange={handleDontShowAgain} />}
          label="다시 보지 않기"
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={() => { handleClose(); navigate('/search'); }}
          >
            검색하기
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { handleClose(); navigate('/contribute'); }}
          >
            기여하기
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingTutorial;
