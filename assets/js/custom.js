// MCP 프레젠테이션 커스텀 JavaScript

// Reveal.js 초기화
Reveal.initialize({
    hash: true,
    controls: true,
    progress: true,
    center: true,
    transition: 'slide',
    transitionSpeed: 'default',
    backgroundTransition: 'fade',
    parallaxBackgroundImage: '',
    parallaxBackgroundSize: '',
    parallaxBackgroundHorizontal: 0,
    parallaxBackgroundVertical: 0,
    
    // 모바일 친화적 설정
    touch: true,
    loop: false,
    rtl: false,
    shuffle: false,
    fragments: true,
    fragmentInURL: true,
    embedded: false,
    help: true,
    showNotes: false,
    autoPlayMedia: null,
    preloadIframes: null,
    autoSlide: 0,
    autoSlideStoppable: true,
    mouseWheel: false,
    hideInactiveCursor: true,
    hideCursorTime: 5000,
    previewLinks: false,
    
    // 키보드 단축키
    keyboard: {
        13: 'next', // Enter
        27: 'overview', // ESC
        32: 'next', // Space
        37: 'left', // Left arrow
        38: 'up', // Up arrow
        39: 'right', // Right arrow
        40: 'down', // Down arrow
        70: 'toggleFullscreen', // F
        83: 'toggleSpeakerNotes', // S
        79: 'toggleOverview', // O
        66: 'togglePause', // B
        191: 'toggleHelp' // ?
    },
    
    // 플러그인 설정
    plugins: [
        RevealMarkdown,
        RevealHighlight,
        RevealNotes
    ],
    
    // 코드 하이라이트 설정
    highlight: {
        beforeHighlight: function(hljs) {
            return true;
        },
        afterHighlight: function(hljs) {
            return true;
        }
    },
    
    // 마크다운 설정
    markdown: {
        smartypants: true
    }
});

// Mermaid 초기화 및 렌더링
function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false, // 수동 렌더링으로 변경
            theme: 'default',
            themeVariables: {
                primaryColor: '#ea580c',
                primaryTextColor: '#1c1917',
                primaryBorderColor: '#f97316',
                lineColor: '#71717a',
                secondaryColor: '#fafaf9',
                tertiaryColor: '#f8fafc',
                background: '#ffffff',
                fontFamily: 'Noto Sans KR, Apple SD Gothic Neo, sans-serif',
                fontSize: '16px'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 20
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
                showSequenceNumbers: false
            },
            gitGraph: {
                mainBranchName: 'main',
                showBranches: true,
                showCommitLabel: true,
                rotateCommitLabel: true
            }
        });
        
        // 초기 렌더링
        renderAllMermaidDiagrams();
    } else {
        console.warn('Mermaid library not loaded');
    }
}

// 모든 Mermaid 다이어그램 렌더링
function renderAllMermaidDiagrams() {
    const mermaidElements = document.querySelectorAll('.mermaid');
    
    mermaidElements.forEach((element, index) => {
        if (element.getAttribute('data-processed') === 'true') {
            return; // 이미 처리된 요소는 건너뛰기
        }
        
        const graphDefinition = element.textContent.trim();
        
        if (!graphDefinition) {
            console.warn('Empty mermaid diagram found');
            return;
        }
        
        const id = `mermaid-diagram-${index}-${Date.now()}`;
        
        try {
            // 기존 내용을 임시로 저장
            const originalContent = graphDefinition;
            
            // 로딩 표시
            element.innerHTML = '<div style="padding: 2rem; text-align: center; color: #71717a;">다이어그램 로딩 중...</div>';
            
            // Mermaid 렌더링
            mermaid.render(id, originalContent).then((result) => {
                element.innerHTML = result.svg;
                element.setAttribute('data-processed', 'true');
                
                // SVG 스타일 조정
                const svg = element.querySelector('svg');
                if (svg) {
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    svg.style.display = 'block';
                    svg.style.margin = '0 auto';
                }
                
                console.log(`Mermaid diagram ${id} rendered successfully`);
            }).catch((error) => {
                console.error(`Mermaid rendering error for ${id}:`, error);
                element.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #dc2626; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px;">
                        <p><strong>다이어그램 렌더링 오류</strong></p>
                        <p style="font-size: 0.9rem; margin-top: 1rem;">브라우저를 새로고침해주세요.</p>
                    </div>
                `;
                element.setAttribute('data-processed', 'error');
            });
            
        } catch (error) {
            console.error('Mermaid rendering error:', error);
            element.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #dc2626; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px;">
                    <p><strong>다이어그램 렌더링 오류</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 1rem;">다이어그램 문법을 확인해주세요.</p>
                </div>
            `;
            element.setAttribute('data-processed', 'error');
        }
    });
}

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 프레젠테이션 향상 기능 초기화
    initializeEnhancedFeatures();
    
    // Mermaid 라이브러리가 로드될 때까지 대기
    if (typeof mermaid !== 'undefined') {
        initializeMermaid();
    } else {
        // Mermaid가 로드되지 않은 경우 잠시 대기 후 재시도
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkMermaid = setInterval(() => {
            if (typeof mermaid !== 'undefined') {
                clearInterval(checkMermaid);
                initializeMermaid();
            } else if (retryCount >= maxRetries) {
                clearInterval(checkMermaid);
                console.error('Mermaid library failed to load');
            }
            retryCount++;
        }, 500);
    }
});

