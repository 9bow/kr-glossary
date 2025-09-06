#!/usr/bin/env python3
"""
GitHub Issue에서 데이터를 추출하여 JSON 형태로 변환하는 스크립트
"""

import json
import re
import sys
import argparse
from datetime import datetime
import yaml

def parse_yaml_frontmatter(body):
    """Issue body에서 YAML frontmatter 파싱"""
    # YAML frontmatter 패턴 매칭
    yaml_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)'
    match = re.match(yaml_pattern, body, re.DOTALL)
    
    if match:
        yaml_content = match.group(1)
        remaining_body = match.group(2)
        try:
            parsed_yaml = yaml.safe_load(yaml_content)
            return parsed_yaml, remaining_body
        except yaml.YAMLError as e:
            print(f"YAML parsing error: {e}", file=sys.stderr)
            return None, body
    
    return None, body

def parse_markdown_sections(body):
    """마크다운 섹션을 파싱하여 딕셔너리로 변환"""
    sections = {}
    
    # 섹션 헤더 패턴 (### 헤더명)
    section_pattern = r'^### (.+)$'
    current_section = None
    content_lines = []
    
    for line in body.split('\n'):
        section_match = re.match(section_pattern, line)
        if section_match:
            # 이전 섹션 저장
            if current_section and content_lines:
                sections[current_section] = '\n'.join(content_lines).strip()
            
            # 새 섹션 시작
            current_section = section_match.group(1).strip()
            content_lines = []
        else:
            if current_section:
                content_lines.append(line)
    
    # 마지막 섹션 저장
    if current_section and content_lines:
        sections[current_section] = '\n'.join(content_lines).strip()
    
    return sections

def extract_term_data(yaml_data, sections, labels):
    """용어 데이터 추출"""
    term_data = {
        "type": "term",
        "action": "modify" if "type:term-modification" in labels else "add",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    if yaml_data:
        # YAML 기반 데이터 추출
        term_data.update({
            "id": yaml_data.get("term_id", ""),
            "english": yaml_data.get("english_term", ""),
            "korean": yaml_data.get("korean_term", ""),
            "alternatives": [alt.strip() for alt in yaml_data.get("alternative_terms", "").split(",") if alt.strip()],
            "pronunciation": yaml_data.get("pronunciation", ""),
            "definition": {
                "korean": yaml_data.get("korean_definition", ""),
                "english": yaml_data.get("english_definition", "")
            },
            "category": yaml_data.get("category", ""),
            "examples": [],
            "references": [],
            "relatedTerms": [term.strip() for term in yaml_data.get("related_terms", "").split(",") if term.strip()],
            "status": "proposed"
        })
        
        # 예시 추출
        examples_text = yaml_data.get("examples", "")
        if examples_text:
            for example in examples_text.split("\n"):
                if example.strip():
                    term_data["examples"].append({
                        "korean": example.strip(),
                        "english": "",
                        "source": ""
                    })
        
        # 참고문헌 추출
        references_text = yaml_data.get("references", "")
        if references_text:
            for ref in references_text.split("\n"):
                if ref.strip():
                    term_data["references"].append({
                        "title": ref.strip(),
                        "url": "",
                        "type": "website",
                        "year": datetime.now().year
                    })
    
    return term_data

def extract_contributor_data(yaml_data, sections, labels):
    """기여자 데이터 추출"""
    contributor_data = {
        "type": "contributor",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    if yaml_data:
        contributor_data.update({
            "githubUsername": yaml_data.get("github_username", ""),
            "name": yaml_data.get("full_name", ""),
            "email": yaml_data.get("email", ""),
            "organization": yaml_data.get("organization", ""),
            "expertise": [exp.strip() for exp in yaml_data.get("expertise_areas", "").split(",") if exp.strip()],
            "bio": yaml_data.get("bio", ""),
            "website": yaml_data.get("website", ""),
            "contributionType": "contributor",
            "joinDate": datetime.now().strftime("%Y-%m-%d"),
            "status": "active"
        })
    
    return contributor_data

def extract_organization_data(yaml_data, sections, labels):
    """조직 데이터 추출"""
    org_data = {
        "type": "organization",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    if yaml_data:
        org_data.update({
            "name": yaml_data.get("organization_name", ""),
            "type": yaml_data.get("organization_type", ""),
            "description": yaml_data.get("description", ""),
            "website": yaml_data.get("website", ""),
            "contact": yaml_data.get("contact_email", ""),
            "logo": yaml_data.get("logo_url", ""),
            "established": yaml_data.get("established_year", ""),
            "location": yaml_data.get("location", ""),
            "specialties": [spec.strip() for spec in yaml_data.get("specialties", "").split(",") if spec.strip()],
            "status": "pending",
            "verified": False
        })
    
    return org_data

def main():
    parser = argparse.ArgumentParser(description="Extract data from GitHub Issue")
    parser.add_argument("--issue-number", required=True, help="Issue number")
    parser.add_argument("--issue-body", required=True, help="Issue body content")
    parser.add_argument("--issue-title", required=True, help="Issue title")
    parser.add_argument("--labels", required=True, help="Issue labels (comma-separated)")
    
    args = parser.parse_args()
    
    labels = [label.strip() for label in args.labels.split(",")]
    
    # YAML frontmatter와 마크다운 섹션 파싱
    yaml_data, remaining_body = parse_yaml_frontmatter(args.issue_body)
    sections = parse_markdown_sections(remaining_body)
    
    extracted_data = {
        "issue_number": args.issue_number,
        "issue_title": args.issue_title,
        "labels": labels,
        "extraction_time": datetime.utcnow().isoformat() + "Z"
    }
    
    # 레이블에 따른 데이터 추출
    if "type:term-addition" in labels or "type:term-modification" in labels:
        extracted_data.update(extract_term_data(yaml_data, sections, labels))
    elif "type:contributor-addition" in labels:
        extracted_data.update(extract_contributor_data(yaml_data, sections, labels))
    elif "type:organization-addition" in labels:
        extracted_data.update(extract_organization_data(yaml_data, sections, labels))
    
    # JSON 파일로 저장
    with open("issue_data.json", "w", encoding="utf-8") as f:
        json.dump(extracted_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Issue #{args.issue_number} 데이터 추출 완료")
    print(f"📁 저장 위치: issue_data.json")
    print(f"🏷️ 처리 유형: {', '.join(labels)}")

if __name__ == "__main__":
    main()