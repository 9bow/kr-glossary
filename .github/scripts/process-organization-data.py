#!/usr/bin/env python3
"""
조직 데이터를 처리하여 verified-organizations.json 파일에 추가하는 스크립트
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

def find_existing_organization(organizations, org_name):
    """기존 조직 찾기"""
    for i, org in enumerate(organizations):
        if org.get("name") == org_name:
            return i, org
    return None, None

def create_organization_object(issue_data):
    """Issue 데이터로부터 조직 객체 생성"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    organization = {
        "name": issue_data.get("name", ""),
        "type": issue_data.get("type", "organization"),
        "description": issue_data.get("description", ""),
        "website": issue_data.get("website", ""),
        "contact": issue_data.get("contact", ""),
        "logo": issue_data.get("logo", ""),
        "location": issue_data.get("location", ""),
        "established": issue_data.get("established", ""),
        "specialties": issue_data.get("specialties", []),
        "members": [],  # 멤버는 별도로 관리
        "contributions": {
            "termsSponsored": 0,
            "expertsProvided": 0,
            "reviewsCompleted": 0
        },
        "partnership": {
            "level": "community",  # community, partner, sponsor
            "startDate": datetime.now().strftime("%Y-%m-%d"),
            "benefits": []
        },
        "status": issue_data.get("status", "pending"),
        "verified": issue_data.get("verified", False),
        "metadata": {
            "createdAt": current_time,
            "updatedAt": current_time,
            "discussionUrl": f"https://github.com/9bow/kr-glossary/issues/{issue_data['issue_number']}"
        }
    }
    
    return organization

def update_existing_organization(existing_org, new_data):
    """기존 조직 정보 업데이트"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    # 기본 정보 업데이트 (비어있지 않은 경우만)
    if new_data.get("description"):
        existing_org["description"] = new_data["description"]
    if new_data.get("website"):
        existing_org["website"] = new_data["website"]
    if new_data.get("contact"):
        existing_org["contact"] = new_data["contact"]
    if new_data.get("logo"):
        existing_org["logo"] = new_data["logo"]
    if new_data.get("location"):
        existing_org["location"] = new_data["location"]
    if new_data.get("established"):
        existing_org["established"] = new_data["established"]
    
    # 전문 분야 업데이트 (합치기)
    existing_specialties = set(existing_org.get("specialties", []))
    new_specialties = set(new_data.get("specialties", []))
    existing_org["specialties"] = list(existing_specialties | new_specialties)
    
    # 메타데이터 업데이트
    existing_org["metadata"]["updatedAt"] = current_time
    
    return existing_org

def sort_organizations_alphabetically(organizations):
    """조직을 이름 순으로 정렬"""
    return sorted(organizations, key=lambda x: x["name"].lower())

def validate_organization_data(org_data):
    """조직 데이터 유효성 검증"""
    required_fields = ["name", "type", "description"]
    
    for field in required_fields:
        if not org_data.get(field):
            return False, f"필수 필드가 누락됨: {field}"
    
    # 조직 유형 검증
    valid_types = ["university", "company", "research_institute", "government", "non_profit", "organization"]
    if org_data.get("type") not in valid_types:
        return False, f"잘못된 조직 유형: {org_data.get('type')}"
    
    return True, ""

def main():
    parser = argparse.ArgumentParser(description="Process organization data from GitHub Issue")
    parser.add_argument("--issue-data-file", required=True, help="JSON file containing extracted issue data")
    
    args = parser.parse_args()
    
    # Issue 데이터 로드
    issue_data = load_json_file(args.issue_data_file)
    if not issue_data:
        print("❌ Issue 데이터를 로드할 수 없습니다.", file=sys.stderr)
        sys.exit(1)
    
    # 기존 조직 데이터 로드
    organizations_file = "data/organizations/verified-organizations.json"
    existing_organizations = load_json_file(organizations_file)
    
    # 조직명 확인
    org_name = issue_data.get("name")
    if not org_name:
        print("❌ 조직명이 없습니다.", file=sys.stderr)
        sys.exit(1)
    
    # 데이터 유효성 검증
    is_valid, error_message = validate_organization_data(issue_data)
    if not is_valid:
        print(f"❌ 데이터 유효성 검증 실패: {error_message}", file=sys.stderr)
        sys.exit(1)
    
    # 기존 조직 확인
    existing_index, existing_org = find_existing_organization(existing_organizations, org_name)
    
    if existing_org:
        # 기존 조직 업데이트
        updated_org = update_existing_organization(existing_org, issue_data)
        existing_organizations[existing_index] = updated_org
        print(f"✅ 조직 정보 업데이트됨: {org_name}")
    else:
        # 새 조직 추가
        new_org = create_organization_object(issue_data)
        existing_organizations.append(new_org)
        print(f"✅ 새 조직 추가됨: {org_name}")
    
    # 알파벳 순으로 정렬
    sorted_organizations = sort_organizations_alphabetically(existing_organizations)
    
    # 파일 저장
    if save_json_file(sorted_organizations, organizations_file):
        print(f"💾 파일 저장 완료: {organizations_file}")
        print(f"🏢 총 조직 수: {len(sorted_organizations)}")
        print(f"✅ 검증된 조직 수: {len([org for org in sorted_organizations if org.get('verified')])}")
    else:
        print("❌ 파일 저장 실패", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()