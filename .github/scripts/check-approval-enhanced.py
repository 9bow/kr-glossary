#!/usr/bin/env python3
"""
개선된 관리자 승인 체크 및 자동 PR 생성 트리거 스크립트
실제 GitHub 관리자 권한 확인 및 포괄적인 승인 키워드 인식
"""

import argparse
import requests
import re
import json
from typing import List, Dict, Optional


class ApprovalChecker:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        # 관리자 목록은 GitHub API에서 동적으로 가져옴
        self.admins = []
        
        # 승인 키워드 패턴 (더 포괄적으로)
        self.approval_patterns = [
            r'✅\s*승인',
            r'/approve',
            r'LGTM',
            r'lgtm',
            r'승인합니다',
            r'승인\s*$',
            r'승인\s*!',
            r'approved',
            r'approve\s*$',
            r'👍',
            r'looks\s+good\s+to\s+me',
            r'좋습니다',
            r'괜찮습니다',
            r'통과',
            r'OK',
            r'ok\s*$',
            r'좋네요'
        ]
    
    def load_repo_admins(self, repo_owner: str, repo_name: str) -> List[str]:
        """저장소의 실제 관리자 목록 가져오기"""
        try:
            collaborators_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/collaborators"
            response = requests.get(collaborators_url, headers=self.headers)
            
            if response.status_code == 200:
                collaborators = response.json()
                admins = []
                
                for collab in collaborators:
                    username = collab['login']
                    permissions = collab.get('permissions', {})
                    
                    # 관리자 권한을 가진 사용자들만 추출
                    if permissions.get('admin') or permissions.get('maintain'):
                        admins.append(username)
                
                print(f"저장소 관리자 {len(admins)}명 로드됨: {', '.join(admins)}")
                return admins
            else:
                print(f"관리자 목록 로드 실패: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"관리자 목록 로드 중 오류: {e}")
            return []
    
    def load_approval_config(self, repo_owner: str, repo_name: str) -> Dict:
        """승인 설정 및 키워드 로드"""
        try:
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/.github/config/admins.json"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                file_data = response.json()
                import base64
                content = base64.b64decode(file_data['content']).decode('utf-8')
                config = json.loads(content)
                
                # 설정 파일의 승인 키워드 사용
                approval_keywords = config.get('approval_keywords', {}).get('approval', [])
                if approval_keywords:
                    # 기본 패턴에 설정 파일의 키워드 추가
                    for keyword in approval_keywords:
                        # 특수문자 이스케이프 처리
                        escaped_keyword = re.escape(keyword)
                        self.approval_patterns.append(escaped_keyword)
                
                return config
            else:
                print("승인 설정 파일을 찾을 수 없습니다. 기본 설정 사용.")
                return {}
                
        except Exception as e:
            print(f"승인 설정 로드 실패: {e}")
            return {}
    
    def is_admin(self, username: str) -> bool:
        """사용자가 관리자인지 확인"""
        return username in self.admins
    
    def is_approval_comment(self, comment_body: str) -> bool:
        """댓글이 승인 댓글인지 확인"""
        comment_lower = comment_body.lower().strip()
        
        for pattern in self.approval_patterns:
            if re.search(pattern, comment_body, re.IGNORECASE | re.MULTILINE):
                return True
                
        return False
    
    def get_issue_details(self, repo_owner: str, repo_name: str, issue_number: int) -> Optional[Dict]:
        """이슈 정보 가져오기"""
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}'
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_issue_comments(self, repo_owner: str, repo_name: str, issue_number: int) -> List[Dict]:
        """이슈의 모든 댓글 가져오기"""
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments'
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        return []
    
    def count_approvals(self, repo_owner: str, repo_name: str, issue_number: int) -> int:
        """승인 수 카운트"""
        comments = self.get_issue_comments(repo_owner, repo_name, issue_number)
        approvals = set()  # 중복 승인 방지
        
        for comment in comments:
            author = comment['user']['login']
            body = comment['body']
            
            if self.is_admin(author) and self.is_approval_comment(body):
                approvals.add(author)
                print(f"승인 확인: @{author} - \"{body[:50]}{'...' if len(body) > 50 else ''}\"")
                
        return len(approvals)
    
    def add_labels(self, repo_owner: str, repo_name: str, issue_number: int, labels: List[str]):
        """이슈에 라벨 추가"""
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/labels'
        data = {'labels': labels}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 200:
            print(f"라벨 추가 실패: {response.status_code}")
    
    def remove_labels(self, repo_owner: str, repo_name: str, issue_number: int, labels: List[str]):
        """이슈에서 라벨 제거"""
        for label in labels:
            url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/labels/{label}'
            requests.delete(url, headers=self.headers)
    
    def add_comment(self, repo_owner: str, repo_name: str, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments'
        data = {'body': comment}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def trigger_auto_pr(self, repo_owner: str, repo_name: str, issue_number: int):
        """자동 PR 생성 워크플로우 트리거"""
        url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/dispatches'
        data = {
            'event_type': 'create_pr_from_issue',
            'client_payload': {
                'issue_number': issue_number
            }
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 204:
            print(f"PR 생성 트리거 실패: {response.status_code}")
            return False
        return True
    
    def check_approval(self, repo_owner: str, repo_name: str, issue_number: int, comment_author: str, comment_body: str):
        """승인 체크 메인 로직"""
        print(f"이슈 #{issue_number}의 승인 댓글 체크: @{comment_author}")
        
        # 관리자 목록 로드
        self.admins = self.load_repo_admins(repo_owner, repo_name)
        if not self.admins:
            print("관리자 목록을 로드할 수 없습니다.")
            return
        
        # 승인 설정 로드
        config = self.load_approval_config(repo_owner, repo_name)
        
        # 관리자가 아닌 경우 무시
        if not self.is_admin(comment_author):
            print(f"@{comment_author}는 관리자가 아닙니다.")
            return
        
        # 승인 댓글이 아닌 경우 무시
        if not self.is_approval_comment(comment_body):
            print("승인 댓글이 아닙니다.")
            return
        
        # 이슈 정보 가져오기
        issue = self.get_issue_details(repo_owner, repo_name, issue_number)
        if not issue:
            print("이슈 정보를 가져올 수 없습니다.")
            return
        
        # ready-for-review 라벨이 없으면 무시
        issue_labels = [label['name'] for label in issue['labels']]
        if 'ready-for-review' not in issue_labels:
            print("ready-for-review 라벨이 없어서 승인을 진행하지 않습니다.")
            return
        
        # 총 승인 수 확인
        total_approvals = self.count_approvals(repo_owner, repo_name, issue_number)
        required_approvals = 1  # 필요 승인 수
        
        print(f"현재 승인 수: {total_approvals}/{required_approvals}")
        
        if total_approvals >= required_approvals:
            print("필요한 승인 수에 도달했습니다. 자동 PR 생성을 시작합니다.")
            
            # 승인 완료 라벨 추가
            self.add_labels(repo_owner, repo_name, issue_number, ['approved'])
            self.remove_labels(repo_owner, repo_name, issue_number, ['ready-for-review'])
            
            # 승인 완료 댓글
            approvers = []
            comments = self.get_issue_comments(repo_owner, repo_name, issue_number)
            for comment in comments:
                author = comment['user']['login']
                if self.is_admin(author) and self.is_approval_comment(comment['body']):
                    approvers.append(f"@{author}")
            
            approvers_list = ', '.join(list(set(approvers)))
            
            comment = f"""## ✅ 승인 완료

관리자 승인이 완료되었습니다!

### 👥 승인자
{approvers_list}

### 🔄 다음 단계
1. 자동으로 PR이 생성됩니다
2. 임시 미리보기 사이트가 빌드됩니다  
3. 최종 검토 후 병합이 진행됩니다

잠시 후 PR 링크가 댓글로 추가됩니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment(repo_owner, repo_name, issue_number, comment)
            
            # 자동 PR 생성 트리거
            if self.trigger_auto_pr(repo_owner, repo_name, issue_number):
                print("자동 PR 생성이 트리거되었습니다.")
            else:
                print("자동 PR 생성 트리거에 실패했습니다.")
                # 실패 시 라벨 롤백
                self.remove_labels(repo_owner, repo_name, issue_number, ['approved'])
                self.add_labels(repo_owner, repo_name, issue_number, ['ready-for-review', 'pr-creation-failed'])
        else:
            print(f"아직 승인이 부족합니다. ({total_approvals}/{required_approvals})")
            
            # 부분 승인 댓글 (첫 승인인 경우만)
            if total_approvals == 1:
                remaining = required_approvals - total_approvals
                comment = f"""## 🔄 승인 진행 중

@{comment_author}님의 승인이 확인되었습니다.

### 📊 승인 현황
- ✅ 승인 완료: **{total_approvals}**/{required_approvals}
- ⏳ 추가 필요: **{remaining}**명

모든 승인이 완료되면 자동으로 PR이 생성됩니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
                
                self.add_comment(repo_owner, repo_name, issue_number, comment)


def main():
    parser = argparse.ArgumentParser(description='개선된 관리자 승인 체크')
    parser.add_argument('--issue-number', type=int, required=True)
    parser.add_argument('--comment-author', required=True)
    parser.add_argument('--comment-body', required=True)
    parser.add_argument('--github-token', required=True)
    parser.add_argument('--repo-owner', default='anthropics', help='저장소 소유자')
    parser.add_argument('--repo-name', default='kr-glossary', help='저장소 이름')
    
    args = parser.parse_args()
    
    checker = ApprovalChecker(args.github_token)
    checker.check_approval(args.repo_owner, args.repo_name, args.issue_number, 
                          args.comment_author, args.comment_body)


if __name__ == '__main__':
    main()