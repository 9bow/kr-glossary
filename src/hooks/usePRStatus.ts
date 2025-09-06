import { useState, useCallback } from 'react';

export interface PullRequestStatus {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  requested_reviewers: Array<{
    login: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export interface PRStatus {
  prNumber: number;
  status: PullRequestStatus | null;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
}

export interface PRStatusHook {
  prStatuses: Map<number, PRStatus>;
  checkPRStatus: (prNumber: number) => Promise<void>;
  checkUserPRs: () => Promise<void>;
  refreshAllStatuses: () => Promise<void>;
  clearError: (prNumber: number) => void;
}

export function usePRStatus(): PRStatusHook {
  const [prStatuses, setPrStatuses] = useState<Map<number, PRStatus>>(new Map());

  const checkPRStatus = useCallback(async (prNumber: number) => {
    // Mock implementation for GitHub Pages environment
    console.log(`[PR] Mock: Checking status for PR #${prNumber}`);
    
    setPrStatuses(prev => new Map(prev.set(prNumber, {
      prNumber,
      status: null,
      loading: false,
      error: '정적 사이트에서는 실시간 PR 상태 확인이 불가능합니다',
      lastChecked: new Date(),
    })));
  }, []);

  const checkUserPRs = useCallback(async () => {
    // Mock implementation for GitHub Pages environment
    console.log('[PR] Mock: Loading PRs for user (GitHub Pages 제한)');
  }, []);

  const refreshAllStatuses = useCallback(async () => {
    console.log('[PR] Mock: Refreshing all PR statuses');
  }, []);

  const clearError = useCallback((prNumber: number) => {
    setPrStatuses(prev => {
      const current = prev.get(prNumber);
      if (current) {
        const updated = new Map(prev);
        updated.set(prNumber, { ...current, error: null });
        return updated;
      }
      return prev;
    });
  }, []);

  return {
    prStatuses,
    checkPRStatus,
    checkUserPRs,
    refreshAllStatuses,
    clearError,
  };
}