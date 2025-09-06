#!/usr/bin/env python3
"""
승인된 이슈로부터 용어 JSON 데이터 생성 스크립트
"""

import argparse
import json
import re
import requests
import uuid
from datetime import datetime
from typing import Dict, List, Optional


class TermDataGenerator:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.repo = 'kr-glossary'
        
    def parse_issue_body(self, issue_body: str) -> Dict[str, str]:
        """이슈 본문 파싱"""
        fields = {}
        
        patterns = {
            'contribution_type': r'### 기여 유형\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'term_english': r'### 영어 용어\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'term_korean': r'### 한국어 번역\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'category': r'### 카테고리\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'alternative_translations': r'### 대안 번역\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'pronunciation': r'### 발음\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'definition_korean': r'### 한국어 정의\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'definition_english': r'### 영어 정의\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'usage_examples': r'### 사용 예시\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'references': r'### 참고 문헌\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'related_terms': r'### 관련 용어\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'github_username': r'### GitHub 사용자명\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'email': r'### 이메일.*?\s*\n\s*(.+?)(?=\n###|\n---|\Z)',
            'additional_notes': r'### 추가 설명\s*\n\s*(.+?)(?=\n###|\n---|\Z)'
        }
        
        for field, pattern in patterns.items():
            match = re.search(pattern, issue_body, re.DOTALL | re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if value and not value.startswith(('_No response_', '예:', 'placeholder')):
                    fields[field] = value
                    
        return fields
    
    def parse_usage_examples(self, examples_text: str) -> List[Dict]:
        """사용 예시 파싱"""
        examples = []
        
        # 번호로 시작하는 예시들 파싱
        example_patterns = re.finditer(
            r'(\d+)\.\s*한국어:\s*"?([^"]+)"?\s*영어:\s*"?([^"]+)"?\s*출처:\s*(.+?)(?=\d+\.|$)', 
            examples_text, 
            re.DOTALL
        )
        
        for match in example_patterns:
            korean_example = match.group(2).strip()
            english_example = match.group(3).strip()
            source = match.group(4).strip()
            
            examples.append({
                "korean": korean_example,
                "english": english_example,
                "source": source
            })
        
        # 번호 없는 간단한 형태도 파싱
        if not examples:
            lines = examples_text.split('\n')
            korean_ex = None
            english_ex = None
            source = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('한국어:') or line.startswith('- 한국어:'):
                    korean_ex = re.sub(r'^.*?한국어:\s*"?([^"]+)"?.*', r'\1', line)
                elif line.startswith('영어:') or line.startswith('- 영어:'):
                    english_ex = re.sub(r'^.*?영어:\s*"?([^"]+)"?.*', r'\1', line)
                elif line.startswith('출처:') or line.startswith('- 출처:'):
                    source = re.sub(r'^.*?출처:\s*(.+)', r'\1', line)
            
            if korean_ex and english_ex:
                examples.append({
                    "korean": korean_ex,
                    "english": english_ex,
                    "source": source or "제출자 제공"
                })
        
        return examples
    
    def parse_references(self, references_text: str) -> List[Dict]:
        """참고 문헌 파싱"""
        references = []
        lines = references_text.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('-') or line.startswith('•'):
                line = line[1:].strip()
            
            if not line:
                continue
                
            # URL 포함된 참고문헌
            url_match = re.search(r'(https?://[^\s]+)', line)
            if url_match:
                url = url_match.group(1)
                title = re.sub(r'\s*https?://[^\s]+', '', line).strip()
                references.append({
                    "title": title or "참고 문헌",
                    "url": url,
                    "type": "online"
                })
            else:
                # 일반 텍스트 참고문헌
                references.append({
                    "title": line,
                    "type": "text"
                })
        
        return references
    
    def generate_term_id(self, english_term: str) -> str:
        """용어 ID 생성"""
        # 영어 용어를 소문자로 변환하고 특수문자를 하이픈으로 대체
        term_id = re.sub(r'[^a-zA-Z0-9]', '-', english_term.lower())
        term_id = re.sub(r'-+', '-', term_id).strip('-')
        
        # 번호 추가
        timestamp = int(datetime.now().timestamp() * 1000) % 1000
        return f"{term_id}-{timestamp:03d}"
    
    def map_category(self, category_text: str) -> str:
        """카테고리 매핑"""
        category_mapping = {
            'ML (Machine Learning)': 'ML',
            'DL (Deep Learning)': 'DL', 
            'NLP (Natural Language Processing)': 'NLP',
            'CV (Computer Vision)': 'CV',
            'RL (Reinforcement Learning)': 'RL',
            'GAI (Generative AI)': 'GAI'
        }
        
        return category_mapping.get(category_text, 'ML')
    
    def create_term_json(self, fields: Dict[str, str], issue_number: int, issue_author: str) -> Dict:
        """용어 JSON 데이터 생성"""
        term_id = self.generate_term_id(fields['term_english'])
        
        # 기본 구조
        term_data = {
            "id": term_id,
            "english": fields['term_english'],
            "korean": fields['term_korean'],
            "status": "active",
            "contributors": [
                {
                    "github": issue_author,
                    "role": "author",
                    "date": datetime.now().strftime("%Y-%m-%d")
                }
            ],
            "metadata": {
                "created": datetime.now().strftime("%Y-%m-%d"),
                "updated": datetime.now().strftime("%Y-%m-%d"),
                "source": f"issue-{issue_number}",
                "category": self.map_category(fields.get('category', 'ML'))
            }
        }
        
        # 선택적 필드 추가
        if 'alternative_translations' in fields:
            alternatives = [alt.strip() for alt in fields['alternative_translations'].split(',')]
            term_data["alternatives"] = alternatives
            
        if 'pronunciation' in fields:
            term_data["pronunciation"] = fields['pronunciation']
        
        # 정의 추가
        term_data["definition"] = {
            "korean": fields['definition_korean'],
            "english": fields['definition_english']
        }
        
        # 사용 예시 파싱 및 추가
        if 'usage_examples' in fields:
            examples = self.parse_usage_examples(fields['usage_examples'])
            if examples:
                term_data["examples"] = examples
        
        # 참고 문헌 파싱 및 추가
        if 'references' in fields:
            references = self.parse_references(fields['references'])
            if references:
                term_data["references"] = references
        
        # 관련 용어 추가
        if 'related_terms' in fields:
            related = [term.strip() for term in fields['related_terms'].split(',')]
            term_data["relatedTerms"] = related
        
        return term_data
    
    def load_existing_terms(self) -> List[Dict]:
        """기존 용어 데이터 로드"""
        try:
            with open('data/terms/terms-a-z.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print("기존 용어 파일을 찾을 수 없습니다. 새로운 파일을 생성합니다.")
            return []
    
    def save_terms(self, terms: List[Dict]):
        """용어 데이터를 파일에 저장"""
        # 영어 용어 기준으로 알파벳순 정렬
        terms.sort(key=lambda x: x['english'].lower())
        
        with open('data/terms/terms-a-z.json', 'w', encoding='utf-8') as f:
            json.dump(terms, f, ensure_ascii=False, indent=2)
            
        print(f"총 {len(terms)}개 용어를 저장했습니다.")
    
    def generate_from_issue(self, issue_number: int, issue_data: str):
        """이슈로부터 용어 데이터 생성"""
        print(f"이슈 #{issue_number}로부터 용어 데이터 생성 중...")
        
        # 이슈 데이터 파싱 (JSON 형태로 전달받음)
        issue_info = json.loads(issue_data)
        issue_body = issue_info['body']
        issue_author = issue_info['user']['login']
        
        # 이슈 본문 파싱
        fields = self.parse_issue_body(issue_body)
        print(f"파싱된 필드: {list(fields.keys())}")
        
        # 용어 JSON 생성
        term_data = self.create_term_json(fields, issue_number, issue_author)
        print(f"생성된 용어 ID: {term_data['id']}")
        
        # 기존 용어 로드
        existing_terms = self.load_existing_terms()
        
        # 새 용어 추가
        existing_terms.append(term_data)
        
        # 정렬 및 저장
        self.save_terms(existing_terms)
        
        print("용어 데이터 생성 완료!")


def main():
    parser = argparse.ArgumentParser(description='이슈로부터 용어 데이터 생성')
    parser.add_argument('--issue-number', type=int, required=True)
    parser.add_argument('--issue-data', required=True)
    parser.add_argument('--github-token', required=True)
    
    args = parser.parse_args()
    
    generator = TermDataGenerator(args.github_token)
    generator.generate_from_issue(args.issue_number, args.issue_data)


if __name__ == '__main__':
    main()