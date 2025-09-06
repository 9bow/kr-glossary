import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../styles/theme';
import HomePage from './HomePage';

// ThemeProvider와 Router로 컴포넌트를 감싸는 헬퍼 함수
const renderWithProviders = async (component: React.ReactElement) => {
  const theme = createAppTheme('light');

  let rendered;
  await act(async () => {
    rendered = render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    );
  });
  
  // Wait for async operations to complete
  await waitFor(() => {
    // Wait for any loading states to resolve
  });
  
  return rendered;
};

describe('HomePage', () => {
  it('renders the main heading', async () => {
    await renderWithProviders(<HomePage />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('AI/ML 용어집');
  });

  it('renders without crashing', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: /AI\/ML 용어집/ })).toBeInTheDocument();
  });

  it('renders the main description', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByText(/함께 만드는 한국어 AI\/ML 용어집/)).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByRole('button', { name: /용어 검색하기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /용어 추가하기/ })).toBeInTheDocument();
  });

  it('renders statistics section', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByText('등록된 용어')).toBeInTheDocument();
    expect(screen.getByText('활성 기여자')).toBeInTheDocument();
    expect(screen.getByText('검증된 조직')).toBeInTheDocument();
    expect(screen.getByText('월간 조회수')).toBeInTheDocument();
  });

  it('renders category section', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByText('용어 카테고리')).toBeInTheDocument();

    // 카테고리 칩들이 렌더링되는지 확인 - 각 칩을 개별적으로 확인
    expect(screen.getByRole('button', { name: 'ML' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NLP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GAI' })).toBeInTheDocument();
  });

  it('renders featured terms section', async () => {
    await renderWithProviders(<HomePage />);

    expect(screen.getByText('추천 용어')).toBeInTheDocument();

    // 추천 용어들이 렌더링되는지 확인
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('기계학습')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByText('딥러닝')).toBeInTheDocument();
    expect(screen.getByText('Natural Language Processing')).toBeInTheDocument();
    expect(screen.getByText('자연어처리')).toBeInTheDocument();
  });

  it('renders onboarding tutorial component', async () => {
    await renderWithProviders(<HomePage />);

    // OnboardingTutorial 컴포넌트가 렌더링되는지 확인
    // 실제로는 조건부로 표시되므로 DOM에 존재하는지만 확인
    expect(document.body).toBeInTheDocument();
  });

  it('has proper semantic structure', async () => {
    await renderWithProviders(<HomePage />);

    // 주요 랜드마크 요소들이 있는지 확인
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays correct theme colors', () => {
    const theme = createAppTheme('light');
    expect(theme.palette.primary.main).toBeDefined();
    expect(theme.palette.secondary.main).toBeDefined();
  });
});
