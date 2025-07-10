// MCP 프레젠테이션 JavaScript 설정

// Mermaid 초기화 (더 간단한 방법)
document.addEventListener('DOMContentLoaded', function () {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                primaryColor: '#ea580c',
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#ea580c',
                lineColor: '#64748b',
                sectionBkgColor: '#f8fafc',
                altSectionBkgColor: '#ffffff',
                gridColor: '#e2e8f0',
                secondaryColor: '#f97316',
                tertiaryColor: '#fb923c',
                background: '#ffffff',
                mainBkg: '#ffffff',
                secondBkg: '#f8fafc',
                tertiaryBkg: '#fef2f2',
            },
            sequence: {
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
                width: 150,
                height: 65,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35,
                mirrorActors: true,
                bottomMarginAdj: 1,
                useMaxWidth: true,
                rightAngles: false,
                showSequenceNumbers: false,
            },
        })

        // 초기 렌더링
        setTimeout(() => {
            mermaid.init(undefined, '.mermaid, .mermaid-large')
        }, 1000)
    }
})

// Reveal.js 초기화
Reveal.initialize({
    // 기본 설정
    width: '100%',
    height: '100%',
    margin: 0.04,
    minScale: 0.2,
    maxScale: 2.0,

    // 중앙 정렬 활성화 (기본값)
    center: true,

    // 컨트롤 설정
    controls: true,
    controlsTutorial: false,
    controlsLayout: 'bottom-right',
    controlsBackArrows: 'faded',

    // 진행 표시
    progress: true,
    slideNumber: 'c/t',
    showSlideNumber: 'all',

    // 키보드 및 터치 설정
    keyboard: true,
    touch: true,
    loop: false,
    rtl: false,

    // 네비게이션 설정
    navigationMode: 'default',
    shuffle: false,
    fragments: true,
    fragmentInURL: true,

    // 자동 재생 설정 (발표용으로 비활성화)
    autoSlide: 0,
    autoSlideStoppable: true,
    autoSlideMethod: Reveal.navigateNext,

    // 히스토리 설정
    history: true,
    hashOneBasedIndex: false,

    // 미디어 설정
    previewLinks: false,
    preloadIframes: null,

    // 테마 설정
    transition: 'slide',
    transitionSpeed: 'default',
    backgroundTransition: 'fade',

    // 뷰포트 설정
    viewDistance: 3,
    mobileViewDistance: 2,

    // 플러그인 설정
    plugins: [RevealMarkdown, RevealHighlight, RevealNotes, RevealZoom],

    // 하이라이트 설정
    highlight: {
        highlightOnLoad: true,
        escapeHTML: false,
    },

    // 마크다운 설정
    markdown: {
        smartypants: true,
    },

    // 줌 설정
    zoom: {
        scale: 1.5,
    },
})