// Reveal.js 이벤트 리스너
Reveal.addEventListener('ready', function(event) {
    // 프레젠테이션이 준비되면 Mermaid 다시 렌더링
    setTimeout(() => {
        renderAllMermaidDiagrams();
    }, 1000);
});

// 슬라이드 변경 이벤트 리스너
Reveal.addEventListener('slidechanged', function(event) {
    // 현재 슬라이드의 Mermaid 다이어그램 확인 및 재렌더링
    const currentSlide = event.currentSlide;
    const mermaidInSlide = currentSlide.querySelectorAll('.mermaid[data-processed!="true"]');
    
    if (mermaidInSlide.length > 0) {
        setTimeout(() => {
            renderAllMermaidDiagrams();
        }, 300);
    }
    
    // 현재 슬라이드 인덱스
    const currentSlideIndex = event.indexh;
    
    // 특정 슬라이드에서 추가 처리
    switch(currentSlideIndex) {
        case 0: // 타이틀 슬라이드
            initializeQRCode();
            break;
        case 4: // 라이브 데모 슬라이드
            initializeDemoEffects();
            break;
        case 5: // 기술 구현 슬라이드
            highlightCodeSamples();
            break;
    }
    
    // 슬라이드 진행률 업데이트
    updateProgress();
});

// Fragment 표시 이벤트
Reveal.addEventListener('fragmentshown', function(event) {
    // Fragment가 표시될 때 Mermaid 다이어그램 재확인
    const fragment = event.fragment;
    const mermaidInFragment = fragment.querySelectorAll('.mermaid[data-processed!="true"]');
    
    if (mermaidInFragment.length > 0) {
        setTimeout(() => {
            renderAllMermaidDiagrams();
        }, 200);
    }
});

// QR 코드 초기화
function initializeQRCode() {
    const qrContainer = document.querySelector('.qr-code');
    if (qrContainer) {
        // QR 코드 생성 (실제 URL로 대체 필요)
        const currentUrl = window.location.href;
        generateQRCode(currentUrl);
    }
}

// QR 코드 생성 함수
function generateQRCode(url) {
    // 실제 구현에서는 QR 코드 생성 라이브러리 사용
    // 예: qrcode.js, qrcode-generator 등
    console.log('QR Code URL:', url);
    
    // 임시 QR 코드 이미지 생성
    const qrImage = document.querySelector('.qr-code img');
    if (qrImage) {
        // 실제 QR 코드 생성 서비스 또는 라이브러리 사용
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    }
}

// 데모 효과 초기화
function initializeDemoEffects() {
    const terminalElements = document.querySelectorAll('.terminal pre code');
    
    terminalElements.forEach(element => {
        // 타이핑 효과
        typewriterEffect(element);
    });
}

// 타이핑 효과 함수
function typewriterEffect(element) {
    const text = element.textContent;
    element.textContent = '';
    
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
        }
    }, 50);
}

// 코드 샘플 하이라이트
function highlightCodeSamples() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(block => {
        // 코드 블록에 라인 번호 추가
        addLineNumbers(block);
        
        // 특정 라인 하이라이트
        highlightImportantLines(block);
    });
}

// 라인 번호 추가
function addLineNumbers(codeBlock) {
    const lines = codeBlock.textContent.split('\n');
    const lineNumbersWrapper = document.createElement('div');
    lineNumbersWrapper.className = 'line-numbers';
    
    lines.forEach((line, index) => {
        const lineNumber = document.createElement('span');
        lineNumber.className = 'line-number';
        lineNumber.textContent = index + 1;
        lineNumbersWrapper.appendChild(lineNumber);
    });
    
    codeBlock.parentNode.insertBefore(lineNumbersWrapper, codeBlock);
}

