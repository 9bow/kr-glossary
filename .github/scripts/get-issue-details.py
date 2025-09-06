#!/usr/bin/env python3
"""
GitHub 이슈 정보 조회 스크립트
"""

import argparse
import json
import requests
import os


def get_issue_details(github_token: str, issue_number: int):
    """이슈 정보 가져오기"""
    headers = {
        'Authorization': f'token {github_token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    repo = 'kr-glossary'  # 실제 저장소명으로 수정 필요
    url = f'https://api.github.com/repos/{repo}/issues/{issue_number}'
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        issue_data = response.json()
        
        # GitHub Actions 출력으로 전달
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                # JSON을 문자열로 변환하여 출력
                json_str = json.dumps(issue_data).replace('\n', '\\n').replace('\r', '\\r')
                f.write(f'issue-data={json_str}\n')
        
        print(f"이슈 #{issue_number} 정보를 성공적으로 가져왔습니다.")
        return issue_data
    else:
        print(f"이슈 조회 실패: {response.status_code}")
        return None


def main():
    parser = argparse.ArgumentParser(description='GitHub 이슈 정보 조회')
    parser.add_argument('--issue-number', type=int, required=True)
    parser.add_argument('--github-token', required=True)
    
    args = parser.parse_args()
    
    get_issue_details(args.github_token, args.issue_number)


if __name__ == '__main__':
    main()