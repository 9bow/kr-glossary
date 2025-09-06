#!/bin/bash

# AI/ML 용어집 저장소 초기 설정 스크립트
# 이 스크립트는 새로운 저장소에서 단 한 번만 실행되어야 합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
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

# 배너 출력
print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║           AI/ML 용어집 저장소 초기 설정            ║"
    echo "║                                                    ║"
    echo "║    이 스크립트는 용어집 프로젝트의 GitHub         ║"
    echo "║    저장소를 완전 자동화 워크플로우에 맞게          ║"
    echo "║    초기 설정합니다.                                ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 설정 완료 상태 확인 파일
SETUP_MARKER_FILE=".github/.repository-setup-complete"

check_already_setup() {
    if [ -f "$SETUP_MARKER_FILE" ]; then
        log_warning "이 저장소는 이미 초기 설정이 완료되었습니다."
        echo -e "설정 완료 시간: $(cat "$SETUP_MARKER_FILE")"
        echo -e "\n재설정을 원하시면 다음 파일을 삭제하고 다시 실행하세요:"
        echo -e "${YELLOW}rm $SETUP_MARKER_FILE${NC}"
        exit 0
    fi
}

# GitHub CLI 및 권한 확인
check_prerequisites() {
    log_info "사전 요구사항 확인 중..."
    
    # GitHub CLI 설치 확인
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh)가 설치되지 않았습니다."
        echo "설치 방법: https://cli.github.com/"
        exit 1
    fi
    
    # GitHub CLI 인증 확인
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI에 로그인되지 않았습니다."
        echo "다음 명령어로 로그인하세요: gh auth login"
        exit 1
    fi
    
    # Git 저장소 확인
    if ! git rev-parse --git-dir &> /dev/null; then
        log_error "Git 저장소가 아닙니다."
        exit 1
    fi
    
    log_success "사전 요구사항 확인 완료"
}

# 저장소 정보 확인
get_repo_info() {
    log_info "저장소 정보 확인 중..."
    
    # Git remote URL에서 저장소 정보 추출
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -z "$REPO_URL" ]; then
        log_error "Git remote origin이 설정되지 않았습니다."
        exit 1
    fi
    
    # GitHub 저장소 URL 파싱
    if [[ $REPO_URL =~ github\.com[/:]([^/]+)/([^/.]+) ]]; then
        REPO_OWNER="${BASH_REMATCH[1]}"
        REPO_NAME="${BASH_REMATCH[2]}"
    else
        log_error "유효한 GitHub 저장소 URL이 아닙니다: $REPO_URL"
        exit 1
    fi
    
    # gh cli로 저장소 정보 확인
    REPO_INFO=$(gh repo view "$REPO_OWNER/$REPO_NAME" --json name,owner,url,description 2>/dev/null || echo "")
    if [ -z "$REPO_INFO" ]; then
        log_error "저장소에 접근할 수 없습니다: $REPO_OWNER/$REPO_NAME"
        exit 1
    fi
    
    REPO_DESCRIPTION=$(echo "$REPO_INFO" | jq -r '.description // "AI/ML 용어집"')
    
    log_success "저장소 정보 확인 완료"
    echo "  - 소유자: $REPO_OWNER"
    echo "  - 저장소: $REPO_NAME"
    echo "  - URL: https://github.com/$REPO_OWNER/$REPO_NAME"
    echo "  - 설명: $REPO_DESCRIPTION"
}

# 사용자 확인
confirm_setup() {
    echo
    echo -e "${YELLOW}⚠️  주의: 다음 설정들이 저장소에 적용됩니다:${NC}"
    echo "  1. GitHub Labels 생성/업데이트"
    echo "  2. Branch Protection Rules 설정 (master 브랜치)"
    echo "  3. Repository Settings 업데이트"
    echo "  4. Issue 및 Discussion 기능 활성화"
    echo "  5. GitHub Pages 설정"
    echo "  6. 관리자 정보 업데이트"
    echo
    echo -e "${YELLOW}이 작업은 되돌리기 어려울 수 있습니다.${NC}"
    echo
    
    read -p "계속하시겠습니까? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "설정이 취소되었습니다."
        exit 0
    fi
}

