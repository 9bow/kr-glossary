#!/usr/bin/env python3
"""
이슈 유형별 자동 검토자 할당 스크립트
"""

import argparse
import requests
import random


class ReviewerAssigner:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.repo = 'kr-glossary'  # 실제 저장소명으로 수정 필요
        
        # 전문 분야별 검토자 매핑
        self.reviewers = {
            'ML': ['ml-expert1', 'ml-expert2'],
            'DL': ['dl-expert1', 'dl-expert2'], 
            'NLP': ['nlp-expert1', 'nlp-expert2'],
            'CV': ['cv-expert1', 'cv-expert2'],
            'RL': ['rl-expert1', 'rl-expert2'],
            'GAI': ['gai-expert1', 'gai-expert2'],
            'general': ['admin1', 'admin2', 'admin3']
        }
        
        # 이슈 유형별 기본 검토자
        self.type_reviewers = {
            'term-addition': ['admin1', 'admin2'],
            'contributor-addition': ['admin1'],
            'organization-addition': ['admin1', 'admin2'],
            'admin-addition': ['admin1', 'admin2', 'admin3'],
            'verification-org': ['admin1', 'admin2']
        }
    
    def get_issue_details(self, issue_number: int):
        """이슈 상세 정보 가져오기"""
        url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}'
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def extract_category_from_issue(self, issue_body: str) -> str:
        """이슈 본문에서 카테고리 추출"""
        import re
        
        # 카테고리 패턴 매칭
        category_patterns = {
            'ML': r'ML \(Machine Learning\)',
            'DL': r'DL \(Deep Learning\)',
            'NLP': r'NLP \(Natural Language Processing\)', 
            'CV': r'CV \(Computer Vision\)',
            'RL': r'RL \(Reinforcement Learning\)',
            'GAI': r'GAI \(Generative AI\)'
        }
        
        for category, pattern in category_patterns.items():
            if re.search(pattern, issue_body, re.IGNORECASE):
                return category
                
        return 'general'
    
    def assign_reviewers_to_issue(self, issue_number: int, assignees: list):
        """이슈에 검토자 할당"""
        url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}/assignees'
        data = {'assignees': assignees}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code == 201:
            print(f"검토자 할당 성공: {assignees}")
            return True
        else:
            print(f"검토자 할당 실패: {response.status_code}")
            return False
    
    def add_comment(self, issue_number: int, comment: str):
        """이슈에 댓글 추가"""
        url = f'https://api.github.com/repos/{self.repo}/issues/{issue_number}/comments'
        data = {'body': comment}
        
        response = requests.post(url, headers=self.headers, json=data)
        if response.status_code != 201:
            print(f"댓글 추가 실패: {response.status_code}")
    
    def assign_by_labels(self, issue_number: int, labels: list):
        """라벨 기반 검토자 할당"""
        print(f"이슈 #{issue_number}에 검토자 할당 중... 라벨: {labels}")
        
        # 이슈 정보 가져오기
        issue = self.get_issue_details(issue_number)
        if not issue:
            print("이슈 정보를 가져올 수 없습니다.")
            return
            
        # 할당할 검토자 결정
        assignees = set()
        
        # 이슈 유형별 기본 검토자 추가
        for label in labels:
            if label in self.type_reviewers:
                assignees.update(self.type_reviewers[label])
        
        # 용어 추가의 경우 전문 분야별 검토자 추가
        if 'term-addition' in labels:
            category = self.extract_category_from_issue(issue['body'])
            if category in self.reviewers:
                # 해당 분야 전문가 중 1-2명 랜덤 선택
                specialists = self.reviewers[category]
                selected = random.sample(specialists, min(2, len(specialists)))
                assignees.update(selected)
            else:
                # 일반 검토자 할당
                general_reviewers = self.reviewers['general']
                selected = random.sample(general_reviewers, min(2, len(general_reviewers)))
                assignees.update(selected)
        
        # 검토자 할당
        if assignees:
            assignees_list = list(assignees)
            
            if self.assign_reviewers_to_issue(issue_number, assignees_list):
                # 할당 완료 댓글
                reviewers_mention = ', '.join([f"@{reviewer}" for reviewer in assignees_list])
                
                if 'term-addition' in labels:
                    category = self.extract_category_from_issue(issue['body'])
                    comment = f"""## 👥 검토자 할당 완료

전문가 검토를 위해 다음 분들께 할당되었습니다:

### 🎯 할당된 검토자
{reviewers_mention}

### 📋 검토 분야
- **주 분야**: {category}
- **검토 유형**: 용어 추가 검토

### 🔄 검토 프로세스
1. **전문성 검토**: 용어 번역의 정확성 및 적절성
2. **품질 검증**: 정의 명확성, 사용 예시 적절성
3. **표준 준수**: 기존 용어집과의 일관성
4. **승인 결정**: 승인 댓글 또는 수정 요청

### ⏱️ 예상 검토 시간
**3-5일** (복잡한 용어의 경우 추가 시간 소요 가능)

검토자 분들께서는 승인 시 **"✅ 승인"**, **"/approve"**, 또는 **"LGTM"** 댓글을 남겨주세요.

---
*이 댓글은 자동으로 생성되었습니다.*"""
                else:
                    comment = f"""## 👥 검토자 할당 완료

검토를 위해 다음 관리자 분들께 할당되었습니다:

### 🎯 할당된 검토자
{reviewers_mention}

### 🔄 다음 단계
1. 관리자 검토 및 승인
2. 필요 시 추가 정보 요청
3. 승인 완료 시 자동 처리

승인 시 **"✅ 승인"** 또는 **"/approve"** 댓글을 남겨주세요.

---
*이 댓글은 자동으로 생성되었습니다.*"""
                
                self.add_comment(issue_number, comment)
            else:
                print("검토자 할당에 실패했습니다.")
        else:
            print("할당할 검토자가 없습니다.")


def main():
    parser = argparse.ArgumentParser(description='자동 검토자 할당')
    parser.add_argument('--issue-number', type=int, required=True)
    parser.add_argument('--issue-labels', required=True)
    parser.add_argument('--github-token', required=True)
    
    args = parser.parse_args()
    
    labels = [label.strip() for label in args.issue_labels.split(',')]
    
    assigner = ReviewerAssigner(args.github_token)
    assigner.assign_by_labels(args.issue_number, labels)


if __name__ == '__main__':
    main()