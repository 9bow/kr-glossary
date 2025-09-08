#!/usr/bin/env python3
"""
개선된 스크립트들의 기능 테스트
실제 GitHub API 없이 로직 검증
"""

import sys
import os
import re
import json
from unittest.mock import Mock, patch

# 스크립트 경로를 Python path에 추가
sys.path.append(os.path.dirname(__file__))

def test_approval_patterns():
    """승인 키워드 패턴 테스트"""
    print("🔍 승인 키워드 패턴 테스트...")
    
    # check-approval-enhanced.py에서 패턴 가져오기
    from check_approval_enhanced import ApprovalChecker
    
    checker = ApprovalChecker("fake-token")
    
    test_cases = [
        ("LGTM", True),
        ("lgtm", True),
        ("승인", True),
        ("승인합니다", True),
        ("✅ 승인", True),
        ("/approve", True),
        ("approved", True),
        ("좋습니다", True),
        ("괜찮습니다", True),
        ("이것은 승인이 아닙니다", False),
        ("거부합니다", False),
        ("수정이 필요합니다", False),
    ]
    
    passed = 0
    for comment, expected in test_cases:
        result = checker.is_approval_comment(comment)
        if result == expected:
            print(f"  ✅ '{comment}' -> {result}")
            passed += 1
        else:
            print(f"  ❌ '{comment}' -> {result} (예상: {expected})")
    
    print(f"승인 패턴 테스트: {passed}/{len(test_cases)} 통과")
    return passed == len(test_cases)

def test_admin_config_loading():
    """관리자 설정 로딩 테스트"""
    print("\n🔍 관리자 설정 로딩 테스트...")
    
    # assign-reviewers-enhanced.py에서 클래스 가져오기
    from assign_reviewers_enhanced import ReviewerAssigner
    
    assigner = ReviewerAssigner("fake-token")
    
    # Mock 협업자 데이터
    mock_collaborators = [
        {
            "login": "admin1",
            "permissions": {"admin": True, "maintain": False, "push": True, "pull": True}
        },
        {
            "login": "maintainer1", 
            "permissions": {"admin": False, "maintain": True, "push": True, "pull": True}
        },
        {
            "login": "contributor1",
            "permissions": {"admin": False, "maintain": False, "push": True, "pull": True}
        }
    ]
    
    # Mock 설정 파일 데이터
    mock_config = {
        "admins": {
            "admin1": {
                "role": "owner",
                "name": "관리자1",
                "specializations": ["ML", "전체 영역"],
                "active": True
            }
        }
    }
    
    # requests.get을 mock
    with patch('requests.get') as mock_get:
        # 협업자 API 응답 mock
        collab_response = Mock()
        collab_response.status_code = 200
        collab_response.json.return_value = mock_collaborators
        
        # 설정 파일 API 응답 mock
        config_response = Mock()
        config_response.status_code = 200
        config_response.json.return_value = {
            'content': 'ewogICJhZG1pbnMiOiB7CiAgICAiYWRtaW4xIjogewogICAgICAicm9sZSI6ICJvd25lciIsCiAgICAgICJuYW1lIjogIuqwgOumrOyekDEiLAogICAgICAic3BlY2lhbGl6YXRpb25zIjogWyJNTCIsICLsoITssK0g7JiB7Jet0IAIWEAKICAKICAKICAKICAIIDQX+' # base64 encoded mock config
        }
        
        mock_get.side_effect = [collab_response, config_response]
        
        try:
            config = assigner.load_admin_config("test-owner", "test-repo")
            
            # 실제 관리자만 추출되었는지 확인
            admins = config.get('admins', {})
            
            if 'admin1' in admins and 'maintainer1' in admins:
                print("  ✅ 관리자 권한 사용자들이 정확히 추출됨")
                if 'contributor1' not in admins:
                    print("  ✅ 일반 contributor는 제외됨")
                    return True
                else:
                    print("  ❌ 일반 contributor가 관리자로 포함됨")
            else:
                print(f"  ❌ 관리자 추출 실패: {list(admins.keys())}")
                
        except Exception as e:
            print(f"  ❌ 테스트 중 오류: {e}")
    
    return False

def test_specialization_logic():
    """전문가 표시 로직 테스트"""
    print("\n🔍 전문가 표시 로직 테스트...")
    
    from assign_reviewers_enhanced import ReviewerAssigner
    
    assigner = ReviewerAssigner("fake-token")
    
    # 테스트 관리자 정보
    admins = {
        "ml-expert": {
            "name": "ML 전문가",
            "role": "maintainer",
            "specializations": ["ML", "DL"]
        },
        "general-admin": {
            "name": "일반 관리자", 
            "role": "owner",
            "specializations": ["전체 영역"]
        }
    }
    
    admin_config = {"admins": admins}
    
    # 테스트 케이스들
    test_cases = [
        {
            "reviewers": ["ml-expert"],
            "specialization": "ML",
            "should_show_expert": True,
            "description": "ML 전문가 + ML 전문 분야"
        },
        {
            "reviewers": ["general-admin"],
            "specialization": "ML", 
            "should_show_expert": False,
            "description": "일반 관리자 + 전체 영역은 전문가 표시 안함"
        },
        {
            "reviewers": ["ml-expert"],
            "specialization": None,
            "should_show_expert": False,
            "description": "전문 분야가 없으면 전문가 표시 안함"
        }
    ]
    
    passed = 0
    for case in test_cases:
        comment = assigner.generate_assignment_comment(
            case["reviewers"], admin_config, case["specialization"], "term-addition"
        )
        
        has_expert_mark = "⭐" in comment and "전문가" in comment
        
        if has_expert_mark == case["should_show_expert"]:
            print(f"  ✅ {case['description']}")
            passed += 1
        else:
            print(f"  ❌ {case['description']} - 예상: {case['should_show_expert']}, 실제: {has_expert_mark}")
    
    print(f"전문가 표시 테스트: {passed}/{len(test_cases)} 통과")
    return passed == len(test_cases)

def main():
    """메인 테스트 함수"""
    print("🧪 개선된 스크립트 기능 테스트 시작\n")
    
    tests = [
        ("승인 키워드 인식", test_approval_patterns),
        ("관리자 권한 확인", test_admin_config_loading), 
        ("전문가 표시 로직", test_specialization_logic),
    ]
    
    passed_tests = 0
    total_tests = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                print(f"✅ {test_name} 테스트 통과\n")
                passed_tests += 1
            else:
                print(f"❌ {test_name} 테스트 실패\n")
        except Exception as e:
            print(f"❌ {test_name} 테스트 중 오류 발생: {e}\n")
    
    print("="*50)
    print(f"📊 테스트 결과: {passed_tests}/{total_tests} 통과")
    
    if passed_tests == total_tests:
        print("🎉 모든 테스트가 성공적으로 통과했습니다!")
        return True
    else:
        print("⚠️  일부 테스트가 실패했습니다.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)