// 중요한 라인 하이라이트
function highlightImportantLines(codeBlock) {
    const lines = codeBlock.innerHTML.split('\n');
    const highlightedLines = lines.map((line, index) => {
        // MCP 관련 키워드 하이라이트
        if (line.includes('sampling') || line.includes('resources') || line.includes('mcp')) {
            return `<span class="highlight-line">${line}</span>`;
        }
        return line;
    });
    
    codeBlock.innerHTML = highlightedLines.join('\n');
}

// 진행률 업데이트
function updateProgress() {
    const slides = Reveal.getTotalSlides();
    const currentSlide = Reveal.getIndices().h;
    const progress = (currentSlide / (slides - 1)) * 100;
    
    // 커스텀 진행률 표시
    const progressElement = document.querySelector('.custom-progress');
    if (progressElement) {
        progressElement.style.width = `${progress}%`;
    }
}

// 터치 제스처 지원
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', function(e) {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // 최소 거리 체크
    if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 좌우 스와이프
            if (diffX > 0) {
                Reveal.next(); // 오른쪽 스와이프 - 다음 슬라이드
            } else {
                Reveal.prev(); // 왼쪽 스와이프 - 이전 슬라이드
            }
        } else {
            // 상하 스와이프
            if (diffY > 0) {
                Reveal.down(); // 아래 스와이프 - 하위 슬라이드
            } else {
                Reveal.up(); // 위 스와이프 - 상위 슬라이드
            }
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
});

// 키보드 단축키 도움말
function showKeyboardHelp() {
    const helpModal = document.createElement('div');
    helpModal.className = 'keyboard-help-modal';
    helpModal.innerHTML = `
        <div class="help-content">
            <h3>키보드 단축키</h3>
            <ul>
                <li><kbd>Space</kbd> / <kbd>Enter</kbd> - 다음 슬라이드</li>
                <li><kbd>←</kbd> / <kbd>→</kbd> - 이전/다음 슬라이드</li>
                <li><kbd>↑</kbd> / <kbd>↓</kbd> - 상위/하위 슬라이드</li>
                <li><kbd>F</kbd> - 전체화면</li>
                <li><kbd>S</kbd> - 스피커 노트</li>
                <li><kbd>O</kbd> - 개요 모드</li>
                <li><kbd>B</kbd> - 일시정지</li>
                <li><kbd>?</kbd> - 도움말</li>
            </ul>
            <button onclick="closeKeyboardHelp()">닫기</button>
        </div>
    `;
    
    document.body.appendChild(helpModal);
}

function closeKeyboardHelp() {
    const helpModal = document.querySelector('.keyboard-help-modal');
    if (helpModal) {
        helpModal.remove();
    }
}

// 에러 처리
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    
    // 프로덕션에서는 에러 로깅 서비스에 전송
    if (window.location.hostname !== 'localhost') {
        // 에러 로깅 로직
        logError(e.error);
    }
});

function logError(error) {
    // 실제 에러 로깅 서비스 연동
    console.log('Error logged:', error);
}

// 성능 모니터링
function trackPerformance() {
    // 페이지 로딩 시간 측정
    window.addEventListener('load', function() {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log('Page load time:', loadTime, 'ms');
    });
    
    // 슬라이드 변경 시간 측정
    let slideChangeStart = 0;
    
    Reveal.addEventListener('slidechanged', function() {
        if (slideChangeStart) {
            const changeTime = performance.now() - slideChangeStart;
            console.log('Slide change time:', changeTime, 'ms');
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
            slideChangeStart = performance.now();
        }
    });
}

// 초기화
trackPerformance();

// 인쇄 지원
function printPresentation() {
    window.print();
}

// PDF 내보내기 지원
function exportToPDF() {
    // PDF 내보내기 로직
    const printCSS = document.createElement('link');
    printCSS.rel = 'stylesheet';
    printCSS.href = 'assets/css/print.css';
    document.head.appendChild(printCSS);
    
    setTimeout(() => {
        window.print();
        document.head.removeChild(printCSS);
    }, 100);
}

// 소셜 미디어 공유
function sharePresentation() {
    if (navigator.share) {
        navigator.share({
            title: 'MCP 에러 모니터링 시스템',
            text: 'AI가 자동으로 에러 해결책을 제안하는 시스템을 소개합니다.',
            url: window.location.href
        });
    } else {
        // 폴백: 클립보드에 복사
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('프레젠테이션 URL이 클립보드에 복사되었습니다.');
        });
    }
}

