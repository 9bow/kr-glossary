#!/bin/bash

# GitHub Actions 워크플로우를 로컬에서 테스트하는 스크립트
# act (https://github.com/nektos/act) 도구를 사용하여 GitHub Actions를 로컬에서 실행

set -e

echo "🚀 GitHub Actions 워크플로우 로컬 테스트 시작..."

# 프로젝트 루트 디렉토리로 이동
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# act 설치 확인
check_act() {
    if ! command -v act &> /dev/null; then
        log_warning "act가 설치되어 있지 않습니다."
        echo "설치 방법:"
        echo "  - macOS: brew install act"
        echo "  - Linux: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
        echo "  - 기타: https://github.com/nektos/act#installation"
        exit 1
    fi
    log_success "act $(act --version) 발견됨"
}

# Docker 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다. act를 사용하려면 Docker가 필요합니다."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker가 실행되고 있지 않습니다. Docker를 시작해주세요."
        exit 1
    fi

    log_success "Docker가 정상 작동 중"
}

# 워크플로우 파일 존재 확인
check_workflow() {
    if [ ! -f ".github/workflows/deploy.yml" ]; then
        log_error ".github/workflows/deploy.yml 파일을 찾을 수 없습니다."
        exit 1
    fi
    log_success "GitHub Actions 워크플로우 파일 발견됨"
}

# 테스트 실행
run_act_test() {
    log_info "GitHub Actions 워크플로우 테스트 실행 중..."

    # 기본 이벤트로 테스트 (push 이벤트)
    echo "📋 테스트할 이벤트 타입을 선택하세요:"
    echo "  1) push 이벤트 (main 브랜치)"
    echo "  2) pull_request 이벤트"
    echo "  3) 모든 이벤트 테스트"
    read -p "선택 (1-3): " choice

    case $choice in
        1)
            log_info "push 이벤트 테스트 실행..."
            act push --workflows .github/workflows/deploy.yml --eventpath <(echo '{"ref": "refs/heads/main"}')
            ;;
        2)
            log_info "pull_request 이벤트 테스트 실행..."
            act pull_request --workflows .github/workflows/deploy.yml
            ;;
        3)
            log_info "모든 이벤트 테스트 실행..."
            echo "🔍 push 이벤트 테스트..."
            act push --workflows .github/workflows/deploy.yml --eventpath <(echo '{"ref": "refs/heads/main"}') || true
            echo ""
            echo "🔍 pull_request 이벤트 테스트..."
            act pull_request --workflows .github/workflows/deploy.yml || true
            ;;
        *)
            log_warning "잘못된 선택입니다. 기본적으로 push 이벤트를 테스트합니다."
            act push --workflows .github/workflows/deploy.yml --eventpath <(echo '{"ref": "refs/heads/main"}')
            ;;
    esac
}

# 메뉴얼 테스트 옵션
run_manual_test() {
    log_info "메뉴얼 빌드 테스트 실행..."

    # 의존성 설치
    log_info "의존성 설치 중..."
    npm ci

    # 타입 체크
    log_info "타입 체크 중..."
    npm run type-check

    # 린트
    log_info "코드 린트 중..."
    npm run lint

    # 빌드
    log_info "프로덕션 빌드 중..."
    npm run build

    # 빌드 결과 확인
    if [ -d "dist" ]; then
        log_success "빌드 성공! dist 폴더가 생성되었습니다."

        # 파일 크기 확인
        echo ""
        log_info "빌드 결과 요약:"
        echo "📁 총 파일 수: $(find dist -type f | wc -l)"
        echo "📊 총 크기: $(du -sh dist | cut -f1)"

        # 주요 파일들 확인
        echo ""
        log_info "주요 파일들:"
        ls -la dist/ | head -10

    else
        log_error "빌드 실패! dist 폴더가 생성되지 않았습니다."
        exit 1
    fi
}

# 메인 메뉴
main_menu() {
    echo ""
    echo "🔧 GitHub Actions 로컬 테스트 도구"
    echo "======================================"
    echo "1) act를 사용한 워크플로우 테스트"
    echo "2) 메뉴얼 빌드 테스트"
    echo "3) 환경 확인"
    echo "4) 종료"
    echo ""
    read -p "선택 (1-4): " choice

    case $choice in
        1)
            check_act
            check_docker
            check_workflow
            run_act_test
            ;;
        2)
            run_manual_test
            ;;
        3)
            log_info "환경 확인 중..."
            check_act
            check_docker
            check_workflow
            echo ""
            log_info "시스템 정보:"
            echo "OS: $(uname -s)"
            echo "Node.js: $(node --version 2>/dev/null || echo '설치되지 않음')"
            echo "npm: $(npm --version 2>/dev/null || echo '설치되지 않음')"
            echo "Docker: $(docker --version 2>/dev/null || echo '설치되지 않음')"
            ;;
        4)
            log_info "프로그램을 종료합니다."
            exit 0
            ;;
        *)
            log_warning "잘못된 선택입니다. 다시 선택해주세요."
            main_menu
            ;;
    esac
}

# 시작
main_menu

log_success "테스트 완료!"
