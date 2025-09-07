#!/usr/bin/env python3
"""
이슈 내용을 기반으로 자동 라벨링하는 스크립트
"""

import argparse
import json
import re
import requests
import sys
from typing import List, Dict

class IssueAutoLabeler:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    
    def detect_issue_type(self, issue_body: str, issue_title: str) -> List[str]:
        """이슈 내용을 분석하여 적절한 라벨들을 결정"""
        labels = []
        
        # 이슈 본문과 제목을 합쳐서 분석
        content = (issue_body + " " + issue_title).lower()
        
        # 용어 관련 키워드 패턴
        term_patterns = [
            r'영어 용어',
            r'한국어 번역',
            r'term.*translation',
            r'neural\s*network',
            r'기여 유형.*새로운 용어',
            r'기여 유형.*용어.*추가',
            r'새로운.*용어.*추가',
            r'용어.*등록',
            r'term.*addition',
            r'new.*term'
        ]
        
        # 기여자 관련 키워드 패턴
        contributor_patterns = [
            r'기여자.*추가',
            r'contributor.*addition',
            r'github.*사용자명',
            r'새로운.*기여자'
        ]
        
        # 조직 관련 키워드 패턴
        organization_patterns = [
            r'조직.*추가',
            r'organization.*addition',
            r'회사.*등록',
            r'기관.*추가'
        ]
        
        # 관리자 관련 키워드 패턴
        admin_patterns = [
            r'관리자.*추가',
            r'admin.*addition',
            r'권한.*부여'
        ]
        
        # 패턴 매칭
        if any(re.search(pattern, content) for pattern in term_patterns):
            labels.extend(['term-addition', 'type:term-addition'])
        
        if any(re.search(pattern, content) for pattern in contributor_patterns):
            labels.extend(['contributor-addition', 'type:contributor-addition'])
        
        if any(re.search(pattern, content) for pattern in organization_patterns):
            labels.extend(['organization-addition', 'type:organization-addition'])
        
        if any(re.search(pattern, content) for pattern in admin_patterns):
            labels.extend(['admin-addition', 'type:admin-addition'])
        
        # 기본 라벨이 없으면 일반적인 라벨 추가
        if not labels:
            if 'bug' in content or '오류' in content or 'error' in content:
                labels.append('bug')
            elif 'enhancement' in content or '개선' in content or '향상' in content:
                labels.append('enhancement')
            elif 'feature' in content or '기능' in content:
                labels.append('feature')
            else:
                labels.append('needs-triage')
        
        return labels
    
    def get_existing_labels(self, repo_owner: str, repo_name: str, issue_number: int) -> List[str]:
        """현재 이슈에 있는 라벨들을 가져오기"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            issue_data = response.json()
            return [label['name'] for label in issue_data.get('labels', [])]
        return []
    
    def add_labels_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, labels: List[str]) -> bool:
        """이슈에 라벨 추가"""
        if not labels:
            return True
            
        # 기존 라벨 확인
        existing_labels = self.get_existing_labels(repo_owner, repo_name, issue_number)
        
        # 중복되지 않는 새 라벨들만 추가
        new_labels = [label for label in labels if label not in existing_labels]
        
        if not new_labels:
            print(f"모든 라벨이 이미 존재합니다: {existing_labels}")
            return True
        
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/labels"
        response = requests.post(url, headers=self.headers, json=new_labels)
        
        if response.status_code == 200:
            print(f"라벨 추가 성공: {new_labels}")
            return True
        else:
            print(f"라벨 추가 실패: {response.status_code}, {response.text}")
            return False
    
    def add_comment_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, comment: str) -> bool:
        """이슈에 댓글 추가"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.post(url, headers=self.headers, json={"body": comment})
        
        if response.status_code == 201:
            print("환영 댓글 추가 성공")
            return True
        else:
            print(f"댓글 추가 실패: {response.status_code}")
            return False
    
    def process_issue(self, issue_body: str, issue_title: str, repo_owner: str, repo_name: str, issue_number: int):
        """이슈 처리 메인 로직"""
        print(f"이슈 #{issue_number} 자동 라벨링 시작...")
        
        # 1. 이슈 타입 감지 및 라벨링
        suggested_labels = self.detect_issue_type(issue_body, issue_title)
        print(f"감지된 라벨들: {suggested_labels}")
        
        # 2. 라벨 추가
        if suggested_labels:
            success = self.add_labels_to_issue(repo_owner, repo_name, issue_number, suggested_labels)
            if not success:
                return False
        
        # 3. 환영 댓글 추가 (용어 추가 이슈인 경우)
        if 'term-addition' in suggested_labels:
            welcome_comment = """## 🤖 자동 처리 시작

안녕하세요! 새로운 용어 기여에 관심을 가져주셔서 감사합니다! 🎉

이 이슈는 자동으로 **용어 추가** 유형으로 분류되었습니다. 

### 🔄 자동 처리 단계
1. **✅ 자동 라벨링 완료** ← 현재 단계
2. **🔍 자동 검증 진행** ← 다음 단계  
3. **👥 전문가 검토** ← 검증 통과 후
4. **🚀 용어집 반영** ← 승인 후

### ⏱️ 예상 소요 시간
- 자동 검증: **즉시 시작**
- 전문가 검토: **1-3일**
- 최종 반영: **승인 후 자동**

곧 자동 검증이 시작됩니다. 검증 결과에 따라 추가 안내를 드릴 예정입니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, welcome_comment)
        
        print("✅ 자동 라벨링 완료")
        return True

def main():
    parser = argparse.ArgumentParser(description='이슈 자동 라벨링')
    parser.add_argument('--issue-number', required=True, help='이슈 번호')
    parser.add_argument('--issue-body', required=True, help='이슈 본문')
    parser.add_argument('--issue-title', required=True, help='이슈 제목')
    parser.add_argument('--github-token', required=True, help='GitHub 토큰')
    parser.add_argument('--repo-owner', required=True, help='저장소 소유자')
    parser.add_argument('--repo-name', required=True, help='저장소 이름')
    
    args = parser.parse_args()
    
    labeler = IssueAutoLabeler(args.github_token)
    
    try:
        success = labeler.process_issue(
            args.issue_body,
            args.issue_title,
            args.repo_owner,
            args.repo_name,
            int(args.issue_number)
        )
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"자동 라벨링 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()