// 접근성 지원
function initializeAccessibility() {
    // 키보드 네비게이션 향상
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            // 탭 키 처리
            e.preventDefault();
            Reveal.next();
        }
    });
    
    // 스크린 리더 지원
    const slides = document.querySelectorAll('.slides section');
    slides.forEach((slide, index) => {
        slide.setAttribute('aria-label', `슬라이드 ${index + 1}`);
    });
}

// 다국어 지원
function setLanguage(lang) {
    document.documentElement.lang = lang;
    
    // 언어별 설정 적용
    if (lang === 'en') {
        // 영어 설정
        document.title = 'MCP Error Monitoring System';
    } else {
        // 한국어 설정 (기본값)
        document.title = 'MCP 에러 모니터링 시스템';
    }
}

// 모든 기능 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeAccessibility();
    setLanguage('ko');
});

// 프레젠테이션 향상 기능 초기화
function initializeEnhancedFeatures() {
    // 슬라이드 애니메이션 향상
    enhanceSlideAnimations();
    
    // 인터랙티브 요소 추가
    addInteractiveElements();
    
    // 키보드 네비게이션 향상
    enhanceKeyboardNavigation();
    
    // 모바일 최적화
    optimizeForMobile();
    
    // 성능 모니터링
    initializePerformanceMonitoring();
}

// 슬라이드 애니메이션 향상
function enhanceSlideAnimations() {
    // 슬라이드 진입 시 애니메이션
    Reveal.addEventListener('slidechanged', function(event) {
        const currentSlide = event.currentSlide;
        
        // 슬라이드 내 요소들에 순차적 애니메이션 적용
        const elements = currentSlide.querySelectorAll('h1, h2, h3, p, .feature-card, .mcp-features > *');
        
        elements.forEach((element, index) => {
            element.style.animation = `slideInUp 0.6s ease-out ${index * 0.1}s both`;
        });
    });
    
    // CSS 애니메이션 키프레임 동적 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
}

// 인터랙티브 요소 추가
function addInteractiveElements() {
    // 호버 효과 강화
    const cards = document.querySelectorAll('.feature-card, .metric-card, .benefit-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.animation = 'pulse 0.6s ease-in-out';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.animation = '';
        });
    });
    
    // 클릭 효과 추가
    const buttons = document.querySelectorAll('.btn, button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// 키보드 네비게이션 향상
function enhanceKeyboardNavigation() {
    // 추가 키보드 단축키
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + 화살표로 빠른 이동
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
            e.preventDefault();
            Reveal.slide(Reveal.getTotalSlides() - 1); // 마지막 슬라이드로
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
            e.preventDefault();
            Reveal.slide(0); // 첫 번째 슬라이드로
        }
        
        // 숫자 키로 직접 이동
        if (e.key >= '1' && e.key <= '9') {
            const slideIndex = parseInt(e.key) - 1;
            if (slideIndex < Reveal.getTotalSlides()) {
                Reveal.slide(slideIndex);
            }
        }
    });
}

// 모바일 최적화
function optimizeForMobile() {
    // 모바일 환경 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 모바일에서 불필요한 애니메이션 제거
        document.body.classList.add('mobile-optimized');
        
        // 터치 감도 조정
        let touchThreshold = 50;
        
        // 디바이스 크기에 따라 조정
        if (window.innerWidth < 480) {
            touchThreshold = 30;
        }
        
        // 터치 이벤트 최적화
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            if (Math.abs(touchStartX - e.touches[0].clientX) > touchThreshold) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

// 성능 모니터링 초기화
function initializePerformanceMonitoring() {
    // 메모리 사용량 모니터링
    if (performance.memory) {
        setInterval(() => {
            const memoryInfo = performance.memory;
            if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.9) {
                console.warn('Memory usage is high, consider optimizing');
            }
        }, 30000); // 30초마다 체크
    }
    
    // 렌더링 성능 모니터링
    let frameCount = 0;
    let lastTime = performance.now();
    
    function measureFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = frameCount;
            frameCount = 0;
            lastTime = currentTime;
            
            if (fps < 30) {
                console.warn('Low FPS detected:', fps);
            }
        }
        
        requestAnimationFrame(measureFPS);
    }
    
    requestAnimationFrame(measureFPS);
}

// 슬라이드 미리보기 기능
function showSlidePreview() {
    const preview = document.createElement('div');
    preview.className = 'slide-preview';
    preview.innerHTML = `
        <div class="preview-content">
            <h3>슬라이드 미리보기</h3>
            <div class="preview-slides">
                <!-- 슬라이드 썸네일들 -->
            </div>
            <button onclick="closeSlidePreview()">닫기</button>
        </div>
    `;
    
    document.body.appendChild(preview);
    
    // 썸네일 생성
    generateSlideThumbnails();
}