# GitHub Labels 설정
setup_labels() {
    log_info "GitHub Labels 설정 중..."
    
    # 기존 라벨 목록 가져오기
    EXISTING_LABELS=$(gh label list --limit 100 --json name,color,description)
    
    # 필요한 라벨들 정의 (WORKFLOW.md 기반)
    declare -A LABELS=(
        # 자동 라벨
        ["term-addition"]="1d76db:용어 추가 이슈"
        ["term-modification"]="0052cc:용어 수정 이슈"
        ["contributor-addition"]="5319e7:기여자 추가"
        ["organization-addition"]="d73a4a:조직 추가"
        ["admin-addition"]="b60205:관리자 추가"
        ["verification-org"]="9f2c89:검증 조직 추가"
        ["auto-validated"]="0e8a16:자동 검증 통과"
        ["ready-for-review"]="fbca04:관리자 검토 준비 완료"
        ["approved"]="0e8a16:관리자 승인 완료"
        ["pr-created"]="5319e7:자동 PR 생성 완료"
        
        # 수동 라벨
        ["needs-completion"]="d93f0b:필수 필드 미완성"
        ["needs-changes"]="d93f0b:수정 필요"
        ["needs-improvement"]="d93f0b:개선 필요"
        ["needs-more-info"]="d93f0b:추가 정보 필요"
        ["duplicate-found"]="cfd3d7:중복 용어 발견"
        
        # 우선순위 라벨
        ["priority-high"]="b60205:긴급 처리 필요"
        ["priority-medium"]="fbca04:일반 처리"
        ["priority-low"]="0e8a16:낮은 우선순위"
        
        # 상태 라벨
        ["resolved"]="0e8a16:이슈 해결 완료"
        ["preview-available"]="6f42c1:미리보기 사용 가능"
        ["auto-generated"]="7057ff:자동 생성됨"
    )
    
    local created=0
    local updated=0
    local skipped=0
    
    for label_name in "${!LABELS[@]}"; do
        IFS=':' read -r color description <<< "${LABELS[$label_name]}"
        
        # 기존 라벨 확인
        if echo "$EXISTING_LABELS" | jq -e --arg name "$label_name" '.[] | select(.name == $name)' > /dev/null; then
            # 라벨 업데이트
            if gh label edit "$label_name" --color "$color" --description "$description" &> /dev/null; then
                ((updated++))
            else
                log_warning "라벨 업데이트 실패: $label_name"
            fi
        else
            # 새 라벨 생성
            if gh label create "$label_name" --color "$color" --description "$description" &> /dev/null; then
                ((created++))
            else
                log_warning "라벨 생성 실패: $label_name"
            fi
        fi
    done
    
    log_success "GitHub Labels 설정 완료 (생성: $created, 업데이트: $updated, 건너뛰기: $skipped)"
}

# Branch Protection Rules 설정
setup_branch_protection() {
    log_info "Branch Protection Rules 설정 중..."
    
    # master 브랜치 보호 규칙 설정
    if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/branches/master/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"contexts":["build"]}' \
        --field enforce_admins=false \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
        --field restrictions=null &> /dev/null; then
        log_success "Branch Protection Rules 설정 완료"
    else
        log_warning "Branch Protection Rules 설정 실패 (권한이 부족하거나 이미 설정됨)"
    fi
}

# Repository Settings 업데이트
setup_repository_settings() {
    log_info "Repository Settings 업데이트 중..."
    
    # Repository 기본 설정
    gh api repos/"$REPO_OWNER"/"$REPO_NAME" \
        --method PATCH \
        --field has_issues=true \
        --field has_projects=true \
        --field has_wiki=false \
        --field has_discussions=true \
        --field has_pages=true \
        --field allow_squash_merge=true \
        --field allow_merge_commit=false \
        --field allow_rebase_merge=false \
        --field delete_branch_on_merge=true \
        > /dev/null
    
    log_success "Repository Settings 업데이트 완료"
}

# GitHub Pages 설정
setup_github_pages() {
    log_info "GitHub Pages 설정 중..."
    
    # GitHub Actions를 통한 Pages 배포 설정
    if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/pages \
        --method POST \
        --field source='{"branch":"gh-pages","path":"/"}' \
        --field build_type="workflow" &> /dev/null; then
        log_success "GitHub Pages 설정 완료"
    else
        # 이미 설정되어 있을 수 있음
        if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/pages &> /dev/null; then
            log_success "GitHub Pages 이미 설정됨"
        else
            log_warning "GitHub Pages 설정 실패"
        fi
    fi
}

