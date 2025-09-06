#!/usr/bin/env python3
"""
용어 추가 이슈 검증 스크립트
GitHub Issue의 필수 필드 완성도를 확인하고 자동 라벨링 수행
"""

import argparse
import json
import re
import requests
import sys
from typing import Dict, List, Optional


class TermIssueValidator:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.repo = 'kr-glossary'  # 실제 저장소명으로 수정 필요
        
    def parse_issue_body(self, issue_body: str) -> Dict[str, str]:
        """이슈 본문을 파싱하여 필드별 값 추출"""
        fields = {}
        
        # GitHub Issue Form 형태의 데이터 파싱
        patterns = {
            'contribution_type': r'### 기여 유형\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'term_english': r'### 영어 용어\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'term_korean': r'### 한국어 번역\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'category': r'### 카테고리\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'definition_korean': r'### 한국어 정의\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'definition_english': r'### 영어 정의\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'usage_examples': r'### 사용 예시\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'references': r'### 참고 문헌\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'github_username': r'### GitHub 사용자명\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
        }
        
        for field, pattern in patterns.items():
            match = re.search(pattern, issue_body, re.DOTALL | re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                # 빈 값이나 placeholder 제거
                if value and not value.startswith(('예:', '_No response_', 'placeholder')):
                    fields[field] = value
                    
        return fields
    
    def validate_required_fields(self, fields: Dict[str, str]) -> List[str]:
        """필수 필드 검증"""
        required_fields = [
            'contribution_type',
            'term_english', 
            'term_korean',
            'category',
            'definition_korean',
            'definition_english', 
            'usage_examples',
            'references',
            'github_username'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in fields or not fields[field].strip():
                missing_fields.append(field)
                
        return missing_fields
    
    def check_duplicate_terms(self, english_term: str, korean_term: str) -> bool:
        """기존 용어와 중복 검사"""
        try:
            # 기존 용어 데이터 가져오기
            url = f'https://api.github.com/repos/{self.repo}/contents/data/terms/terms-a-z.json'
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                content = response.json()['content']
                import base64
                terms_data = json.loads(base64.b64decode(content).decode('utf-8'))
                
                for term in terms_data:
                    if (term.get('english', '').lower() == english_term.lower() or 
                        term.get('korean', '') == korean_term):
                        return True
                        
        except Exception as e:
            print(f"중복 검사 실패: {e}")
            
        return False
    
    def validate_data_quality(self, fields: Dict[str, str]) -> List[str]:
        """데이터 품질 검증"""
        issues = []
        
        # 정의 길이 검사
        if 'definition_korean' in fields:
            if len(fields['definition_korean']) < 20:
                issues.append("한국어 정의가 너무 짧습니다 (최소 20자)")
                
        if 'definition_english' in fields:
            if len(fields['definition_english']) < 20:
                issues.append("영어 정의가 너무 짧습니다 (최소 20자)")
        
        # GitHub 사용자명 형식 검사
        if 'github_username' in fields:
            username = fields['github_username'].replace('@', '')
            if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$', username):
                issues.append("올바르지 않은 GitHub 사용자명 형식입니다")
                
        return issues
    
    def add_labels(self, issue_number: int, labels: List[str]):
        """이슈에 라벨 추가"""
        url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}/labels'
        data = {'labels': labels}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 200:
            print(f"라벨 추가 실패: {response.status_code}")
    
    def remove_labels(self, issue_number: int, labels: List[str]):
        """이슈에서 라벨 제거"""
        for label in labels:
            url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}/labels/{label}'
            requests.delete(url, headers=self.headers)
    
    def add_comment(self, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}/comments'
        data = {'body': comment}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def validate_issue(self, issue_number: int, issue_body: str):
        """이슈 검증 메인 로직"""
        print(f"이슈 #{issue_number} 검증 시작")
        
        # 이슈 본문 파싱
        fields = self.parse_issue_body(issue_body)
        print(f"파싱된 필드: {list(fields.keys())}")
        
        # 필수 필드 검증
        missing_fields = self.validate_required_fields(fields)
        data_issues = self.validate_data_quality(fields)
        
        labels_to_add = []
        labels_to_remove = []
        
        if missing_fields:
            print(f"누락된 필수 필드: {missing_fields}")
            labels_to_add.append('needs-completion')
            labels_to_remove.extend(['auto-validated', 'ready-for-review'])
            
            # 보완 요청 댓글
            missing_fields_kr = {
                'contribution_type': '기여 유형',
                'term_english': '영어 용어',
                'term_korean': '한국어 번역',
                'category': '카테고리',
                'definition_korean': '한국어 정의',
                'definition_english': '영어 정의',
                'usage_examples': '사용 예시',
                'references': '참고 문헌',
                'github_username': 'GitHub 사용자명'
            }
            
            missing_list = [missing_fields_kr.get(field, field) for field in missing_fields]
            comment = f"""## 🔍 자동 검증 결과

이슈를 검토한 결과, 다음 필수 필드가 누락되었습니다:

{chr(10).join([f"- ❌ **{field}**" for field in missing_list])}

### 📝 조치 필요사항
1. 위의 누락된 필드를 모두 작성해주세요
2. 필드 작성 후 이슈를 수정(Edit)하면 자동으로 재검증됩니다
3. 모든 필수 필드 완성 시 `ready-for-review` 라벨이 자동 추가됩니다

### 💡 도움이 필요하시면
- [용어 추가 가이드](WORKFLOW.md#새로운-용어-추가) 참조
- 질문이 있으시면 댓글로 문의해주세요

---
*이 댓글은 자동으로 생성되었습니다. 필드 완성 후 재검증이 진행됩니다.*"""
            
            self.add_comment(issue_number, comment)
            
        elif data_issues:
            print(f"데이터 품질 이슈: {data_issues}")
            labels_to_add.append('needs-improvement')
            labels_to_remove.extend(['auto-validated', 'ready-for-review'])
            
            issues_list = [f"- ⚠️ {issue}" for issue in data_issues]
            comment = f"""## 📊 데이터 품질 검증 결과

이슈 내용을 검토한 결과, 다음 사항을 개선해주세요:

{chr(10).join(issues_list)}

### 📝 조치 필요사항
개선 완료 후 이슈를 수정하면 재검증이 진행됩니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment(issue_number, comment)
            
        else:
            # 중복 검사
            if 'term_english' in fields and 'term_korean' in fields:
                is_duplicate = self.check_duplicate_terms(
                    fields['term_english'], 
                    fields['term_korean']
                )
                
                if is_duplicate:
                    print("중복 용어 발견")
                    labels_to_add.append('duplicate-found')
                    labels_to_remove.extend(['auto-validated', 'ready-for-review'])
                    
                    comment = """## 🔍 중복 용어 검사 결과

