#!/usr/bin/env python3
"""
용어집 구조 검증 스크립트
GitHub PR에서 용어 구조의 유효성을 검증
"""

import json
import os
import sys
from pathlib import Path
import jsonschema

class TermValidator:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.terms_dir = self.base_path / "data/terms"

        # 용어 스키마 정의 (다중 정의 지원)
        self.term_schema = {
            "type": "object",
            "required": ["english", "korean", "status", "contributors", "metadata"],
            "properties": {
                "english": {"type": "string", "minLength": 1},
                "korean": {"type": "string", "minLength": 1},
                "alternatives": {"type": "array", "items": {"type": "string"}},
                "pronunciation": {"type": "string"},
                # 단일 정의 (하위 호환성)
                "definition": {
                    "type": "object",
                    "required": ["korean", "english"],
                    "properties": {
                        "korean": {"type": "string"},
                        "english": {"type": "string"}
                    }
                },
                # 다중 정의 지원
                "meanings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "title", "definition"],
                        "properties": {
                            "id": {"type": "string"},
                            "title": {
                                "type": "object",
                                "required": ["korean", "english"],
                                "properties": {
                                    "korean": {"type": "string"},
                                    "english": {"type": "string"}
                                }
                            },
                            "definition": {
                                "type": "object",
                                "required": ["korean", "english"],
                                "properties": {
                                    "korean": {"type": "string"},
                                    "english": {"type": "string"}
                                }
                            },
                            "context": {"type": "string"},
                            "domain": {"type": "string"},
                            "priority": {"type": "integer"},
                            "examples": {"type": "array"},
                            "references": {"type": "array"},
                            "contributors": {"type": "array"},
                            "validators": {"type": "array"},
                            "relatedPRs": {"type": "array"},
                            "metadata": {"type": "object"}
                        }
                    }
                },
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["korean", "english"],
                        "properties": {
                            "korean": {"type": "string"},
                            "english": {"type": "string"},
                            "source": {"type": "string"},
                            "url": {"type": "string", "format": "uri"}
                        }
                    }
                },
                "references": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["title", "url", "type"],
                        "properties": {
                            "title": {"type": "string"},
                            "url": {"type": "string", "format": "uri"},
                            "type": {"type": "string"},
                            "year": {"type": "integer"}
                        }
                    }
                },
                "relatedTerms": {"type": "array", "items": {"type": "string"}},
                "status": {"enum": ["proposed", "validated", "deprecated"]},
                "contributors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["githubUsername", "contributionType", "timestamp"],
                        "properties": {
                            "githubUsername": {"type": "string"},
                            "contributionType": {"enum": ["author", "reviewer", "translator"]},
                            "timestamp": {"type": "string", "format": "date-time"}
                        }
                    }
                },
                "validators": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "organizationId": {"type": "string"},
                            "validatedAt": {"type": "string", "format": "date-time"},
                            "validatorUsername": {"type": "string"}
                        }
                    }
                },
                "metadata": {
                    "type": "object",
                    "required": ["createdAt", "updatedAt", "version"],
                    "properties": {
                        "createdAt": {"type": "string", "format": "date-time"},
                        "updatedAt": {"type": "string", "format": "date-time"},
                        "version": {"type": "integer"},
                        "discussionUrl": {"type": "string", "format": "uri"}
                    }
                }
            }
        }

    def validate_all_terms(self):
        """모든 용어 파일 검증"""
        print("🔍 용어 구조 검증 시작...")
        errors = []

        # 용어 파일들 검증
        for filename in os.listdir(self.terms_dir):
            if filename.endswith('.json'):
                filepath = self.terms_dir / filename
                file_errors = self.validate_terms_file(filepath)
                errors.extend(file_errors)

        if errors:
            print(f"❌ {len(errors)}개의 오류 발견:")
            for error in errors:
                print(f"   • {error}")
            return False
        else:
            print("✅ 모든 용어 구조 검증 통과!")
            return True

    def validate_terms_file(self, filepath):
        """용어 파일 검증"""
        errors = []

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 파일이 배열인지 확인
            if isinstance(data, list):
                # 배열 형태의 용어 파일
                for i, term in enumerate(data):
                    term_errors = self.validate_term(term, filepath.name, i)
                    errors.extend(term_errors)
            else:
                # 단일 용어 객체
                term_errors = self.validate_term(data, filepath.name, 0)
                errors.extend(term_errors)

        except json.JSONDecodeError as e:
            errors.append(f"{filepath.name}: JSON 파싱 오류 - {e}")
        except Exception as e:
            errors.append(f"{filepath.name}: 파일 읽기 오류 - {e}")

        return errors

    def validate_term(self, term, filename, index):
        """개별 용어 검증"""
        errors = []

        try:
            # 스키마 검증
            jsonschema.validate(instance=term, schema=self.term_schema)

            # 추가 검증 규칙들
            errors.extend(self.validate_term_rules(term, filename, index))

        except jsonschema.ValidationError as e:
            errors.append(f"{filename}[{index}]: 스키마 검증 실패 - {e.message}")
        except Exception as e:
            errors.append(f"{filename}[{index}]: 검증 오류 - {e}")

        return errors

    def validate_term_rules(self, term, filename, index):
        """추가 검증 규칙들"""
        errors = []

        # 용어가 definition 또는 meanings 중 하나는 있어야 함
        if not term.get('definition') and not term.get('meanings'):
            errors.append(f"{filename}[{index}]: definition 또는 meanings 중 하나는 필수입니다")

        # 영어 용어는 첫 글자가 대문자여야 함
        if not term['english'][0].isupper():
            errors.append(f"{filename}[{index}]: 영어 용어는 첫 글자가 대문자여야 함")

        # 한국어 용어는 한글로 시작해야 함
        if not (ord('가') <= ord(term['korean'][0]) <= ord('힣')):
            errors.append(f"{filename}[{index}]: 한국어 용어는 한글로 시작해야 함")

        # 최소 1개 이상의 예시가 있어야 함
        if len(term['examples']) < 1:
            errors.append(f"{filename}[{index}]: 최소 1개 이상의 예시가 필요함")

        # 최소 1개 이상의 참고문헌이 있어야 함
        if len(term['references']) < 1:
            errors.append(f"{filename}[{index}]: 최소 1개 이상의 참고문헌이 필요함")

        # 영어 정의와 한국어 정의가 서로 달라야 함
        if term['definition']['english'] == term['definition']['korean']:
            errors.append(f"{filename}[{index}]: 영어/한국어 정의가 동일함")

        # 용어 ID 형식 검증 (알파벳-숫자 형식)
        if not self.is_valid_term_id(term['id']):
            errors.append(f"{filename}[{index}]: 용어 ID 형식이 올바르지 않음 (예: neural-network-001)")

        return errors

    def is_valid_term_id(self, term_id):
        """용어 ID 형식 검증"""
        parts = term_id.split('-')
        if len(parts) < 2:
            return False

        # 마지막 부분은 숫자여야 함
        if not parts[-1].isdigit():
            return False

        # 앞부분들은 알파벳과 숫자만 포함
        for part in parts[:-1]:
            if not part.replace('-', '').isalnum():
                return False

        return True

def main():
    validator = TermValidator()
    success = validator.validate_all_terms()

    if not success:
        print("\n💡 수정 방법:")
        print("   • 용어 ID: neural-network-001 형식으로 지정")
        print("   • 영어 용어: 첫 글자 대문자")
        print("   • 최소 1개의 예시와 참고문헌 포함")
        print("   • 영어/한국어 정의가 서로 다름")
        sys.exit(1)
    else:
        print("\n🎉 모든 용어 검증 완료!")
        sys.exit(0)

if __name__ == "__main__":
    main()