# Repository Secrets 설정 가이드
setup_secrets_guide() {
    log_info "Repository Secrets 설정 가이드"
    
    echo -e "\n${YELLOW}다음 Secrets를 수동으로 설정해야 합니다:${NC}"
    echo "GitHub Repository > Settings > Secrets and variables > Actions"
    echo
    echo "Repository Secrets:"
    echo "  - 현재 자동 설정할 수 있는 secret이 없습니다"
    echo "  - 필요시 GISCUS_REPO_ID, GA_TRACKING_ID 등을 추가하세요"
    echo
    echo "Environment Variables (선택사항):"
    echo "  - VITE_SERVICE_DOMAIN: 서비스 도메인"
    echo "  - VITE_GA_TRACKING_ID: Google Analytics ID"
    echo "  - VITE_SENTRY_DSN: Sentry DSN"
}

# 관리자 설정 업데이트
update_admin_config() {
    log_info "관리자 설정 업데이트 중..."
    
    # 현재 저장소 소유자 정보로 admin 설정 업데이트
    CURRENT_USER=$(gh api user --jq '.login')
    CURRENT_USER_NAME=$(gh api user --jq '.name // .login')
    
    # admins.json 파일 업데이트
    if [ -f ".github/config/admins.json" ]; then
        # 기존 파일을 백업
        cp ".github/config/admins.json" ".github/config/admins.json.backup"
        
        # 현재 사용자를 첫 번째 admin으로 업데이트
        jq --arg login "$CURRENT_USER" --arg name "$CURRENT_USER_NAME" \
           '.admins["'$CURRENT_USER'"] = {
                "role": "owner",
                "name": $name,
                "specializations": ["ML", "DL", "전체 영역"],
                "permissions": ["approve", "merge", "admin"],
                "email": "'$CURRENT_USER'@users.noreply.github.com",
                "github": $login,
                "active": true
            }' .github/config/admins.json > .github/config/admins.json.tmp
        
        mv .github/config/admins.json.tmp .github/config/admins.json
        
        log_success "관리자 설정 업데이트 완료 ($CURRENT_USER 추가)"
    else
        log_warning "관리자 설정 파일을 찾을 수 없습니다: .github/config/admins.json"
    fi
}

# 설정 완료 표시
mark_setup_complete() {
    log_info "설정 완료 표시 생성 중..."
    
    # 설정 완료 마커 파일 생성
    mkdir -p "$(dirname "$SETUP_MARKER_FILE")"
    cat > "$SETUP_MARKER_FILE" << EOF
# AI/ML 용어집 저장소 초기 설정 완료
# 
# 설정 완료 시간: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# 설정된 저장소: $REPO_OWNER/$REPO_NAME
# 설정 실행자: $(gh api user --jq '.login')
# 
# 이 파일이 존재하는 동안 초기 설정 스크립트는 실행되지 않습니다.
# 재설정이 필요한 경우 이 파일을 삭제하고 스크립트를 다시 실행하세요.

$(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF
    
    log_success "설정 완료 표시 생성 완료"
}

# 설정 완료 안내
print_completion_guide() {
    echo
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║                🎉 설정 완료! 🎉                   ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}다음 단계를 완료하세요:${NC}"
    echo
    echo "1. 관리자 정보 검토 및 수정:"
    echo "   파일: .github/config/admins.json"
    echo
    echo "2. 환경변수 설정 (선택사항):"
    echo "   파일: .env (로컬), Repository Secrets (배포용)"
    echo
    echo "3. 첫 번째 용어 추가 테스트:"
    echo "   Issue 템플릿을 사용하여 테스트 용어를 추가해보세요"
    echo "   URL: https://github.com/$REPO_OWNER/$REPO_NAME/issues/new/choose"
    echo
    echo "4. GitHub Pages 배포 확인:"
    echo "   첫 번째 PR 병합 후 Pages가 자동 배포되는지 확인하세요"
    echo
    echo -e "${YELLOW}⚠️  중요: 설정을 변경하려면 다음 파일을 삭제하고 스크립트를 다시 실행하세요:${NC}"
    echo "   rm $SETUP_MARKER_FILE"
    echo
    log_success "AI/ML 용어집 저장소 초기 설정이 완료되었습니다!"
}

