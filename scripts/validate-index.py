#!/usr/bin/env python3
"""
용어집 데이터 검증 스크립트
현재 프로젝트 구조에 맞는 간단한 검증
"""

import json
import os
import sys
from pathlib import Path

class IndexValidator:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.terms_dir = self.base_path / "data/terms"

    def validate_indexes(self):
        """용어 데이터의 기본 검증"""
        print("🔍 용어 데이터 검증 시작...")
        errors = []

        # 용어 파일들 존재 여부 확인
        json_files = list(self.terms_dir.glob("*.json"))
        if not json_files:
            errors.append("용어 파일이 존재하지 않습니다.")
            return False

        print(f"✅ {len(json_files)}개의 용어 파일 발견")

        # 각 파일의 기본 구조 검증
        for filepath in json_files:
            file_errors = self.validate_file_structure(filepath)
            errors.extend(file_errors)

        if errors:
            print(f"❌ {len(errors)}개의 데이터 오류 발견:")
            for error in errors:
                print(f"   • {error}")
            return False
        else:
            print("✅ 용어 데이터 검증 통과!")
            return True

    def validate_file_structure(self, filepath):
        """용어 파일의 기본 구조 검증"""
        errors = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 파일이 배열인지 확인
            if isinstance(data, list):
                terms_count = len(data)
                print(f"   • {filepath.name}: {terms_count}개 용어")
                
                # 각 용어의 필수 필드 확인
                for i, term in enumerate(data[:5]):  # 처음 5개만 샘플 검사
                    if not isinstance(term, dict):
                        errors.append(f"{filepath.name}: 용어 {i+1}이 객체가 아닙니다")
                        continue
                    
                    required_fields = ['id', 'english', 'korean']
                    for field in required_fields:
                        if field not in term:
                            errors.append(f"{filepath.name}: 용어 {i+1}에 '{field}' 필드 누락")
                        
            else:
                # 단일 용어 파일
                required_fields = ['id', 'english', 'korean']
                for field in required_fields:
                    if field not in data:
                        errors.append(f"{filepath.name}: '{field}' 필드 누락")
                        
        except json.JSONDecodeError as e:
            errors.append(f"{filepath.name}: JSON 파싱 오류 - {e}")
        except Exception as e:
            errors.append(f"{filepath.name}: 파일 처리 오류 - {e}")

        return errors

def main():
    validator = IndexValidator()
    success = validator.validate_indexes()

    if not success:
        print("\n💡 수정 방법:")
        print("   • 용어 파일의 JSON 형식을 확인하세요")
        print("   • 필수 필드(id, english, korean)가 모든 용어에 포함되어 있는지 확인하세요")
        sys.exit(1)
    else:
        print("\n🎉 데이터 검증 완료!")
        sys.exit(0)

if __name__ == "__main__":
    main()