⚠️ **중복 용어가 발견되었습니다.**

이미 용어집에 등록된 용어와 동일하거나 유사합니다.

### 📝 조치 방안
1. **기존 용어 개선**: 기존 용어의 정의나 번역을 개선하고 싶다면 `term-modification` 라벨로 새로운 이슈를 생성해주세요
2. **다중 정의 추가**: 같은 용어의 다른 의미를 추가하고 싶다면 기존 용어에 새로운 정의를 추가하는 방식을 고려해주세요
3. **용어 재검토**: 혹시 다른 용어나 번역을 사용할 수 있는지 검토해주세요

관리자가 추가 검토를 진행하겠습니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
                    
                    self.add_comment(issue_number, comment)
                else:
                    print("모든 검증 통과")
                    labels_to_add.extend(['auto-validated', 'ready-for-review'])
                    labels_to_remove.extend(['needs-completion', 'needs-improvement'])
                    
                    comment = """## ✅ 자동 검증 완료

모든 필수 필드가 완성되고 검증을 통과했습니다!

### 📋 검증 통과 항목
- ✅ 모든 필수 필드 완성
- ✅ 데이터 품질 기준 충족  
- ✅ 중복 용어 검사 통과

### 🔄 다음 단계
1. 관리자들에게 자동으로 할당되었습니다
2. 전문가 검토가 진행됩니다 (예상 소요시간: 3-5일)
3. 승인 완료 시 자동으로 PR이 생성됩니다

검토 중 추가 질문이나 수정 요청이 있을 수 있습니다.

---
*이 댓글은 자동으로 생성되었습니다.*"""
                    
                    self.add_comment(issue_number, comment)
        
        # 라벨 업데이트
        if labels_to_add:
            self.add_labels(issue_number, labels_to_add)
        if labels_to_remove:
            self.remove_labels(issue_number, labels_to_remove)
            
        print(f"검증 완료 - 추가된 라벨: {labels_to_add}, 제거된 라벨: {labels_to_remove}")


def main():
    parser = argparse.ArgumentParser(description='용어 추가 이슈 검증')
    parser.add_argument('--issue-number', type=int, required=True)
    parser.add_argument('--issue-body', required=True) 
    parser.add_argument('--github-token', required=True)
    
    args = parser.parse_args()
    
    validator = TermIssueValidator(args.github_token)
    validator.validate_issue(args.issue_number, args.issue_body)


if __name__ == '__main__':
    main()