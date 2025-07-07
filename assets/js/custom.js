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

// Mermaid 다이어그램 초기화
document.addEventListener('DOMContentLoaded', function() {
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        themeVariables: {
            primaryColor: '#2563eb',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#3b82f6',
            lineColor: '#64748b',
            secondaryColor: '#f1f5f9',
            tertiaryColor: '#f8fafc',
            background: '#ffffff',
            fontFamily: 'Noto Sans KR, Apple SD Gothic Neo, sans-serif',
            fontSize: '14px'
        },
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'cardinal'
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
        }
    });
    
    // Mermaid 다이어그램 렌더링
    renderMermaidDiagrams();
});

// Mermaid 다이어그램 렌더링 함수
function renderMermaidDiagrams() {
    const mermaidElements = document.querySelectorAll('.mermaid-diagram');
    
    mermaidElements.forEach((element, index) => {
        const graphDefinition = element.textContent.trim();
        const id = `mermaid-${index}`;
        
        try {
            mermaid.render(id, graphDefinition, function(svgCode) {
                element.innerHTML = svgCode;
            });
        } catch (error) {
            console.error('Mermaid rendering error:', error);
            element.innerHTML = '<p>다이어그램 렌더링 오류</p>';
        }
    });
}

// 슬라이드 변경 이벤트 리스너
Reveal.addEventListener('slidechanged', function(event) {
    // 현재 슬라이드 인덱스
    const currentSlide = event.indexh;
    
    // 특정 슬라이드에서 추가 처리
    switch(currentSlide) {
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

// 개발 모드 디버깅
if (window.location.hostname === 'localhost') {
    console.log('MCP Presentation - Development Mode');
    
    // 개발 도구
    window.revealDebug = {
        getCurrentSlide: () => Reveal.getIndices(),
        getTotalSlides: () => Reveal.getTotalSlides(),
        goToSlide: (h, v) => Reveal.slide(h, v),
        exportConfig: () => Reveal.getConfig(),
        reInitialize: () => Reveal.initialize()
    };
}