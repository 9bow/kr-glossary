export interface CoreMember {
  id: string;
  name: string;
  role: string;
  description: string;
  githubUsername: string;
  avatarUrl?: string;
  joinedAt: string;
  responsibilities: string[];
}

// 캐시를 위한 변수들
let membersCache: CoreMember[] | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30분
let cacheTimestamp: number = 0;

/**
 * 구성원 데이터를 로드합니다.
 */
export async function loadCoreMembers(): Promise<CoreMember[]> {
  // 캐시가 유효한지 확인
  if (membersCache !== null && isCacheValid()) {
    return membersCache;
  }

  try {
    const response = await fetch('/data/members/core-members.json');
    if (!response.ok) {
      throw new Error(`Failed to load core members: ${response.status}`);
    }

    const data: CoreMember[] = await response.json();

    // 캐시 업데이트
    membersCache = data;
    cacheTimestamp = Date.now();

    return data;
  } catch (error) {
    console.error('Error loading core members:', error);
    return [];
  }
}

/**
 * 캐시가 유효한지 확인합니다.
 */
function isCacheValid(): boolean {
  return Date.now() - cacheTimestamp < CACHE_DURATION;
}

/**
 * 캐시를 클리어합니다.
 */
export function clearMembersCache(): void {
  membersCache = null;
  cacheTimestamp = 0;
}

/**
 * 캐시된 데이터의 통계를 반환합니다.
 */
export function getMembersCacheStats() {
  return {
    members: membersCache?.length || 0,
    cacheAge: Date.now() - cacheTimestamp,
    isValid: isCacheValid(),
  };
}
