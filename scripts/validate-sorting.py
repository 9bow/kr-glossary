#!/usr/bin/env python3
"""
용어 정렬 검증 스크립트
각 그룹 내 용어들이 알파벳순으로 정렬되어 있는지 검증
"""

import json
import os
import sys
from pathlib import Path

class SortingValidator:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.terms_dir = self.base_path / "data/terms"

    def validate_sorting(self):
        """모든 용어 파일의 정렬 상태 검증"""
        print("🔍 용어 정렬 검증 시작...")
        errors = []

        for filename in os.listdir(self.terms_dir):
            if filename.endswith('.json'):
                filepath = self.terms_dir / filename
                file_errors = self.validate_file_sorting(filepath)
                errors.extend(file_errors)

        if errors:
            print(f"❌ {len(errors)}개의 정렬 오류 발견:")
            for error in errors:
                print(f"   • {error}")
            return False
        else:
            print("✅ 모든 그룹 정렬 검증 통과!")
            return True

    def validate_file_sorting(self, filepath):
        """용어 파일 내 용어 정렬 검증"""
        errors = []

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 파일이 배열인지 확인
            if isinstance(data, list):
                terms = data
            else:
                # 단일 용어 파일인 경우 정렬 검증 불필요
                return errors

            # 현재 정렬 상태 확인
            current_order = [term['english'].upper() for term in terms]
            expected_order = sorted(current_order)

            # 정렬 오류 찾기
            for i, (current, expected) in enumerate(zip(current_order, expected_order)):
                if current != expected:
                    term = terms[i]
                    errors.append(
                        f"{filepath.name}: '{term['english']}' (위치 {i+1}) "
                        f"정렬 필요 - 예상 위치: {expected_order.index(current) + 1}"
                    )
                    break  # 첫 번째 오류만 보고

        except Exception as e:
            errors.append(f"{filepath.name}: 파일 처리 오류 - {e}")

        return errors

def main():
    validator = SortingValidator()
    success = validator.validate_sorting()

    if not success:
        print("\n💡 정렬 수정 방법:")
        print("   • python scripts/migrate-terms.py 실행하여 자동 정렬")
        print("   • 또는 수동으로 용어들을 알파벳순으로 재배열")
        sys.exit(1)
    else:
        print("\n🎉 정렬 검증 완료!")
        sys.exit(0)

if __name__ == "__main__":
    main()
