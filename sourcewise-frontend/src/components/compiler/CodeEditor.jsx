import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Download, RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

export default function CodeEditor({
  code,
  onChange,
  language,
  languageConfig,
  onReset,
  className = '',
}) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const editorContainerRef = useRef(null);

  // Synchronize line numbers scroll with textarea scroll
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Calculate lines array
  const lines = code.split('\n');
  const lineCount = lines.length;

  // Track cursor position (Line, Column)
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const linesBefore = text.slice(0, selStart).split('\n');
    setCursorPos({
      line: linesBefore.length,
      col: linesBefore[linesBefore.length - 1].length + 1,
    });
  }, []);

  // Handle special keystrokes: Tab, Shift+Tab, Enter (smart indent), Auto-closing brackets
  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 1. Tab & Shift+Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabSpaces = '  ';

      if (!e.shiftKey) {
        if (start === end) {
          const nextVal = value.substring(0, start) + tabSpaces + value.substring(end);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;
            updateCursorPosition();
          });
        } else {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = value.indexOf('\n', end);
          const endPos = lineEnd === -1 ? value.length : lineEnd;
          const target = value.substring(lineStart, endPos);
          const indented = target.split('\n').map((l) => tabSpaces + l).join('\n');
          const nextVal = value.substring(0, lineStart) + indented + value.substring(endPos);
          onChange(nextVal);
        }
      } else {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', end);
        const endPos = lineEnd === -1 ? value.length : lineEnd;
        const target = value.substring(lineStart, endPos);
        const unindented = target.split('\n').map((l) => (l.startsWith('  ') ? l.slice(2) : l.startsWith(' ') ? l.slice(1) : l)).join('\n');
        const nextVal = value.substring(0, lineStart) + unindented + value.substring(endPos);
        onChange(nextVal);
      }
      return;
    }

    // 2. Smart Indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentLine = value.slice(0, start).split('\n').pop() || '';
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';

      const trimmed = currentLine.trim();
      const needsExtraIndent = trimmed.endsWith('{') || trimmed.endsWith(':') || trimmed.endsWith('(') || trimmed.endsWith('[');
      if (needsExtraIndent) {
        indent += '  ';
      }

      const nextVal = value.substring(0, start) + '\n' + indent + value.substring(end);
      onChange(nextVal);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        updateCursorPosition();
      });
      return;
    }

    // 3. Auto-close pairs: (), [], {}, "", '', ``
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const closing = pairs[e.key];
      const selected = value.substring(start, end);
      const nextVal = value.substring(0, start) + e.key + selected + closing + value.substring(end);
      onChange(nextVal);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = end + 1;
        updateCursorPosition();
      });
      return;
    }

    // 4. Backspace on pair
    if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = value[start - 1];
      const nextChar = value[start];
      if (pairs[prevChar] && pairs[prevChar] === nextChar) {
        e.preventDefault();
        const nextVal = value.substring(0, start - 1) + value.substring(start + 1);
        onChange(nextVal);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1;
          updateCursorPosition();
        });
      }
    }
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  // Download file
  const handleDownload = () => {
    const ext = languageConfig?.extension || '.txt';
    const filename = `deepcode_solution${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle fullscreen
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullScreen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  // Lock body scroll during fullscreen
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  // Core editor markup (rendered inline or portaled to body in fullscreen)
  const editorMarkup = (
    <div
      ref={editorContainerRef}
      className={`flex flex-col bg-white border border-[#EDE7E1] rounded-3xl overflow-hidden shadow-xs ring-1 ring-black/5 ${
        isFullScreen ? 'w-full h-full shadow-2xl ring-black/10' : className
      }`}
    >
      {/* Top Editor Sub-header Toolbar (Light Theme) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF7F4] border-b border-[#EBE4DC] text-xs select-none">
        {/* File tab pill */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-[#E2DAD1] rounded-xl text-[#2C2520] font-mono font-semibold shadow-2xs">
            <span>{languageConfig?.icon || '📄'}</span>
            <span className="text-[#3D352E]">main{languageConfig?.extension || '.txt'}</span>
          </div>
          <span className="text-[11px] text-[#8C827A] font-mono hidden sm:inline">
            UTF-8
          </span>
          {isFullScreen && (
            <span className="px-2.5 py-0.5 bg-[#FDEEE6] text-[#C05A35] font-bold text-[10px] rounded-full border border-[#FCD8CB]">
              Full Focus Mode
            </span>
          )}
        </div>

        {/* Editor controls: Font size, Copy, Download, Reset, Fullscreen */}
        <div className="flex items-center space-x-1 text-[#6B6158]">
          <button
            onClick={() => setFontSize((s) => Math.max(12, s - 1))}
            className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors"
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1 font-semibold text-[#5C534B]">{fontSize}px</span>
          <button
            onClick={() => setFontSize((s) => Math.min(22, s + 1))}
            className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors"
            title="Increase font size"
            aria-label="Increase font size"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-[#E2DAD1] mx-1" />

          <button
            onClick={handleCopy}
            className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors flex items-center gap-1"
            title="Copy code"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors"
            title="Download file"
            aria-label="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onReset && (
            <button
              onClick={onReset}
              className="p-1.5 hover:text-[#C05A35] hover:bg-[#FDEEE6] rounded-lg transition-colors"
              title="Reset code to starter template"
              aria-label="Reset code to starter template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {isFullScreen ? (
            <button
              onClick={toggleFullScreen}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FDEEE6] hover:bg-[#FCD8CB] text-[#C05A35] rounded-xl text-xs font-bold border border-[#FCD8CB] transition-colors ml-1 shadow-2xs"
              title="Exit full screen (Esc)"
              aria-label="Exit full screen"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] bg-white/80 rounded text-[#C05A35] font-mono font-bold">
                Esc
              </kbd>
            </button>
          ) : (
            <button
              onClick={toggleFullScreen}
              className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors"
              title="Full screen"
              aria-label="Full screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Editing Area: Light Gutter Line Numbers + Textarea */}
      <div className={`flex-1 flex relative overflow-hidden bg-[#FFFFFF] ${isFullScreen ? 'min-h-[500px]' : 'min-h-[380px]'}`}>
        {/* Line Numbers Gutter (Warm Light Neutral) */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-12 py-3 bg-[#FAF8F5] border-r border-[#EFEAE4] text-right pr-3 select-none text-[#9E948B] font-mono overflow-hidden shrink-0"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}
        >
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const isCurrent = lineNum === cursorPos.line;
            return (
              <div
                key={lineNum}
                className={`transition-colors ${
                  isCurrent ? 'text-[#C05A35] font-bold bg-[#FDEEE6] -mr-3 pr-3 rounded-l' : 'hover:text-[#6B6158]'
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Input Textarea (Clean Light Typography) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            onChange(e.target.value);
            updateCursorPosition();
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          onScroll={handleScroll}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 w-full h-full p-3 bg-transparent text-[#1E1B16] font-mono outline-none resize-none overflow-auto leading-relaxed selection:bg-[#FDEEE6] selection:text-[#C05A35] whitespace-pre"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${fontSize * 1.5}px`,
            tabSize: 2,
          }}
        />
      </div>

      {/* Editor Status Footer Bar (Warm Light) */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#FAF7F4] border-t border-[#EBE4DC] text-[11px] text-[#7C726A] font-mono select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 font-medium text-[#4A423B]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </span>
          <span className="text-[#D6CEC5]">|</span>
          <span>{lineCount} lines</span>
          <span className="text-[#D6CEC5]">|</span>
          <span>{code.length} chars</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[#C05A35] font-bold">{languageConfig?.name || language}</span>
          <span className="text-[#8C827A]">{languageConfig?.version}</span>
        </div>
      </div>
    </div>
  );

  // If fullscreen, portal to document.body so it sits completely above sidebar and all layout elements
  if (isFullScreen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#1E1B16]/50 backdrop-blur-md p-3 sm:p-6 flex flex-col justify-center items-center">
        <div className="w-full h-full max-w-[1700px] flex flex-col">
          {editorMarkup}
        </div>
      </div>,
      document.body
    );
  }

  return editorMarkup;
}
