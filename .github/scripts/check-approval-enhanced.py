#!/usr/bin/env python3
"""
강화된 관리자 승인 확인 스크립트
더 정교한 승인 로직과 전문 분야별 관리자 시스템
"""

import argparse
import json
import re
import requests
import sys
from typing import Dict, List, Optional, Set

class AdminApprovalChecker:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
        
        # 관리자 정보 (실제로는 별도 파일에서 로드)
        self.admins = {
            # 예시 관리자 정보 - 실제 구현에서는 .github/config/admins.json에서 로드
            'ai-expert-1': {
                'role': 'owner',
                'specializations': ['ML', 'DL', 'NLP'],
                'permissions': ['approve', 'merge', 'admin']
            },
            'nlp-specialist': {
                'role': 'maintainer', 
                'specializations': ['NLP', 'GAI'],
                'permissions': ['approve', 'merge']
            },
            'cv-researcher': {
                'role': 'reviewer',
                'specializations': ['CV', 'DL'],
                'permissions': ['approve']
            }
        }
        
        # 승인 키워드 패턴
        self.approval_patterns = [
            r'^\s*승인\s*$',
            r'^\s*approve\s*$',
            r'^\s*approved\s*$',
            r'^\s*lgtm\s*$',
            r'^\s*looks good to me\s*$',
            r'^\s*✅\s*승인\s*$',
            r'^\s*/approve\s*$',
            r'^\s*👍\s*승인\s*$'
        ]
        
        self.rejection_patterns = [
            r'^\s*거부\s*$',
            r'^\s*reject\s*$',
            r'^\s*rejected\s*$',
            r'^\s*반려\s*$',
            r'^\s*❌\s*반려\s*$',
            r'^\s*/reject\s*$',
            r'^\s*needs?\s+work\s*$',
            r'^\s*변경\s*요청\s*$'
        ]
    
    def load_admin_config(self, repo_owner: str, repo_name: str) -> Dict:
        """관리자 설정 파일 로드"""
        try:
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/.github/config/admins.json"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                file_data = response.json()
                import base64
                content = base64.b64decode(file_data['content']).decode('utf-8')
                return json.loads(content)
        except Exception as e:
            print(f"관리자 설정 로드 실패, 기본값 사용: {e}")
        
        # 기본 관리자 설정 반환
        return {
            "admins": self.admins,
            "approval_rules": {
                "term-addition": {
                    "min_approvals": 1,
                    "required_roles": ["owner", "maintainer", "reviewer"],
                    "specialization_match": True
                },
                "term-modification": {
                    "min_approvals": 1,
                    "required_roles": ["reviewer", "maintainer", "owner"]
                },
                "contributor-addition": {
                    "min_approvals": 2,
                    "required_roles": ["maintainer", "owner"]
                }
            }
        }
    
    def get_issue_category(self, issue_labels: List[str]) -> Optional[str]:
        """이슈 라벨에서 카테고리 추출"""
        label_to_category = {
            'term-addition': 'term-addition',
            'term-modification': 'term-modification', 
            'contributor-addition': 'contributor-addition',
            'admin-addition': 'admin-addition',
            'organization-addition': 'organization-addition'
        }
        
        for label in issue_labels:
            if label in label_to_category:
                return label_to_category[label]
        
        return None
    
    def get_issue_specialization(self, issue_body: str) -> Optional[str]:
        """이슈 본문에서 전문 분야 추출"""
        # 카테고리 추출 패턴
        category_pattern = r'카테고리.*?\n.*?- (.+)'
        match = re.search(category_pattern, issue_body, re.MULTILINE)
        
        if match:
            category = match.group(1).strip()
            category_mapping = {
                'ML (Machine Learning)': 'ML',
                'DL (Deep Learning)': 'DL', 
                'NLP (Natural Language Processing)': 'NLP',
                'CV (Computer Vision)': 'CV',
                'RL (Reinforcement Learning)': 'RL',
                'GAI (Generative AI)': 'GAI'
            }
            return category_mapping.get(category)
        
        return None
    
    def is_admin(self, username: str, admin_config: Dict) -> bool:
        """사용자가 관리자인지 확인"""
        return username in admin_config.get('admins', {})
    
    def get_admin_role(self, username: str, admin_config: Dict) -> Optional[str]:
        """관리자의 역할 반환"""
        admin_info = admin_config.get('admins', {}).get(username)
        return admin_info.get('role') if admin_info else None
    
    def has_specialization(self, username: str, required_specialization: str, admin_config: Dict) -> bool:
        """관리자가 해당 전문 분야를 담당하는지 확인"""
        admin_info = admin_config.get('admins', {}).get(username)
        if not admin_info:
            return False
        
        specializations = admin_info.get('specializations', [])
        return required_specialization in specializations or '전체 영역' in specializations
    
    def is_approval_comment(self, comment_body: str) -> bool:
        """댓글이 승인 댓글인지 확인"""
        comment_lower = comment_body.lower().strip()
        
        for pattern in self.approval_patterns:
            if re.match(pattern, comment_lower, re.IGNORECASE):
                return True
        
        return False
    
    def is_rejection_comment(self, comment_body: str) -> bool:
        """댓글이 반려 댓글인지 확인"""
        comment_lower = comment_body.lower().strip()
        
        for pattern in self.rejection_patterns:
            if re.match(pattern, comment_lower, re.IGNORECASE):
                return True
        
        return False
    
    def get_issue_comments(self, repo_owner: str, repo_name: str, issue_number: int) -> List[Dict]:
        """이슈의 모든 댓글 가져오기"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"댓글 조회 실패: {response.status_code}")
            return []
    
    def get_issue_info(self, repo_owner: str, repo_name: str, issue_number: int) -> Dict:
        """이슈 정보 가져오기"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"이슈 조회 실패: {response.status_code}")
            return {}
    
    def check_approval_status(self, repo_owner: str, repo_name: str, issue_number: int) -> Dict:
        """전체 승인 상태 확인"""
        
        # 관리자 설정 로드
        admin_config = self.load_admin_config(repo_owner, repo_name)
        
        # 이슈 정보 가져오기
        issue = self.get_issue_info(repo_owner, repo_name, issue_number)
        if not issue:
            return {"approved": False, "error": "이슈 정보를 가져올 수 없음"}
        
        issue_labels = [label['name'] for label in issue.get('labels', [])]
        issue_body = issue.get('body', '')
        
        # 이슈 카테고리 및 전문 분야 확인
        category = self.get_issue_category(issue_labels)
        specialization = self.get_issue_specialization(issue_body)
        
        if not category:
            return {"approved": False, "error": "이슈 카테고리를 식별할 수 없음"}
        
        # 승인 규칙 가져오기
        approval_rules = admin_config.get('approval_rules', {}).get(category, {})
        min_approvals = approval_rules.get('min_approvals', 1)
        required_roles = approval_rules.get('required_roles', ['reviewer', 'maintainer', 'owner'])
        specialization_match = approval_rules.get('specialization_match', False)
        
        # 댓글 분석
        comments = self.get_issue_comments(repo_owner, repo_name, issue_number)
        
        approvals = []
        rejections = []
        
        for comment in comments:
            author = comment.get('user', {}).get('login')
            body = comment.get('body', '')
            
            if not self.is_admin(author, admin_config):
                continue
            
            admin_role = self.get_admin_role(author, admin_config)
            if admin_role not in required_roles:
                continue
            
            # 전문 분야 매칭 확인
            if specialization_match and specialization:
                if not self.has_specialization(author, specialization, admin_config):
                    continue
            
            if self.is_approval_comment(body):
                approvals.append({
                    'author': author,
                    'role': admin_role,
                    'specialization': specialization,
                    'comment': body,
                    'created_at': comment.get('created_at')
                })
            elif self.is_rejection_comment(body):
                rejections.append({
                    'author': author,
                    'role': admin_role,
                    'comment': body,
                    'created_at': comment.get('created_at')
                })
        
        # 승인 상태 결정
        is_approved = len(approvals) >= min_approvals and len(rejections) == 0
        
        result = {
            "approved": is_approved,
            "category": category,
            "specialization": specialization,
            "min_approvals": min_approvals,
            "current_approvals": len(approvals),
            "rejections": len(rejections),
            "approval_details": approvals,
            "rejection_details": rejections,
            "requirements_met": {
                "min_approvals": len(approvals) >= min_approvals,
                "no_rejections": len(rejections) == 0,
                "role_requirements": True,  # 이미 필터링됨
                "specialization_requirements": True  # 이미 필터링됨
            }
        }
        
        return result
    
    def add_labels_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, labels: List[str]):
        """이슈에 라벨 추가"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/labels"
        response = requests.post(url, headers=self.headers, json=labels)
        
        if response.status_code != 200:
            print(f"라벨 추가 실패: {response.status_code}")
    
    def remove_labels_from_issue(self, repo_owner: str, repo_name: str, issue_number: int, labels: List[str]):
        """이슈에서 라벨 제거"""
        for label in labels:
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/labels/{label}"
            response = requests.delete(url, headers=self.headers)
    
    def trigger_pr_creation(self, repo_owner: str, repo_name: str, issue_number: int):
        """PR 생성 트리거"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/dispatches"
        payload = {
            "event_type": "create_pr_from_issue",
            "client_payload": {
                "issue_number": issue_number,
                "trigger": "admin_approval"
            }
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        
        if response.status_code == 204:
            print(f"PR 생성 트리거 성공 - 이슈 #{issue_number}")
            return True
        else:
            print(f"PR 생성 트리거 실패: {response.status_code}")
            return False
    
    def add_comment_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.post(url, headers=self.headers, json={"body": comment})
        
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def process_approval_comment(self, repo_owner: str, repo_name: str, issue_number: int, 
                               comment_author: str, comment_body: str) -> bool:
        """승인 댓글 처리"""
        
        approval_status = self.check_approval_status(repo_owner, repo_name, issue_number)
        
        if approval_status.get("error"):
            print(f"승인 상태 확인 오류: {approval_status['error']}")
            return False
        
        if approval_status["approved"]:
            # 승인 완료 - PR 생성 트리거
            success_comment = f"""## ✅ 관리자 승인 완료

**승인 현황:**
- 필요한 승인 수: {approval_status['min_approvals']}개
- 현재 승인 수: {approval_status['current_approvals']}개
- 카테고리: {approval_status['category']}
- 전문 분야: {approval_status.get('specialization', 'N/A')}

**승인 관리자:**
"""
            
            for approval in approval_status["approval_details"]:
                success_comment += f"- @{approval['author']} ({approval['role']})\n"
            
            success_comment += """
**다음 단계:**
🔄 자동 PR 생성이 시작됩니다
🏗️ 임시 미리보기 사이트가 빌드됩니다
📝 PR에서 최종 검토가 진행됩니다

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, success_comment)
            
            # 승인 라벨 추가
            self.add_labels_to_issue(repo_owner, repo_name, issue_number, ["approved"])
            self.remove_labels_from_issue(repo_owner, repo_name, issue_number, ["needs-changes"])
            
            # PR 생성 트리거
            return self.trigger_pr_creation(repo_owner, repo_name, issue_number)
            
        elif len(approval_status["rejection_details"]) > 0:
            # 반려 처리
            rejection_comment = f"""## ❌ 관리자 반려

다음 관리자가 수정을 요청했습니다:

"""
            for rejection in approval_status["rejection_details"]:
                rejection_comment += f"- @{rejection['author']} ({rejection['role']}): {rejection['comment']}\n"
            
            rejection_comment += """
**다음 단계:**
1. 관리자의 피드백을 참고하여 이슈를 수정해주세요
2. 수정 완료 후 관리자에게 재검토를 요청하세요

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, rejection_comment)
            
            # 수정 필요 라벨 추가
            self.add_labels_to_issue(repo_owner, repo_name, issue_number, ["needs-changes"])
            self.remove_labels_from_issue(repo_owner, repo_name, issue_number, ["approved"])
            
            return False
            
        else:
            # 아직 충분한 승인이 없음
            pending_comment = f"""## ⏳ 승인 대기 중

**현재 승인 현황:**
- 필요한 승인 수: {approval_status['min_approvals']}개
- 현재 승인 수: {approval_status['current_approvals']}개
- 남은 승인 수: {approval_status['min_approvals'] - approval_status['current_approvals']}개

**이미 승인한 관리자:**
"""
            
            if approval_status["approval_details"]:
                for approval in approval_status["approval_details"]:
                    pending_comment += f"- @{approval['author']} ({approval['role']})\n"
            else:
                pending_comment += "- 아직 승인한 관리자가 없습니다\n"
            
            pending_comment += """
더 많은 관리자의 승인이 필요합니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, pending_comment)
            
            return False

def main():
    parser = argparse.ArgumentParser(description='강화된 관리자 승인 확인')
    parser.add_argument('--issue-number', required=True, help='이슈 번호')
    parser.add_argument('--comment-author', required=True, help='댓글 작성자')
    parser.add_argument('--comment-body', required=True, help='댓글 내용')
    parser.add_argument('--github-token', required=True, help='GitHub 토큰')
    parser.add_argument('--repo-owner', default='anthropics', help='저장소 소유자')
    parser.add_argument('--repo-name', default='kr-glossary', help='저장소 이름')
    
    args = parser.parse_args()
    
    checker = AdminApprovalChecker(args.github_token)
    
    try:
        success = checker.process_approval_comment(
            args.repo_owner,
            args.repo_name, 
            int(args.issue_number),
            args.comment_author,
            args.comment_body
        )
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"승인 처리 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()