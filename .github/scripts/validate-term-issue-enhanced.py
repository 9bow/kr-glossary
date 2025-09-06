#!/usr/bin/env python3
"""
강화된 용어 이슈 검증 스크립트
완전 자동화된 이슈 기반 워크플로우를 위한 상세한 검증 및 보완 요청 시스템
"""

import argparse
import json
import re
import requests
import sys
import yaml
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse

class TermIssueValidator:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
        self.validation_errors = []
        self.validation_warnings = []
        self.improvement_suggestions = []
        
    def parse_issue_body(self, issue_body: str) -> Dict:
        """이슈 본문을 파싱하여 필드별 데이터 추출"""
        parsed_data = {}
        
        # YAML 형식 이슈 템플릿에서 데이터 추출하는 정규식 패턴들
        patterns = {
            'contribution_type': r'기여 유형\s*\n.*?\n.*?- (.+)',
            'term_english': r'영어 용어\s*\n.*?\n(.+?)(?:\n|$)',
            'term_korean': r'한국어 번역\s*\n.*?\n(.+?)(?:\n|$)',
            'category': r'카테고리\s*\n.*?\n.*?- (.+)',
            'alternative_translations': r'대안 번역\s*\n.*?\n(.+?)(?:\n|$)',
            'pronunciation': r'발음\s*\n.*?\n(.+?)(?:\n|$)',
            'definition_korean': r'한국어 정의\s*\n.*?\n(.+?)(?:\n\n|\Z)',
            'definition_english': r'영어 정의\s*\n.*?\n(.+?)(?:\n\n|\Z)',
            'usage_examples': r'사용 예시\s*\n.*?\n(.+?)(?:\n\n|\Z)',
            'references': r'참고 문헌\s*\n.*?\n(.+?)(?:\n\n|\Z)',
            'related_terms': r'관련 용어\s*\n.*?\n(.+?)(?:\n|$)',
            'github_username': r'GitHub 사용자명\s*\n.*?\n(.+?)(?:\n|$)',
            'email': r'이메일.*?\n.*?\n(.+?)(?:\n|$)',
            'additional_notes': r'추가 설명\s*\n.*?\n(.+?)(?:\n\n|\Z)'
        }
        
        for field, pattern in patterns.items():
            match = re.search(pattern, issue_body, re.MULTILINE | re.DOTALL)
            if match:
                value = match.group(1).strip()
                if value and value != '_No response_' and value != '':
                    parsed_data[field] = value
        
        # 체크박스 파싱
        checkbox_patterns = {
            'manual_validation': r'수동 검증 항목.*?\n((?:\s*- \[x\].*?\n)*)',
            'agreement': r'동의 사항.*?\n((?:\s*- \[x\].*?\n)*)'
        }
        
        for field, pattern in checkbox_patterns.items():
            match = re.search(pattern, issue_body, re.MULTILINE | re.DOTALL)
            if match:
                checked_items = re.findall(r'- \[x\]\s*(.+)', match.group(1))
                parsed_data[field] = checked_items
        
        return parsed_data
    
    def validate_required_fields(self, data: Dict) -> List[str]:
        """필수 필드 검증"""
        required_fields = {
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
        
        missing_fields = []
        for field_id, field_name in required_fields.items():
            if field_id not in data or not data[field_id].strip():
                missing_fields.append(field_name)
        
        return missing_fields
    
    def validate_field_formats(self, data: Dict) -> List[str]:
        """필드 형식 검증"""
        format_errors = []
        
        # 영어 용어 검증 (영문, 숫자, 공백, 하이픈, 언더스코어만 허용)
        if 'term_english' in data:
            if not re.match(r'^[A-Za-z0-9\s\-_()]+$', data['term_english']):
                format_errors.append("영어 용어는 영문자, 숫자, 공백, 하이픈, 언더스코어, 괄호만 포함해야 합니다")
        
        # 한국어 번역 검증 (한글, 영문, 숫자, 공백, 특수문자 허용)
        if 'term_korean' in data:
            if len(data['term_korean']) < 2:
                format_errors.append("한국어 번역은 최소 2자 이상이어야 합니다")
        
        # 정의 길이 검증
        if 'definition_korean' in data:
            if len(data['definition_korean']) < 50:
                format_errors.append("한국어 정의는 최소 50자 이상이어야 합니다")
        
        if 'definition_english' in data:
            if len(data['definition_english']) < 30:
                format_errors.append("영어 정의는 최소 30자 이상이어야 합니다")
        
        # GitHub 사용자명 검증
        if 'github_username' in data:
            username = data['github_username'].strip('@')
            if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$', username):
                format_errors.append("GitHub 사용자명 형식이 올바르지 않습니다")
        
        # 이메일 검증 (있는 경우)
        if 'email' in data and data['email']:
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email']):
                format_errors.append("이메일 형식이 올바르지 않습니다")
        
        return format_errors
    
    def validate_content_quality(self, data: Dict) -> Tuple[List[str], List[str]]:
        """내용 품질 검증 (오류와 개선 제안 분리)"""
        quality_errors = []
        improvements = []
        
        # 사용 예시 검증
        if 'usage_examples' in data:
            examples = data['usage_examples']
            if '한국어:' not in examples or '영어:' not in examples:
                quality_errors.append("사용 예시에는 한국어와 영어 예시가 모두 포함되어야 합니다")
            
            # 최소 예시 개수 확인
            korean_examples = len(re.findall(r'한국어:', examples))
            english_examples = len(re.findall(r'영어:', examples))
            if korean_examples < 1 or english_examples < 1:
                quality_errors.append("한국어와 영어 예시를 각각 최소 1개씩 제공해야 합니다")
            elif korean_examples == 1 and english_examples == 1:
                improvements.append("더 다양한 사용 맥락을 보여주기 위해 예시를 2개 이상 제공하는 것을 권장합니다")
        
        # 참고 문헌 검증
        if 'references' in data:
            references = data['references']
            url_count = len(re.findall(r'https?://[^\s]+', references))
            if url_count == 0:
                improvements.append("온라인으로 접근 가능한 참고 문헌 URL을 1개 이상 포함하는 것을 권장합니다")
            
            # 신뢰할 수 있는 소스 확인
            reliable_sources = ['arxiv.org', 'scholar.google', 'ieee.org', 'acm.org', 'springer.com', 'nature.com', 'sciencedirect.com']
            has_reliable_source = any(source in references.lower() for source in reliable_sources)
            if not has_reliable_source:
                improvements.append("학술 논문이나 신뢰할 수 있는 출판사의 자료를 참고 문헌에 포함하는 것을 권장합니다")
        
        # 정의 품질 확인
        if 'definition_korean' in data and 'definition_english' in data:
            kor_def = data['definition_korean']
            eng_def = data['definition_english']
            
            # 정의가 너무 짧은 경우
            if len(kor_def) < 100:
                improvements.append("더 상세하고 이해하기 쉬운 한국어 정의를 제공해주세요 (100자 이상 권장)")
            if len(eng_def) < 60:
                improvements.append("더 상세하고 이해하기 쉬운 영어 정의를 제공해주세요 (60자 이상 권장)")
        
        return quality_errors, improvements
    
    def check_duplicate_terms(self, data: Dict, repo_owner: str, repo_name: str) -> Optional[str]:
        """중복 용어 검사"""
        if 'term_english' not in data:
            return None
        
        try:
            # terms-a-z.json 파일 내용 가져오기
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/public/data/terms/terms-a-z.json"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                file_data = response.json()
                import base64
                content = base64.b64decode(file_data['content']).decode('utf-8')
                terms = json.loads(content)
                
                english_term = data['term_english'].lower()
                korean_term = data.get('term_korean', '').lower()
                
                for term in terms:
                    if term.get('english', '').lower() == english_term:
                        return f"영어 용어 '{data['term_english']}'는 이미 존재합니다 (ID: {term.get('id')})"
                    if term.get('korean', '').lower() == korean_term:
                        return f"한국어 용어 '{data['term_korean']}'는 이미 존재합니다 (ID: {term.get('id')})"
        
        except Exception as e:
            print(f"중복 검사 중 오류 발생: {e}")
        
        return None
    
    def validate_required_checkboxes(self, data: Dict) -> List[str]:
        """필수 체크박스 확인"""
        missing_agreements = []
        
        required_agreements = [
            "이 기여는 오픈소스 라이선스 하에 제공됩니다",
            "제공한 정보가 정확하고 검증되었음을 확인합니다",
            "커뮤니티 가이드라인을 읽고 준수합니다"
        ]
        
        agreed_items = data.get('agreement', [])
        
        for required in required_agreements:
            if not any(required in item for item in agreed_items):
                missing_agreements.append(f"필수 동의 항목: '{required}'")
        
        return missing_agreements
    
    def generate_completion_request_comment(self, missing_fields: List[str], 
                                          format_errors: List[str],
                                          quality_errors: List[str],
                                          missing_agreements: List[str],
                                          duplicate_error: Optional[str] = None) -> str:
        """스마트한 보완 요청 댓글 생성"""
        
        comment = """## 🤖 자동 검증 결과: 보완이 필요합니다

안녕하세요! 용어 기여에 관심을 가져주셔서 감사합니다. 
자동 검증 결과 몇 가지 항목에서 보완이 필요합니다.

"""
        
        # 중복 용어 오류 (가장 우선)
        if duplicate_error:
            comment += f"""### ❌ 중복 용어 발견

{duplicate_error}

**해결 방법:**
1. 🔍 **기존 용어 확인**: 이미 존재하는 용어인지 검색해보세요
2. 📝 **기존 용어 개선**: 기존 용어의 정의나 예시를 개선하고 싶다면 "기존 용어 수정" 유형으로 이슈를 다시 작성해주세요
3. 🆕 **새로운 정의 추가**: 다른 맥락의 정의라면 "기존 용어에 새로운 정의 추가" 유형을 고려해주세요

---

"""
        
        # 필수 필드 누락
        if missing_fields:
            comment += """### ❌ 필수 필드 누락

다음 필수 필드들이 누락되었습니다:

"""
            for field in missing_fields:
                comment += f"- **{field}**: 이 필드는 반드시 작성해야 합니다\n"
            
            comment += """
**해결 방법:** 이슈 편집 버튼을 클릭하여 누락된 필드들을 모두 작성해주세요.

---

"""
        
        # 형식 오류
        if format_errors:
            comment += """### ❌ 형식 오류

다음과 같은 형식 문제가 발견되었습니다:

"""
            for error in format_errors:
                comment += f"- {error}\n"
            
            comment += """
**해결 방법:** 위의 형식 요구사항에 맞게 수정해주세요.

---

"""
        
        # 품질 오류
        if quality_errors:
            comment += """### ❌ 내용 품질 문제

다음과 같은 품질 문제가 발견되었습니다:

"""
            for error in quality_errors:
                comment += f"- {error}\n"
            
            comment += """
**해결 방법:** 위의 품질 기준을 만족하도록 내용을 보완해주세요.

---

"""
        
        # 필수 동의 항목
        if missing_agreements:
            comment += """### ❌ 필수 동의 항목 누락

다음 필수 동의 항목들이 체크되지 않았습니다:

"""
            for agreement in missing_agreements:
                comment += f"- {agreement}\n"
            
            comment += """
**해결 방법:** 동의 사항을 읽어보시고 해당 체크박스들을 체크해주세요.

---

"""
        
        comment += """## 🔄 다음 단계

1. **이슈 수정**: 위의 문제들을 해결한 후 이슈를 수정해주세요
2. **자동 재검증**: 수정하면 자동으로 다시 검증됩니다
3. **승인 대기**: 모든 검증을 통과하면 관리자 검토 단계로 진행됩니다

## 💡 도움이 필요하시면

- 📖 [기여 가이드](../../CONTRIBUTING.md) 참고
- 🆘 [자주 묻는 질문](../../FAQ.md) 확인  
- 💬 이 이슈에 댓글로 질문 남기기

감사합니다! 🤗

---
*이 댓글은 자동으로 생성되었습니다. 문제가 해결되면 자동으로 다음 단계로 진행됩니다.*"""

        return comment
    
    def generate_improvement_suggestions_comment(self, improvements: List[str]) -> str:
        """품질 개선 제안 댓글 생성"""
        
        if not improvements:
            return ""
        
        comment = """## 💡 품질 개선 제안

자동 검증은 통과했지만, 더 나은 품질을 위한 개선 제안이 있습니다:

"""
        
        for i, suggestion in enumerate(improvements, 1):
            comment += f"{i}. {suggestion}\n"
        
        comment += """
이러한 개선사항들은 선택사항이며, 현재 상태로도 검토를 진행할 수 있습니다.
하지만 위의 제안을 반영하면 더 높은 품질의 용어집이 될 것입니다.

---
*이 댓글은 자동으로 생성된 품질 개선 제안입니다.*"""
        
        return comment
    
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
    
    def add_comment_to_issue(self, repo_owner: str, repo_name: str, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/{issue_number}/comments"
        response = requests.post(url, headers=self.headers, json={"body": comment})
        
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def validate_issue(self, issue_body: str, repo_owner: str, repo_name: str, issue_number: int):
        """전체 이슈 검증 프로세스"""
        print("이슈 검증 시작...")
        
        # 1. 이슈 본문 파싱
        data = self.parse_issue_body(issue_body)
        print(f"파싱된 데이터 필드 수: {len(data)}")
        
        # 2. 필수 필드 검증
        missing_fields = self.validate_required_fields(data)
        
        # 3. 형식 검증
        format_errors = self.validate_field_formats(data)
        
        # 4. 내용 품질 검증
        quality_errors, improvements = self.validate_content_quality(data)
        
        # 5. 필수 동의 항목 확인
        missing_agreements = self.validate_required_checkboxes(data)
        
        # 6. 중복 용어 검사
        duplicate_error = self.check_duplicate_terms(data, repo_owner, repo_name)
        
        # 검증 결과 처리
        has_errors = bool(missing_fields or format_errors or quality_errors or missing_agreements or duplicate_error)
        
        if has_errors:
            # 오류가 있는 경우 - 보완 요청 댓글 및 라벨 추가
            comment = self.generate_completion_request_comment(
                missing_fields, format_errors, quality_errors, missing_agreements, duplicate_error
            )
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, comment)
            
            # 적절한 라벨 추가
            labels_to_add = ["needs-more-info"]
            
            if duplicate_error:
                labels_to_add.append("duplicate-found")
            if missing_fields or missing_agreements:
                labels_to_add.append("incomplete")
            if format_errors:
                labels_to_add.append("invalid-format")
            if quality_errors:
                labels_to_add.append("needs-improvement")
            
            self.add_labels_to_issue(repo_owner, repo_name, issue_number, labels_to_add)
            
            # 성공 라벨 제거
            labels_to_remove = ["auto-validated", "ready-for-review"]
            self.remove_labels_from_issue(repo_owner, repo_name, issue_number, labels_to_remove)
            
            print("❌ 검증 실패 - 보완 요청 댓글 추가됨")
            return False
            
        else:
            # 모든 검증 통과
            success_labels = ["auto-validated", "ready-for-review"]
            self.add_labels_to_issue(repo_owner, repo_name, issue_number, success_labels)
            
            # 오류 라벨들 제거
            error_labels = ["needs-more-info", "duplicate-found", "incomplete", "invalid-format", "needs-improvement"]
            self.remove_labels_from_issue(repo_owner, repo_name, issue_number, error_labels)
            
            # 개선 제안이 있다면 댓글 추가
            if improvements:
                suggestion_comment = self.generate_improvement_suggestions_comment(improvements)
                self.add_comment_to_issue(repo_owner, repo_name, issue_number, suggestion_comment)
            
            # 성공 댓글 추가
            success_comment = """## ✅ 자동 검증 완료

모든 자동 검증을 통과했습니다! 🎉

다음 단계에서는 전문가 관리자들이 내용을 검토합니다:
- 용어 번역의 정확성
- 정의의 명확성과 완전성  
- 사용 예시의 적절성
- 참고 문헌의 신뢰성

**예상 검토 시간:** 1-3일

---
*이 댓글은 자동으로 생성되었습니다.*"""
            
            self.add_comment_to_issue(repo_owner, repo_name, issue_number, success_comment)
            
            print("✅ 모든 검증 통과 - ready-for-review 라벨 추가됨")
            return True

def main():
    parser = argparse.ArgumentParser(description='강화된 용어 이슈 검증')
    parser.add_argument('--issue-number', required=True, help='이슈 번호')
    parser.add_argument('--issue-body', required=True, help='이슈 본문')
    parser.add_argument('--github-token', required=True, help='GitHub 토큰')
    parser.add_argument('--repo-owner', default='anthropics', help='저장소 소유자')
    parser.add_argument('--repo-name', default='kr-glossary', help='저장소 이름')
    
    args = parser.parse_args()
    
    validator = TermIssueValidator(args.github_token)
    
    try:
        success = validator.validate_issue(
            args.issue_body, 
            args.repo_owner, 
            args.repo_name, 
            int(args.issue_number)
        )
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"검증 중 오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()