function closeSlidePreview() {
    const preview = document.querySelector('.slide-preview');
    if (preview) {
        preview.remove();
    }
}

function generateSlideThumbnails() {
    const slides = document.querySelectorAll('.slides section');
    const container = document.querySelector('.preview-slides');
    
    slides.forEach((slide, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'slide-thumbnail';
        thumbnail.innerHTML = `
            <div class="thumbnail-content">
                <h4>${slide.querySelector('h1, h2')?.textContent || `슬라이드 ${index + 1}`}</h4>
            </div>
        `;
        
        thumbnail.addEventListener('click', () => {
            Reveal.slide(index);
            closeSlidePreview();
        });
        
        container.appendChild(thumbnail);
    });
}

// 사용자 인터랙션 분석
function trackUserInteraction() {
    let interactionData = {
        slideViews: {},
        timeSpent: {},
        navigationPattern: []
    };
    
    let slideStartTime = Date.now();
    
    Reveal.addEventListener('slidechanged', function(event) {
        const currentSlide = event.indexh;
        const timeSpent = Date.now() - slideStartTime;
        
        // 슬라이드 조회수 기록
        interactionData.slideViews[currentSlide] = (interactionData.slideViews[currentSlide] || 0) + 1;
        
        // 슬라이드 머무른 시간 기록
        if (event.previousSlide) {
            const prevSlide = Reveal.getIndices(event.previousSlide).h;
            interactionData.timeSpent[prevSlide] = (interactionData.timeSpent[prevSlide] || 0) + timeSpent;
        }
        
        // 네비게이션 패턴 기록
        interactionData.navigationPattern.push({
            slide: currentSlide,
            timestamp: Date.now(),
            timeSpent: timeSpent
        });
        
        slideStartTime = Date.now();
    });
    
    // 세션 종료 시 데이터 저장
    window.addEventListener('beforeunload', function() {
        localStorage.setItem('presentationAnalytics', JSON.stringify(interactionData));
    });
}

// 접근성 향상
function enhanceAccessibility() {
    // 고대비 모드 감지
    if (window.matchMedia('(prefers-contrast: high)').matches) {
        document.body.classList.add('high-contrast');
    }
    
    // 애니메이션 감소 설정 감지
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('reduced-motion');
        
        // 모든 애니메이션 비활성화
        const style = document.createElement('style');
        style.textContent = `
            .reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 포커스 관리 향상
    let lastFocusedElement = null;
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            lastFocusedElement = document.activeElement;
        }
    });
    
    // 스크린 리더 지원 강화
    Reveal.addEventListener('slidechanged', function(event) {
        const currentSlide = event.currentSlide;
        const slideTitle = currentSlide.querySelector('h1, h2, h3')?.textContent || '슬라이드';
        
        // 스크린 리더에게 현재 슬라이드 정보 전달
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.textContent = `${slideTitle}. 슬라이드 ${event.indexh + 1} / ${Reveal.getTotalSlides()}`;
        announcement.style.position = 'absolute';
        announcement.style.left = '-9999px';
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    });
}

// 오프라인 지원
function initializeOfflineSupport() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    }
    
    // 온라인/오프라인 상태 감지
    window.addEventListener('online', function() {
        showNotification('인터넷 연결이 복원되었습니다.', 'success');
    });
    
    window.addEventListener('offline', function() {
        showNotification('오프라인 모드입니다. 기본 기능은 계속 사용할 수 있습니다.', 'warning');
    });
}

// 알림 시스템
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 애니메이션으로 표시
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 모든 기능 초기화
document.addEventListener('DOMContentLoaded', function() {
    trackUserInteraction();
    enhanceAccessibility();
    initializeOfflineSupport();
});

// 개발 모드 디버깅
if (window.location.hostname === 'localhost') {
    console.log('MCP Presentation - Development Mode');
    
    // 개발 도구
    window.revealDebug = {
        getCurrentSlide: () => Reveal.getIndices(),
        getTotalSlides: () => Reveal.getTotalSlides(),
        goToSlide: (h, v) => Reveal.slide(h, v),
        exportConfig: () => Reveal.getConfig(),
        reInitialize: () => Reveal.initialize(),
        showPreview: showSlidePreview,
        getAnalytics: () => JSON.parse(localStorage.getItem('presentationAnalytics') || '{}'),
        clearAnalytics: () => localStorage.removeItem('presentationAnalytics')
    };
    
    // 개발 모드 전용 기능
    console.log('Available debug commands:', Object.keys(window.revealDebug));
}