#!/usr/bin/env python3
"""
용어 데이터에서 ID 필드를 제거하고 relatedTerms를 ID에서 영문명으로 변경하는 스크립트
"""

import json
import os
from pathlib import Path

def main():
    # 파일 경로 설정
    base_path = Path(__file__).parent.parent
    terms_file = base_path / "data/terms/terms-a-z.json"
    
    if not terms_file.exists():
        print(f"Error: {terms_file} not found")
        return
    
    # 용어 데이터 로드
    with open(terms_file, 'r', encoding='utf-8') as f:
        terms = json.load(f)
    
    print(f"Processing {len(terms)} terms...")
    
    # 1단계: ID -> 영문명 매핑 생성
    id_to_english = {}
    for term in terms:
        if 'id' in term:
            id_to_english[term['id']] = term['english']
    
    print(f"Created ID mapping for {len(id_to_english)} terms")
    
    # 2단계: 각 용어 처리
    processed_terms = []
    for term in terms:
        # ID 필드 제거
        if 'id' in term:
            del term['id']
        
        # relatedTerms를 ID에서 영문명으로 변경
        if 'relatedTerms' in term and isinstance(term['relatedTerms'], list):
            new_related_terms = []
            for related_id in term['relatedTerms']:
                if related_id in id_to_english:
                    new_related_terms.append(id_to_english[related_id])
                else:
                    print(f"Warning: Related term ID '{related_id}' not found for term '{term['english']}'")
            term['relatedTerms'] = new_related_terms
        
        processed_terms.append(term)
    
    # 3단계: 백업 생성
    backup_file = terms_file.with_suffix('.json.backup')
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(terms, f, ensure_ascii=False, indent=2)
    print(f"Backup created: {backup_file}")
    
    # 4단계: 수정된 데이터 저장
    with open(terms_file, 'w', encoding='utf-8') as f:
        json.dump(processed_terms, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully processed {len(processed_terms)} terms")
    print("Changes made:")
    print("- Removed 'id' field from all terms")
    print("- Converted 'relatedTerms' from ID references to English name references")
    print(f"- Original data backed up to {backup_file}")

if __name__ == '__main__':
    main()