// 발표 최적화 기능들
document.addEventListener('DOMContentLoaded', function () {
    // Reveal.js 준비 완료 후 Mermaid 다시 렌더링
    Reveal.addEventListener('ready', function () {
        setTimeout(() => {
            if (typeof mermaid !== 'undefined') {
                mermaid.init(undefined, '.mermaid, .mermaid-large')
            }
        }, 500)
    })

    // 슬라이드 변경 시 이벤트
    Reveal.addEventListener('slidechanged', function (event) {
        // 현재 슬라이드 번호 표시
        const currentSlide = event.indexh + 1
        const totalSlides = Reveal.getTotalSlides()

        // 콘솔에 현재 슬라이드 정보 출력 (발표자용)
        console.log(`현재 슬라이드: ${currentSlide}/${totalSlides}`)

        // 특정 슬라이드에서 추가 처리
        if (currentSlide === 1) {
            // 타이틀 슬라이드
            document.body.classList.add('title-slide')
        } else {
            document.body.classList.remove('title-slide')
        }

        // Mermaid 다이어그램 재렌더링
        if (event.currentSlide.querySelector('.mermaid') || event.currentSlide.querySelector('.mermaid-large')) {
            setTimeout(() => {
                if (typeof mermaid !== 'undefined') {
                    mermaid.init(undefined, event.currentSlide.querySelectorAll('.mermaid, .mermaid-large'))
                }
            }, 200)
        }
    })

    // Fragment 표시 이벤트
    Reveal.addEventListener('fragmentshown', function (event) {
        // Fragment 애니메이션 최적화
        const fragment = event.fragment
        fragment.style.transform = 'translateY(0)'
        fragment.style.opacity = '1'
    })

    // Fragment 숨김 이벤트
    Reveal.addEventListener('fragmenthidden', function (event) {
        const fragment = event.fragment
        fragment.style.transform = 'translateY(20px)'
        fragment.style.opacity = '0.3'
    })

    // 키보드 단축키 추가
    document.addEventListener('keydown', function (event) {
        // 발표자용 단축키
        switch (event.key) {
            case 'b':
            case 'B':
                // 화면 블랙아웃
                document.body.classList.toggle('blackout')
                break
            case 'w':
            case 'W':
                // 화면 화이트아웃
                document.body.classList.toggle('whiteout')
                break
            case 'Escape':
                // 블랙아웃/화이트아웃 해제
                document.body.classList.remove('blackout', 'whiteout')
                break
        }
    })

    // 터치 제스처 최적화 (모바일 발표용)
    let touchStartX = 0
    let touchStartY = 0

    document.addEventListener('touchstart', function (event) {
        touchStartX = event.touches[0].clientX
        touchStartY = event.touches[0].clientY
    })

    document.addEventListener('touchend', function (event) {
        const touchEndX = event.changedTouches[0].clientX
        const touchEndY = event.changedTouches[0].clientY

        const deltaX = touchEndX - touchStartX
        const deltaY = touchEndY - touchStartY

        // 최소 스와이프 거리
        const minSwipeDistance = 50

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // 오른쪽 스와이프 - 이전 슬라이드
                Reveal.prev()
            } else {
                // 왼쪽 스와이프 - 다음 슬라이드
                Reveal.next()
            }
        }
    })

    // 성능 최적화
    // 이미지 지연 로딩
    const images = document.querySelectorAll('img[data-src]')
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target
                    img.src = img.dataset.src
                    img.removeAttribute('data-src')
                    observer.unobserve(img)
                }
            })
        })

        images.forEach((img) => imageObserver.observe(img))
    }

    // 코드 하이라이팅 최적화
    document.querySelectorAll('pre code').forEach((block) => {
        // 코드 블록에 언어 클래스 추가
        if (!block.className.includes('language-')) {
            block.className += ' language-javascript'
        }
    })

    // 발표 시간 추적 (선택사항)
    const startTime = new Date()

    // 발표 종료 시 시간 계산
    window.addEventListener('beforeunload', function () {
        const endTime = new Date()
        const duration = Math.round((endTime - startTime) / 1000 / 60) // 분 단위
        console.log(`발표 소요 시간: ${duration}분`)
    })
})

// 발표자 노트 기능
function showPresenterNotes() {
    const notes = [
        '1. 타이틀 슬라이드 - 청중 환영, 자기소개',
        '2. Hook - 청중의 관심 끌기, 문제 상황 제시',
        '3. MCP 개념 - 쉬운 비유로 설명',
        '4. 문제점 - Before/After 비교로 필요성 강조',
        '5. MCP 기능 - 3가지 핵심 기능 설명',
        '6. 아키텍처 - 간단한 플로우로 전체 구조 설명',
        '7. VS Code 연동 - 실제 구현 환경 소개',
        '8. 시나리오 - 구체적인 사용 사례',
        '9-11. 코드 예제 - 3단계 구현 방법',
        '12. 통합 흐름 - 전체 과정 요약',
        '13. 기술적 선택 - SSE/HTTPS 방식 설명',
        '14. 도입 효과 - 구체적 수치로 효과 입증',
        '15. 마무리 - 핵심 메시지 반복',
        '16. 질의응답 - 편안한 분위기 조성',
    ]

    console.log('=== 발표자 노트 ===')
    notes.forEach((note) => console.log(note))
}

// 발표 도구 함수들
window.presentationUtils = {
    showNotes: showPresenterNotes,

    // 현재 슬라이드 정보
    getCurrentSlide: function () {
        const current = Reveal.getIndices().h + 1
        const total = Reveal.getTotalSlides()
        return { current, total }
    },

    // 슬라이드 점프
    goToSlide: function (slideNumber) {
        Reveal.slide(slideNumber - 1)
    },

    // 타이머 시작
    startTimer: function () {
        const startTime = new Date()
        setInterval(() => {
            const now = new Date()
            const elapsed = Math.floor((now - startTime) / 1000)
            const minutes = Math.floor(elapsed / 60)
            const seconds = elapsed % 60
            console.log(`경과 시간: ${minutes}:${seconds.toString().padStart(2, '0')}`)
        }, 60000) // 1분마다 업데이트
    },
}

// 발표 시작 시 유용한 정보 출력
console.log('=== MCP 발표 시작 ===')
console.log('단축키:')
console.log('- 스페이스바/화살표: 슬라이드 이동')
console.log('- B: 화면 블랙아웃')
console.log('- W: 화면 화이트아웃')
console.log('- ESC: 블랙아웃/화이트아웃 해제')
console.log('- F: 전체화면')
console.log('- S: 발표자 노트 창')
console.log('함수: presentationUtils.showNotes() - 발표자 노트 보기')
console.log('예상 발표 시간: 40분 (질의응답 포함)')
console.log('총 슬라이드: 16개')
