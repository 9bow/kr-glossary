#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GitHub API를 사용하여 저장소의 기여자 정보를 가져옵니다.
 */
class GitHubContributorsUpdater {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.repo = process.env.GITHUB_REPOSITORY;
    this.baseUrl = 'https://api.github.com';

    if (!this.token) {
      console.warn('⚠️  GITHUB_TOKEN이 설정되지 않았습니다. API 요청이 제한될 수 있습니다.');
    }

    if (!this.repo) {
      throw new Error('GITHUB_REPOSITORY 환경 변수가 필요합니다.');
    }

    // API 요청 헤더
    this.headers = {
      'User-Agent': 'GitHub-Contributors-Updater',
      'Accept': 'application/vnd.github.v3+json',
      ...(this.token && { 'Authorization': `token ${this.token}` })
    };
  }

  /**
   * HTTP GET 요청을 수행합니다.
   */
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: this.headers
      };

      https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 저장소의 커밋 정보를 가져옵니다.
   */
  async getCommits() {
    const url = `${this.baseUrl}/repos/${this.repo}/commits?per_page=100`;
    console.log(`📥 커밋 정보 가져오는 중: ${url}`);

    try {
      const commits = await this.makeRequest(url);
      console.log(`✅ ${commits.length}개의 커밋 정보를 가져왔습니다.`);
      return commits;
    } catch (error) {
      console.error('❌ 커밋 정보를 가져오는데 실패했습니다:', error.message);
      return [];
    }
  }

  /**
   * 커밋에서 고유한 기여자들을 추출합니다.
   */
  extractContributors(commits) {
    const contributorsMap = new Map();

    commits.forEach(commit => {
      const author = commit.author || commit.commit.author;

      if (author && author.login) {
        const username = author.login;

        if (!contributorsMap.has(username)) {
          contributorsMap.set(username, {
            username,
            firstContributionAt: commit.commit.author.date,
            lastActiveAt: commit.commit.author.date,
            commitCount: 0
          });
        }

        const contributor = contributorsMap.get(username);
        contributor.commitCount++;
        contributor.lastActiveAt = commit.commit.author.date;
      }
    });

    return Array.from(contributorsMap.values());
  }

  /**
   * 각 기여자의 상세 정보를 GitHub API에서 가져옵니다.
   */
  async getContributorDetails(contributors) {
    console.log(`👥 ${contributors.length}명의 기여자 정보를 가져오는 중...`);

    const detailedContributors = [];

    for (const contributor of contributors) {
      try {
        console.log(`  └ ${contributor.username}의 정보 가져오는 중...`);

        // 사용자 정보 가져오기
        const userData = await this.makeRequest(`${this.baseUrl}/users/${contributor.username}`);

        // 기여자 정보 구성 (GitHub API에서 제공하는 필드만 사용)
        const contributorInfo = {
          githubUsername: userData.login,
          displayName: userData.name || userData.login,
          avatarUrl: userData.avatar_url,
          htmlUrl: userData.html_url,
          bio: userData.bio || '',
          email: userData.email || null, // 공개된 경우에만 제공됨
          location: userData.location || null,
          company: userData.company || null,
          blog: userData.blog || null,
          twitterUsername: userData.twitter_username || null,
          publicRepos: userData.public_repos || 0,
          publicGists: userData.public_gists || 0,
          followers: userData.followers || 0,
          following: userData.following || 0,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
          firstContributionAt: contributor.firstContributionAt,
          lastActiveAt: contributor.lastActiveAt,
          commitCount: contributor.commitCount
        };

        detailedContributors.push(contributorInfo);

        // API rate limit을 고려해서 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`⚠️  ${contributor.username}의 정보를 가져오는데 실패했습니다:`, error.message);

        // API 호출 실패 시 기본 정보만 포함
        detailedContributors.push({
          githubUsername: contributor.username,
          displayName: contributor.username,
          avatarUrl: `https://github.com/${contributor.username}.png`,
          htmlUrl: `https://github.com/${contributor.username}`,
          bio: '',
          email: null,
          location: null,
          company: null,
          blog: null,
          twitterUsername: null,
          publicRepos: 0,
          publicGists: 0,
          followers: 0,
          following: 0,
          createdAt: contributor.firstContributionAt,
          updatedAt: contributor.lastActiveAt,
          firstContributionAt: contributor.firstContributionAt,
          lastActiveAt: contributor.lastActiveAt,
          commitCount: contributor.commitCount
        });
      }
    }

    return detailedContributors;
  }

  /**
   * 기여자 데이터를 JSON 파일로 저장합니다.
   */
  saveContributorsData(contributors) {
    const outputPath = path.join(__dirname, '..', 'data', 'contributors', 'active-contributors.json');

    // 디렉토리가 존재하지 않으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(contributors, null, 2), 'utf8');
    console.log(`💾 기여자 데이터가 저장되었습니다: ${outputPath}`);
    console.log(`📊 총 ${contributors.length}명의 기여자 정보를 저장했습니다.`);
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    try {
      console.log('🚀 GitHub Contributors 데이터 업데이트 시작');

      // 1. 커밋 정보 가져오기
      const commits = await this.getCommits();

      if (commits.length === 0) {
        console.log('ℹ️  커밋 정보가 없습니다.');
        return;
      }

      // 2. 기여자 추출
      const contributors = this.extractContributors(commits);
      console.log(`📝 ${contributors.length}명의 고유 기여자를 발견했습니다.`);

      // 3. 상세 정보 가져오기
      const detailedContributors = await this.getContributorDetails(contributors);

      // 4. 정렬 (커밋 수 기준 내림차순)
      detailedContributors.sort((a, b) => b.commitCount - a.commitCount);

      // 5. 저장
      this.saveContributorsData(detailedContributors);

      console.log('✅ GitHub Contributors 데이터 업데이트 완료');

    } catch (error) {
      console.error('❌ 오류 발생:', error.message);
      process.exit(1);
    }
  }
}

// 스크립트 실행
const updater = new GitHubContributorsUpdater();
updater.run();
