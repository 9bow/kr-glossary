#!/usr/bin/env python3
"""
기여자 데이터를 처리하여 active-contributors.json 파일에 추가하는 스크립트
"""

import json
import sys
import argparse
from datetime import datetime

def load_json_file(filepath):
    """JSON 파일 로드"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}", file=sys.stderr)
        sys.exit(1)

def save_json_file(data, filepath):
    """JSON 파일 저장"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"❌ 파일 저장 오류: {e}", file=sys.stderr)
        return False

def find_existing_contributor(contributors, github_username):
    """기존 기여자 찾기"""
    for i, contributor in enumerate(contributors):
        if contributor.get("githubUsername") == github_username:
            return i, contributor
    return None, None

def create_contributor_object(issue_data):
    """Issue 데이터로부터 기여자 객체 생성"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    contributor = {
        "githubUsername": issue_data.get("githubUsername", ""),
        "name": issue_data.get("name", ""),
        "email": issue_data.get("email", ""),
        "organization": issue_data.get("organization", ""),
        "role": issue_data.get("contributionType", "contributor"),
        "expertise": issue_data.get("expertise", []),
        "bio": issue_data.get("bio", ""),
        "website": issue_data.get("website", ""),
        "socialLinks": {
            "github": f"https://github.com/{issue_data.get('githubUsername', '')}",
            "linkedin": issue_data.get("linkedin", ""),
            "twitter": issue_data.get("twitter", "")
        },
        "contributions": {
            "termsAdded": 0,
            "termsReviewed": 0,
            "issuesOpened": 0,
            "prsCreated": 0
        },
        "joinDate": issue_data.get("joinDate", datetime.now().strftime("%Y-%m-%d")),
        "lastActive": current_time,
        "status": issue_data.get("status", "active"),
        "metadata": {
            "createdAt": current_time,
            "updatedAt": current_time,
            "discussionUrl": f"https://github.com/9bow/kr-glossary/issues/{issue_data['issue_number']}"
        }
    }
    
    return contributor

def update_existing_contributor(existing_contributor, new_data):
    """기존 기여자 정보 업데이트"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    # 기본 정보 업데이트 (비어있지 않은 경우만)
    if new_data.get("name"):
        existing_contributor["name"] = new_data["name"]
    if new_data.get("email"):
        existing_contributor["email"] = new_data["email"]
    if new_data.get("organization"):
        existing_contributor["organization"] = new_data["organization"]
    if new_data.get("bio"):
        existing_contributor["bio"] = new_data["bio"]
    if new_data.get("website"):
        existing_contributor["website"] = new_data["website"]
    
    # 전문 분야 업데이트 (합치기)
    existing_expertise = set(existing_contributor.get("expertise", []))
    new_expertise = set(new_data.get("expertise", []))
    existing_contributor["expertise"] = list(existing_expertise | new_expertise)
    
    # 메타데이터 업데이트
    existing_contributor["lastActive"] = current_time
    existing_contributor["metadata"]["updatedAt"] = current_time
    
    return existing_contributor

def sort_contributors_alphabetically(contributors):
    """기여자를 이름 순으로 정렬 (GitHub username 기준)"""
    return sorted(contributors, key=lambda x: x["githubUsername"].lower())

def main():
    parser = argparse.ArgumentParser(description="Process contributor data from GitHub Issue")
    parser.add_argument("--issue-data-file", required=True, help="JSON file containing extracted issue data")
    
    args = parser.parse_args()
    
    # Issue 데이터 로드
    issue_data = load_json_file(args.issue_data_file)
    if not issue_data:
        print("❌ Issue 데이터를 로드할 수 없습니다.", file=sys.stderr)
        sys.exit(1)
    
    # 기존 기여자 데이터 로드
    contributors_file = "data/contributors/active-contributors.json"
    existing_contributors = load_json_file(contributors_file)
    
    # GitHub username 확인
    github_username = issue_data.get("githubUsername")
    if not github_username:
        print("❌ GitHub username이 없습니다.", file=sys.stderr)
        sys.exit(1)
    
    # 기존 기여자 확인
    existing_index, existing_contributor = find_existing_contributor(existing_contributors, github_username)
    
    if existing_contributor:
        # 기존 기여자 업데이트
        updated_contributor = update_existing_contributor(existing_contributor, issue_data)
        existing_contributors[existing_index] = updated_contributor
        print(f"✅ 기여자 정보 업데이트됨: {github_username}")
    else:
        # 새 기여자 추가
        new_contributor = create_contributor_object(issue_data)
        existing_contributors.append(new_contributor)
        print(f"✅ 새 기여자 추가됨: {github_username}")
    
    # 알파벳 순으로 정렬
    sorted_contributors = sort_contributors_alphabetically(existing_contributors)
    
    # 파일 저장
    if save_json_file(sorted_contributors, contributors_file):
        print(f"💾 파일 저장 완료: {contributors_file}")
        print(f"👥 총 기여자 수: {len(sorted_contributors)}")
    else:
        print("❌ 파일 저장 실패", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()