# 도움말 출력
show_help() {
    echo "AI/ML 용어집 저장소 초기 설정 스크립트"
    echo
    echo "사용법:"
    echo "  ./scripts/setup-repository.sh [옵션]"
    echo
    echo "옵션:"
    echo "  -h, --help     이 도움말을 표시합니다"
    echo "  -c, --check    현재 설정 상태만 확인합니다"
    echo "  --dry-run      실제 설정 없이 테스트 실행합니다"
    echo
    echo "설명:"
    echo "  이 스크립트는 새로운 AI/ML 용어집 저장소를 완전 자동화"
    echo "  워크플로우에 맞게 초기 설정합니다. 단 한 번만 실행되어야 합니다."
    echo
    echo "설정 항목:"
    echo "  • GitHub Labels (워크플로우용)"
    echo "  • Branch Protection Rules (master 브랜치)"
    echo "  • Repository Settings (Issues, Pages 등)"
    echo "  • 관리자 설정 업데이트"
    echo
    echo "사전 요구사항:"
    echo "  • GitHub CLI (gh) 설치 및 로그인"
    echo "  • 저장소에 대한 Admin 권한"
    echo "  • Git 저장소 (remote origin 설정됨)"
}

# 설정 상태만 확인
check_status_only() {
    print_banner
    log_info "현재 설정 상태를 확인합니다..."
    
    check_prerequisites
    get_repo_info
    
    echo
    log_info "설정 상태 확인 중..."
    
    # 설정 완료 여부 확인
    if [ -f "$SETUP_MARKER_FILE" ]; then
        log_success "초기 설정이 완료되어 있습니다"
        echo "  설정 완료 시간: $(cat "$SETUP_MARKER_FILE" | tail -1)"
    else
        log_warning "초기 설정이 완료되지 않았습니다"
    fi
    
    # 라벨 상태 확인
    LABEL_COUNT=$(gh label list --limit 100 --json name | jq length)
    log_info "현재 GitHub Labels: $LABEL_COUNT개"
    
    # Pages 설정 확인
    if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/pages &> /dev/null; then
        log_success "GitHub Pages가 설정되어 있습니다"
    else
        log_warning "GitHub Pages가 설정되지 않았습니다"
    fi
    
    echo
    log_info "설정 상태 확인이 완료되었습니다"
}

# Dry run 모드
dry_run_mode() {
    log_info "🧪 DRY RUN 모드: 실제 변경사항 없이 테스트 실행합니다"
    
    print_banner
    check_prerequisites
    get_repo_info
    
    echo
    log_info "[DRY RUN] 다음 작업들이 실행될 예정입니다:"
    echo "  ✓ GitHub Labels 생성/업데이트"
    echo "  ✓ Branch Protection Rules 설정"
    echo "  ✓ Repository Settings 업데이트"
    echo "  ✓ GitHub Pages 설정"
    echo "  ✓ 관리자 설정 업데이트"
    echo "  ✓ 설정 완료 마커 생성"
    
    echo
    log_success "[DRY RUN] 테스트 완료 - 실제 변경사항 없음"
    echo
    echo "실제 설정을 실행하려면 다음 명령어를 사용하세요:"
    echo "  ./scripts/setup-repository.sh"
}

# 메인 실행 함수
main() {
    # 명령줄 인수 처리
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -c|--check)
            check_status_only
            exit 0
            ;;
        --dry-run)
            dry_run_mode
            exit 0
            ;;
        "")
            # 기본 실행
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            echo "도움말을 보려면 -h 또는 --help를 사용하세요."
            exit 1
            ;;
    esac
    
    print_banner
    
    # 기본 검사들
    check_already_setup
    check_prerequisites
    get_repo_info
    confirm_setup
    
    echo
    log_info "초기 설정을 시작합니다..."
    
    # 설정 실행
    setup_labels
    setup_branch_protection
    setup_repository_settings  
    setup_github_pages
    update_admin_config
    setup_secrets_guide
    mark_setup_complete
    
    # 완료 안내
    print_completion_guide
}

# 스크립트 실행 (직접 실행시에만)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi