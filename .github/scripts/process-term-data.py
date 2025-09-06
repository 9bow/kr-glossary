#!/usr/bin/env python3
"""
용어 데이터를 처리하여 terms-a-z.json 파일에 추가/수정하는 스크립트
"""

import json
import sys
import argparse
from datetime import datetime
import uuid

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

def generate_term_id(english_term, korean_term):
    """용어 ID 생성"""
    # 영문 용어를 소문자로 변환하고 공백을 하이픈으로 치환
    base_id = english_term.lower().replace(' ', '-').replace('_', '-')
    # 특수문자 제거
    import re
    base_id = re.sub(r'[^a-z0-9-]', '', base_id)
    return base_id

def create_term_object(issue_data, contributor_info):
    """Issue 데이터로부터 용어 객체 생성"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    term = {
        "id": issue_data.get("id") or generate_term_id(issue_data["english"], issue_data["korean"]),
        "english": issue_data["english"],
        "korean": issue_data["korean"],
        "alternatives": issue_data.get("alternatives", []),
        "pronunciation": issue_data.get("pronunciation", ""),
        "definition": issue_data.get("definition", {
            "korean": "",
            "english": ""
        }),
        "category": issue_data.get("category", "general"),
        "examples": issue_data.get("examples", []),
        "references": issue_data.get("references", []),
        "relatedTerms": issue_data.get("relatedTerms", []),
        "status": "validated",  # 승인된 Issue이므로 validated 상태
        "contributors": [contributor_info],
        "metadata": {
            "createdAt": current_time,
            "updatedAt": current_time,
            "version": 1,
            "discussionUrl": f"https://github.com/9bow/kr-glossary/issues/{issue_data['issue_number']}"
        }
    }
    
    return term

def find_existing_term(terms, term_id):
    """기존 용어 찾기"""
    for i, term in enumerate(terms):
        if term.get("id") == term_id:
            return i, term
    return None, None

def update_existing_term(existing_term, new_data, contributor_info):
    """기존 용어 업데이트"""
    current_time = datetime.utcnow().isoformat() + "Z"
    
    # 기본 정보 업데이트
    existing_term["english"] = new_data["english"]
    existing_term["korean"] = new_data["korean"]
    existing_term["alternatives"] = new_data.get("alternatives", existing_term.get("alternatives", []))
    existing_term["pronunciation"] = new_data.get("pronunciation", existing_term.get("pronunciation", ""))
    existing_term["definition"] = new_data.get("definition", existing_term.get("definition", {}))
    existing_term["category"] = new_data.get("category", existing_term.get("category", "general"))
    existing_term["examples"] = new_data.get("examples", existing_term.get("examples", []))
    existing_term["references"] = new_data.get("references", existing_term.get("references", []))
    existing_term["relatedTerms"] = new_data.get("relatedTerms", existing_term.get("relatedTerms", []))
    
    # 기여자 추가 (중복 방지)
    contributors = existing_term.get("contributors", [])
    existing_usernames = [c["githubUsername"] for c in contributors]
    if contributor_info["githubUsername"] not in existing_usernames:
        contributors.append(contributor_info)
    existing_term["contributors"] = contributors
    
    # 메타데이터 업데이트
    metadata = existing_term.get("metadata", {})
    metadata["updatedAt"] = current_time
    metadata["version"] = metadata.get("version", 1) + 1
    existing_term["metadata"] = metadata
    
    return existing_term

def sort_terms_alphabetically(terms):
    """용어를 알파벳 순으로 정렬"""
    return sorted(terms, key=lambda x: x["english"].lower())

def main():
    parser = argparse.ArgumentParser(description="Process term data from GitHub Issue")
    parser.add_argument("--issue-data-file", required=True, help="JSON file containing extracted issue data")
    parser.add_argument("--action", choices=["add", "modify"], required=True, help="Action to perform")
    
    args = parser.parse_args()
    
    # Issue 데이터 로드
    issue_data = load_json_file(args.issue_data_file)
    if not issue_data:
        print("❌ Issue 데이터를 로드할 수 없습니다.", file=sys.stderr)
        sys.exit(1)
    
    # 기존 용어 데이터 로드
    terms_file = "data/terms/terms-a-z.json"
    existing_terms = load_json_file(terms_file)
    
    # 기여자 정보 생성 (GitHub API에서 추가 정보를 가져올 수 있지만 기본 정보만 사용)
    contributor_info = {
        "githubUsername": "anonymous",  # GitHub API를 통해 실제 username을 가져와야 함
        "contributionType": "author",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # 용어 ID 확인
    term_id = issue_data.get("id") or generate_term_id(issue_data["english"], issue_data["korean"])
    
    if args.action == "add":
        # 중복 확인
        existing_index, existing_term = find_existing_term(existing_terms, term_id)
        if existing_term:
            print(f"⚠️ 용어 '{term_id}'가 이미 존재합니다. 수정 모드를 사용하세요.", file=sys.stderr)
            sys.exit(1)
        
        # 새 용어 추가
        new_term = create_term_object(issue_data, contributor_info)
        existing_terms.append(new_term)
        print(f"✅ 새 용어 추가됨: {new_term['english']} ({new_term['korean']})")
    
    elif args.action == "modify":
        # 기존 용어 찾기
        existing_index, existing_term = find_existing_term(existing_terms, term_id)
        if not existing_term:
            print(f"❌ 용어 '{term_id}'를 찾을 수 없습니다.", file=sys.stderr)
            sys.exit(1)
        
        # 기존 용어 업데이트
        updated_term = update_existing_term(existing_term, issue_data, contributor_info)
        existing_terms[existing_index] = updated_term
        print(f"✅ 용어 수정됨: {updated_term['english']} ({updated_term['korean']})")
    
    # 알파벳 순으로 정렬
    sorted_terms = sort_terms_alphabetically(existing_terms)
    
    # 파일 저장
    if save_json_file(sorted_terms, terms_file):
        print(f"💾 파일 저장 완료: {terms_file}")
        print(f"📊 총 용어 수: {len(sorted_terms)}")
    else:
        print("❌ 파일 저장 실패", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()