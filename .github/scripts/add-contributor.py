#!/usr/bin/env python3
"""
기여자 자동 추가 스크립트

이슈가 성공적으로 병합된 후, 해당 이슈 작성자를 기여자 목록에 자동으로 추가합니다.
"""

import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any
import requests
from datetime import datetime

class ContributorManager:
    def __init__(self, github_token: str, repo_owner: str, repo_name: str):
        self.github_token = github_token
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.headers = {
            'Authorization': f'token {github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
    def get_user_info(self, username: str) -> Dict[str, Any]:
        """GitHub 사용자 정보 조회"""
        url = f"https://api.github.com/users/{username}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ GitHub 사용자 정보 조회 실패: {username}")
            return {}
    
    def load_contributors(self) -> List[Dict[str, Any]]:
        """기존 기여자 목록 로드"""
        contributors_file = Path("data/contributors/contributors.json")
        
        if contributors_file.exists():
            with open(contributors_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            print("📝 새로운 기여자 파일을 생성합니다.")
            return []
    
    def save_contributors(self, contributors: List[Dict[str, Any]]) -> None:
        """기여자 목록 저장"""
        contributors_file = Path("data/contributors/contributors.json")
        contributors_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 알파벳순 정렬
        contributors.sort(key=lambda x: x.get('github', '').lower())
        
        with open(contributors_file, 'w', encoding='utf-8') as f:
            json.dump(contributors, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 기여자 목록 저장 완료: {contributors_file}")
    
    def is_existing_contributor(self, contributors: List[Dict[str, Any]], username: str) -> bool:
        """이미 등록된 기여자인지 확인"""
        return any(
            contrib.get('github', '').lower() == username.lower() 
            for contrib in contributors
        )
    
    def add_contributor(self, username: str, contribution_type: str = 'author', 
                       issue_number: int = None) -> bool:
        """기여자를 목록에 추가"""
        try:
            # 기존 기여자 목록 로드
            contributors = self.load_contributors()
            
            # 이미 등록된 기여자인지 확인
            if self.is_existing_contributor(contributors, username):
                print(f"ℹ️  {username}은(는) 이미 등록된 기여자입니다.")
                return True
            
            # GitHub 사용자 정보 조회
            user_info = self.get_user_info(username)
            if not user_info:
                return False
            
            # 새로운 기여자 정보 생성
            new_contributor = {
                "name": user_info.get('name') or user_info.get('login'),
                "github": user_info.get('login'),
                "avatar_url": user_info.get('avatar_url'),
                "bio": user_info.get('bio'),
                "location": user_info.get('location'),
                "company": user_info.get('company'),
                "contributions": [
                    {
                        "type": contribution_type,
                        "date": datetime.now().isoformat(),
                        "issue_number": issue_number,
                        "description": f"용어 추가 이슈 #{issue_number}" if issue_number else "용어 추가"
                    }
                ],
                "first_contribution": datetime.now().isoformat()
            }
            
            # 빈 값 제거
            new_contributor = {k: v for k, v in new_contributor.items() if v is not None}
            
            # 기여자 목록에 추가
            contributors.append(new_contributor)
            
            # 저장
            self.save_contributors(contributors)
            
            print(f"🎉 새로운 기여자 추가 완료: {username}")
            return True
            
        except Exception as e:
            print(f"❌ 기여자 추가 중 오류 발생: {e}")
            return False
    
    def update_contribution(self, username: str, contribution_type: str = 'author', 
                          issue_number: int = None) -> bool:
        """기존 기여자의 기여 내역 업데이트"""
        try:
            contributors = self.load_contributors()
            
            for contributor in contributors:
                if contributor.get('github', '').lower() == username.lower():
                    # 기존 기여 내역에 새로운 기여 추가
                    new_contribution = {
                        "type": contribution_type,
                        "date": datetime.now().isoformat(),
                        "issue_number": issue_number,
                        "description": f"용어 추가 이슈 #{issue_number}" if issue_number else "용어 추가"
                    }
                    
                    if 'contributions' not in contributor:
                        contributor['contributions'] = []
                    
                    contributor['contributions'].append(new_contribution)
                    
                    self.save_contributors(contributors)
                    print(f"📝 {username}의 기여 내역 업데이트 완료")
                    return True
            
            print(f"⚠️  {username}을(를) 기여자 목록에서 찾을 수 없습니다.")
            return False
            
        except Exception as e:
            print(f"❌ 기여 내역 업데이트 중 오류 발생: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='기여자 자동 추가')
    parser.add_argument('--username', required=True, help='GitHub 사용자명')
    parser.add_argument('--contribution-type', default='author', help='기여 유형')
    parser.add_argument('--issue-number', type=int, help='이슈 번호')
    parser.add_argument('--github-token', required=True, help='GitHub 토큰')
    parser.add_argument('--repo-owner', required=True, help='저장소 소유자')
    parser.add_argument('--repo-name', required=True, help='저장소 이름')
    
    args = parser.parse_args()
    
    print(f"🚀 기여자 자동 추가 시작...")
    print(f"👤 사용자: {args.username}")
    print(f"📋 기여 유형: {args.contribution_type}")
    if args.issue_number:
        print(f"🔗 이슈 번호: #{args.issue_number}")
    
    contributor_manager = ContributorManager(
        github_token=args.github_token,
        repo_owner=args.repo_owner,
        repo_name=args.repo_name
    )
    
    # 기여자 추가 또는 업데이트
    contributors = contributor_manager.load_contributors()
    
    if contributor_manager.is_existing_contributor(contributors, args.username):
        # 기존 기여자 - 기여 내역 업데이트
        success = contributor_manager.update_contribution(
            username=args.username,
            contribution_type=args.contribution_type,
            issue_number=args.issue_number
        )
    else:
        # 새로운 기여자 - 추가
        success = contributor_manager.add_contributor(
            username=args.username,
            contribution_type=args.contribution_type,
            issue_number=args.issue_number
        )
    
    if success:
        print("✅ 기여자 처리 완료!")
        sys.exit(0)
    else:
        print("❌ 기여자 처리 실패!")
        sys.exit(1)

if __name__ == "__main__":
    main()