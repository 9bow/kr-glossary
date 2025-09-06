#!/usr/bin/env python3
"""
용어 중복 검증 스크립트
GitHub PR에서 용어 중복을 방지
"""

import json
import os
import sys
from pathlib import Path
from collections import defaultdict

class DuplicateChecker:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.terms_dir = self.base_path / "data/terms"

    def check_duplicates(self):
        """모든 용어 파일에서 중복 검증"""
        print("🔍 용어 중복 검증 시작...")
        errors = []

        # terms-a-z.json 파일 검증 (실제 사용되는 파일)
        sample_errors = self.check_main_terms_duplicates()
        errors.extend(sample_errors)

        # ID 중복 검사는 terms-a-z.json 파일에서 이미 수행됨

        # 영어/한국어 용어 중복은 terms-a-z.json에서 체크됨
        print("✅ 모든 중복 검증 완료!")

        if errors:
            print(f"❌ {len(errors)}개의 중복 발견:")
            for error in errors:
                print(f"   • {error}")
            return False
        else:
            print("✅ 중복 용어 없음!")
            return True

    def check_id_duplicates(self):
        """용어 ID 중복 검증"""
        errors = []
        seen_ids = set()

        for filename in os.listdir(self.groups_dir):
            if filename.startswith('terms-') and filename.endswith('.json'):
                filepath = self.groups_dir / filename

                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        terms = json.load(f)

                    for term in terms:
                        term_id = term['id']
                        if term_id in seen_ids:
                            errors.append(f"용어 ID 중복: {term_id} (파일: {filename})")
                        else:
                            seen_ids.add(term_id)

                except Exception as e:
                    errors.append(f"파일 읽기 오류 ({filename}): {e}")

        return errors

    def check_main_terms_duplicates(self):
        """terms-a-z.json 파일에서 중복 ID 검증"""
        errors = []
        main_file = self.base_path / "data/terms/terms-a-z.json"

        if not main_file.exists():
            return errors

        try:
            with open(main_file, 'r', encoding='utf-8') as f:
                terms = json.load(f)

            seen_ids = set()
            for i, term in enumerate(terms):
                term_id = term.get('id')
                if term_id:
                    if term_id in seen_ids:
                        errors.append(f"terms-a-z.json ID 중복: {term_id} (인덱스: {i})")
                    else:
                        seen_ids.add(term_id)

            # 통계 정보 출력
            total_terms = len(terms)
            unique_ids = len(seen_ids)
            duplicates = total_terms - unique_ids

            print(f"📊 terms-a-z.json 분석:")
            print(f"   총 용어: {total_terms}")
            print(f"   고유 ID: {unique_ids}")
            print(f"   중복 수: {duplicates}")

        except Exception as e:
            errors.append(f"terms-a-z.json 파일 읽기 오류: {e}")

        return errors

    def check_english_duplicates(self):
        """영어 용어 중복 검증"""
        errors = []
        seen_english = defaultdict(list)

        for filename in os.listdir(self.groups_dir):
            if filename.startswith('terms-') and filename.endswith('.json'):
                filepath = self.groups_dir / filename

                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        terms = json.load(f)

                    for term in terms:
                        english = term['english'].lower()
                        seen_english[english].append((term['id'], filename))

                except Exception as e:
                    errors.append(f"파일 읽기 오류 ({filename}): {e}")

        # 중복 찾기
        for english, occurrences in seen_english.items():
            if len(occurrences) > 1:
                ids_files = [f"{id}({file})" for id, file in occurrences]
                errors.append(f"영어 용어 중복: '{english}' -> {', '.join(ids_files)}")

        return errors

    def check_korean_duplicates(self):
        """한국어 용어 중복 검증"""
        errors = []
        seen_korean = defaultdict(list)

        for filename in os.listdir(self.groups_dir):
            if filename.startswith('terms-') and filename.endswith('.json'):
                filepath = self.groups_dir / filename

                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        terms = json.load(f)

                    for term in terms:
                        korean = term['korean']
                        seen_korean[korean].append((term['id'], filename))

                except Exception as e:
                    errors.append(f"파일 읽기 오류 ({filename}): {e}")

        # 중복 찾기
        for korean, occurrences in seen_korean.items():
            if len(occurrences) > 1:
                ids_files = [f"{id}({file})" for id, file in occurrences]
                errors.append(f"한국어 용어 중복: '{korean}' -> {', '.join(ids_files)}")

        return errors

def main():
    checker = DuplicateChecker()
    success = checker.check_duplicates()

    if not success:
        print("\n💡 중복 해결 방법:")
        print("   • 용어 ID는 고유해야 함")
        print("   • 같은 영어/한국어 용어는 다른 ID로 구분")
        print("   • 대안 용어(alternatives) 필드 활용")
        sys.exit(1)
    else:
        print("\n🎉 중복 검증 완료!")
        sys.exit(0)

if __name__ == "__main__":
    main()
