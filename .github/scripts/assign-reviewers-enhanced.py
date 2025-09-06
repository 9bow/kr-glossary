#!/usr/bin/env python3
"""
강화된 관리자 자동 할당 스크립트
전문 분야별 관리자 매칭과 스마트 할당 시스템
"""

import argparse
import json
import random
import requests
import sys
from typing import Dict, List, Optional

class ReviewerAssigner:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    
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
            print(f"관리자 설정 로드 실패: {e}")
        
        return {}
    
    def get_issue_info(self, repo_owner: str, repo_name: str, issue_number: int) -> Dict:
        """이슈 정보 가져오기"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"이슈 조회 실패: {response.status_code}")
            return {}
    
    def extract_specialization_from_issue(self, issue_body: str, admin_config: Dict) -> Optional[str]:
        """이슈에서 전문 분야 추출"""
        import re
        
        # 카테고리 추출 패턴
        category_pattern = r'카테고리.*?\n.*?- (.+)'
        match = re.search(category_pattern, issue_body, re.MULTILINE)
        
        if match:
            category = match.group(1).strip()
            specialization_mapping = admin_config.get('specialization_mapping', {})
            return specialization_mapping.get(category)
        
        return None
    
    def get_eligible_reviewers(self, issue_labels: List[str], specialization: Optional[str], admin_config: Dict) -> List[Dict]:
        """적합한 검토자 목록 반환"""
        
        # 이슈 카테고리 확인
        category = None
        label_to_category = {
            'term-addition': 'term-addition',
            'term-modification': 'term-modification',
            'contributor-addition': 'contributor-addition',
            'admin-addition': 'admin-addition',
            'organization-addition': 'organization-addition',
            'verification-org': 'verification-org'
        }
        
        for label in issue_labels:
            if label in label_to_category:
                category = label_to_category[label]
                break
        
        if not category:
            return []
        
        # 승인 규칙 확인
        approval_rules = admin_config.get('approval_rules', {}).get(category, {})
        required_roles = approval_rules.get('required_roles', ['reviewer'])
        specialization_match = approval_rules.get('specialization_match', False)
        
        eligible_reviewers = []
        admins = admin_config.get('admins', {})
        
        for username, admin_info in admins.items():
            # 활성 상태 확인
            if not admin_info.get('active', True):
                continue
            
            # 역할 확인
            if admin_info.get('role') not in required_roles:
                continue
            
            # 전문 분야 매칭 (필요한 경우)
            if specialization_match and specialization:
                admin_specializations = admin_info.get('specializations', [])
                if specialization not in admin_specializations and '전체 영역' not in admin_specializations:
                    continue
            
            eligible_reviewers.append({
                'username': username,
                'role': admin_info.get('role'),
                'specializations': admin_info.get('specializations', []),
                'name': admin_info.get('name'),
                'specialization_match': specialization in admin_info.get('specializations', []) if specialization else False
            })
        
        return eligible_reviewers
    
    def select_reviewers(self, eligible_reviewers: List[Dict], admin_config: Dict, specialization: Optional[str]) -> List[str]:
        """검토자 선택 로직"""
        
        auto_assignment = admin_config.get('auto_assignment', {})
        max_assignees = auto_assignment.get('max_assignees', 3)
        strategy = auto_assignment.get('assignment_strategy', 'round_robin')
        prefer_specialization = auto_assignment.get('prefer_specialization', True)
        
        if not eligible_reviewers:
            return []
        
        # 전문 분야 우선 할당
        if prefer_specialization and specialization:
            specialized_reviewers = [r for r in eligible_reviewers if r['specialization_match']]
            if specialized_reviewers:
                if strategy == 'random':
                    selected = random.sample(specialized_reviewers, min(max_assignees, len(specialized_reviewers)))
                else:  # round_robin 또는 기본값
                    # 역할 우선순위: owner > maintainer > reviewer
                    role_priority = {'owner': 3, 'maintainer': 2, 'reviewer': 1}
                    specialized_reviewers.sort(key=lambda x: role_priority.get(x['role'], 0), reverse=True)
                    selected = specialized_reviewers[:max_assignees]
                
                return [r['username'] for r in selected]
        
        # 일반 할당
        if strategy == 'random':
            selected = random.sample(eligible_reviewers, min(max_assignees, len(eligible_reviewers)))
        else:  # round_robin 또는 기본값
            # 역할 우선순위로 정렬
            role_priority = {'owner': 3, 'maintainer': 2, 'reviewer': 1}
            eligible_reviewers.sort(key=lambda x: role_priority.get(x['role'], 0), reverse=True)
            selected = eligible_reviewers[:max_assignees]
        
        return [r['username'] for r in selected]
    
    def assign_reviewers_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, assignees: List[str]) -> bool:
        """이슈에 검토자 할당"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/assignees"
        payload = {"assignees": assignees}
        
        response = requests.post(url, headers=self.headers, json=payload)
        
        if response.status_code == 201:
            print(f"검토자 할당 성공: {assignees}")
            return True
        else:
            print(f"검토자 할당 실패: {response.status_code}")
            return False
    
    def add_comment_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.post(url, headers=self.headers, json={"body": comment})
        
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def generate_assignment_comment(self, assigned_reviewers: List[str], admin_config: Dict, 
                                  specialization: Optional[str], category: str) -> str:
        """할당 알림 댓글 생성"""
        
        comment = """## 👥 관리자 자동 할당

검증이 완료되어 다음 관리자들이 자동 할당되었습니다:

"""
        
        admins = admin_config.get('admins', {})
        
        for username in assigned_reviewers:
            admin_info = admins.get(username, {})
            name = admin_info.get('name', username)
            role = admin_info.get('role', 'reviewer')
            specializations = admin_info.get('specializations', [])
            
            role_emoji = {'owner': '👑', 'maintainer': '🛠️', 'reviewer': '📝'}.get(role, '👤')
            
            comment += f"- {role_emoji} @{username} ({name}) - {role}"
            
            if specialization and specialization in specializations:
                comment += f" ⭐ **{specialization} 전문가**"
            
            comment += "\n"
        
        approval_rules = admin_config.get('approval_rules', {}).get(category, {})
        min_approvals = approval_rules.get('min_approvals', 1)
        
        comment += f"""
### 📋 검토 요청 사항

**카테고리**: {category}
**전문 분야**: {specialization or 'N/A'}
**필요한 승인 수**: {min_approvals}개

### 🔍 검토 체크리스트

관리자님들께서는 다음 항목들을 검토해주세요:

"""
        
        if category == 'term-addition':
            comment += """- ✅ **번역 정확성**: 한국어 번역이 영어 원어의 의미를 정확히 반영하는가?
- ✅ **정의 명확성**: 정의가 이해하기 쉽고 완전한가?
- ✅ **예시 적절성**: 사용 예시가 실제 사용 맥락을 잘 보여주는가?
- ✅ **참고문헌 신뢰성**: 참고 자료가 신뢰할 수 있는 출처인가?
- ✅ **일관성**: 기존 용어집의 스타일과 일관성을 유지하는가?"""
        
        elif category == 'term-modification':
            comment += """- ✅ **수정 필요성**: 제안된 수정이 실제로 필요한가?
- ✅ **수정 정확성**: 수정 내용이 올바른가?
- ✅ **영향도**: 다른 용어나 정의에 미치는 영향이 있는가?
- ✅ **일관성 유지**: 전체적인 일관성이 유지되는가?"""
        
        else:
            comment += """- ✅ **정보 정확성**: 제공된 정보가 정확한가?
- ✅ **완성도**: 모든 필요한 정보가 포함되어 있는가?
- ✅ **적절성**: 요청 내용이 프로젝트에 적합한가?"""
        
        comment += f"""

### 💬 승인 방법

검토가 완료되면 다음과 같이 댓글을 남겨주세요:
- ✅ **승인**: `승인` 또는 `approve` 또는 `LGTM`
- ❌ **수정 요청**: `수정 요청` 또는 `needs work` + 구체적인 피드백
- 🔄 **조건부 승인**: `조건부 승인: [조건]`

### ⏱️ 예상 처리 시간

- **일반 검토**: 1-3일
- **복잡한 검토**: 3-5일  
- **긴급 처리**: 이슈에 `priority-high` 라벨 추가

감사합니다! 🙏

---
*이 댓글은 자동으로 생성되었습니다.*"""
        
        return comment
    
    def process_reviewer_assignment(self, repo_owner: str, repo_name: str, issue_number: int, issue_labels: List[str]) -> bool:
        """검토자 할당 전체 프로세스"""
        
        # 관리자 설정 로드
        admin_config = self.load_admin_config(repo_owner, repo_name)
        if not admin_config:
            print("관리자 설정을 로드할 수 없습니다")
            return False
        
        # 이슈 정보 가져오기
        issue = self.get_issue_info(repo_owner, repo_name, issue_number)
        if not issue:
            print("이슈 정보를 가져올 수 없습니다")
            return False
        
        issue_body = issue.get('body', '')
        
        # 전문 분야 추출
        specialization = self.extract_specialization_from_issue(issue_body, admin_config)
        
        # 적합한 검토자 찾기
        eligible_reviewers = self.get_eligible_reviewers(issue_labels, specialization, admin_config)
        
        if not eligible_reviewers:
            print("적합한 검토자를 찾을 수 없습니다")
            return False
        
        # 검토자 선택
        selected_reviewers = self.select_reviewers(eligible_reviewers, admin_config, specialization)
        
        if not selected_reviewers:
            print("검토자 선택에 실패했습니다")
            return False
        
        # 검토자 할당
        success = self.assign_reviewers_to_issue(repo_owner, repo_name, issue_number, selected_reviewers)
        
        if success:
            # 할당 알림 댓글 추가
            category = None
            label_to_category = {
                'term-addition': 'term-addition',
                'term-modification': 'term-modification',
                'contributor-addition': 'contributor-addition',
                'admin-addition': 'admin-addition',
                'organization-addition': 'organization-addition'
            }
            
            for label in issue_labels:
                if label in label_to_category:
                    category = label_to_category[label]
                    break
            
            if category:
                assignment_comment = self.generate_assignment_comment(
                    selected_reviewers, admin_config, specialization, category
                )
                self.add_comment_to_issue(repo_owner, repo_name, issue_number, assignment_comment)
        
        return success

def main():
    parser = argparse.ArgumentParser(description='강화된 검토자 자동 할당')
    parser.add_argument('--issue-number', required=True, help='이슈 번호')
    parser.add_argument('--issue-labels', required=True, help='이슈 라벨 (쉼표로 구분)')
    parser.add_argument('--github-token', required=True, help='GitHub 토큰')
    parser.add_argument('--repo-owner', default='anthropics', help='저장소 소유자')
    parser.add_argument('--repo-name', default='kr-glossary', help='저장소 이름')
    
    args = parser.parse_args()
    
    # 라벨을 리스트로 변환
    issue_labels = [label.strip() for label in args.issue_labels.split(',') if label.strip()]
    
    assigner = ReviewerAssigner(args.github_token)
    
    try:
        success = assigner.process_reviewer_assignment(
            args.repo_owner,
            args.repo_name,
            int(args.issue_number),
            issue_labels
        )
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"검토자 할당 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()