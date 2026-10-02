import { useState } from 'react';
import {
  Check,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Code2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

/**
 * Strip all emojis to keep the presentation strictly clean & professional
 */
function stripEmojis(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips and formats LaTeX math notation (e.g. $\mathcal{O}(1)$, $O(N \log N)$) into clean text
 */
function cleanLatexMath(mathStr) {
  if (!mathStr) return '';
  let s = mathStr.trim();
  if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim();
  else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();

  // Replace common LaTeX symbols & macros
  s = s.replace(/\\mathcal\{([A-Za-z])\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbb\{([A-Za-z])\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\log/g, 'log');
  s = s.replace(/\\ln/g, 'ln');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\le(q)?/g, '≤');
  s = s.replace(/\\ge(q)?/g, '≥');
  s = s.replace(/\\ne(q)?/g, '≠');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\^2/g, '²');
  s = s.replace(/\^3/g, '³');
  s = s.replace(/\{([^{}]+)\}/g, '$1'); // unwrap remaining single braces
  return s.trim();
}

/**
 * Format inline markdown tokens: **bold**, `code`, $math$, *italic*
 */
function renderInline(text) {
  if (!text) return '';
  const cleaned = stripEmojis(text);
  // Split on bold, inline code, latex math ($...$ or $$...$$), and italics
  const tokens = cleaned.split(/(\*\*.*?\*\*|`.*?`|\$\$.*?\$\$|\$[^$\n]+?\$|\*.*?\*)/g);

  return tokens.map((part, i) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      if (inner.includes('$')) {
        return (
          <strong key={i} className="font-bold text-[#1C1814]">
            {cleanLatexMath(inner.replace(/\$/g, ''))}
          </strong>
        );
      }
      return (
        <strong key={i} className="font-bold text-[#1C1814]">
          {inner}
        </strong>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#FAF4EE] text-[#C05A35] font-mono text-[11px] font-bold border border-[#EDE4DC]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // LaTeX Math: $...$ or $$...$$
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const math = cleanLatexMath(part);
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-bold bg-[#FAF4EE] text-[#C05A35] border border-[#E8DED6] shadow-2xs"
        >
          {math}
        </span>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={i} className="text-[#6E6359] italic font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Handle any stray unescaped math expressions like $\mathcal{O}(1)$ inside raw strings
    if (part.includes('$')) {
      const subparts = part.split(/(\$[^$\n]+?\$)/g);
      return subparts.map((sub, j) => {
        if (sub.startsWith('$') && sub.endsWith('$')) {
          return (
            <span
              key={`${i}-${j}`}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] font-bold bg-[#FAF4EE] text-[#C05A35] border border-[#E8DED6] shadow-2xs"
            >
              {cleanLatexMath(sub)}
            </span>
          );
        }
        return sub.replace(/\*/g, '');
      });
    }

    return part ? part.replace(/\*/g, '') : '';
  });
}

/**
 * Clean, Professional Code Block Component with Copy and Apply buttons
 */
function CodeBlock({ code, language = 'text', onApplyCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 rounded-2xl overflow-hidden border border-[#2D2721] bg-[#161311] shadow-sm ring-1 ring-white/5">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#201C18] border-b border-[#2D2721] text-xs">
        <div className="flex items-center gap-2 text-[#A89C91] font-mono text-xs font-semibold">
          <Code2 className="w-3.5 h-3.5 text-[#C05A35]" />
          <span className="capitalize">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-2">
          {onApplyCode && (
            <button
              onClick={() => onApplyCode(code)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C05A35] hover:bg-[#A94A28] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Replace current editor content with this fixed code"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Apply Fix</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D2721] hover:bg-[#3D352E] text-[#EDE4DC] text-xs font-medium transition-all cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#A89C91]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div
        className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed selection:bg-[#C05A35]/30 text-[#EDE6E0]"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, monospace",
          scrollbarWidth: 'thin',
          scrollbarColor: '#4A4036 transparent',
        }}
      >
        <pre className="!m-0 !p-0 bg-transparent text-[#EDE6E0]">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Beautiful, Highly-Readable AI Report & Markdown Renderer
 */
export default function AIReportViewer({ content, onApplyCode }) {
  if (!content) return null;

  // Split lines and parse blocks
  const rawLines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = 'text';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const snippet = codeBuffer.join('\n');
        elements.push({
          type: 'code',
          code: snippet,
          language: codeLang,
        });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim() || 'text';
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      elements.push({ type: 'spacer' });
      continue;
    }

    // Completely omit Action and Language metadata rows
    if (/^[-*]?\s*(\*\*)?(action|language|target language):/i.test(trimmed)) {
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push({ type: 'divider' });
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      const headingText = stripEmojis(trimmed.slice(4));
      if (headingText) {
        elements.push({ type: 'h3', text: headingText });
      }
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      const headingText = stripEmojis(trimmed.slice(5));
      if (headingText) {
        elements.push({ type: 'h4', text: headingText });
      }
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const headingText = stripEmojis(trimmed.slice(3));
      if (headingText) {
        elements.push({ type: 'h2', text: headingText });
      }
      continue;
    }
    if (trimmed.startsWith('# ')) {
      const headingText = stripEmojis(trimmed.slice(2));
      if (headingText) {
        elements.push({ type: 'h1', text: headingText });
      }
      continue;
    }

    // Callout / Pro-Tip Box
    if (trimmed.startsWith('Tip:') || trimmed.startsWith('*Tip:') || trimmed.startsWith('💡') || trimmed.startsWith('⚡') || trimmed.startsWith('> ')) {
      elements.push({
        type: 'callout',
        text: stripEmojis(trimmed.replace(/^(\*Tip:|\bTip:|💡|⚡|>)\s*/i, '')),
      });
      continue;
    }

    // Error bullet / warning
    if (trimmed.startsWith('- ❌') || trimmed.startsWith('* ❌') || trimmed.startsWith('- **Line') || trimmed.startsWith('* **Line')) {
      elements.push({
        type: 'error_item',
        text: stripEmojis(trimmed.replace(/^[-*]\s*(❌)?\s*/, '')),
      });
      continue;
    }

    // Standard Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push({
        type: 'bullet',
        text: stripEmojis(trimmed.slice(2)),
      });
      continue;
    }

    // Numbered item: 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push({
        type: 'numbered',
        number: numMatch[1],
        text: stripEmojis(numMatch[2]),
      });
      continue;
    }

    // Status line or badge
    if (trimmed.startsWith('**Status:**') || trimmed.startsWith('Status:')) {
      elements.push({
        type: 'status',
        text: stripEmojis(trimmed),
      });
      continue;
    }

    // Normal paragraph
    const cleanedPara = stripEmojis(line);
    if (cleanedPara) {
      elements.push({
        type: 'paragraph',
        text: cleanedPara,
      });
    }
  }

  // Close any unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push({
      type: 'code',
      code: codeBuffer.join('\n'),
      language: codeLang,
    });
  }

  return (
    <div className="font-sans text-[13px] leading-relaxed text-[#2C2520] space-y-2.5 select-text">
      {elements.map((el, idx) => {
        switch (el.type) {
          case 'spacer':
            return <div key={idx} className="h-1" />;

          case 'divider':
            return <hr key={idx} className="border-t border-[#EAE3DC] my-3" />;

          case 'h1':
          case 'h2':
            return (
              <div key={idx} className="pt-2 pb-1 border-b border-[#EAE3DC]">
                <h3 className="font-bold text-base text-[#1E1B16] tracking-tight">
                  {renderInline(el.text)}
                </h3>
              </div>
            );

          case 'h3': {
            const isErrorHeader = el.text.includes('Detected') || el.text.includes('Error');
            return (
              <div
                key={idx}
                className={`pt-2.5 pb-1 flex items-center gap-2 font-bold text-sm ${
                  isErrorHeader ? 'text-rose-700' : 'text-[#1E1B16]'
                }`}
              >
                {isErrorHeader ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <div className="w-1.5 h-3.5 rounded-full bg-[#C05A35] shrink-0" />
                )}
                <span>{renderInline(el.text)}</span>
              </div>
            );
          }

          case 'h4':
            return (
              <h5 key={idx} className="font-bold text-xs text-[#453D35] pt-1">
                {renderInline(el.text)}
              </h5>
            );

          case 'status': {
            const isCritical = el.text.toUpperCase().includes('ERROR') || el.text.toUpperCase().includes('CRITICAL');
            return (
              <div
                key={idx}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                  isCritical
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{renderInline(el.text)}</span>
              </div>
            );
          }

          case 'error_item':
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-950 flex items-start gap-2.5 text-xs shadow-2xs"
              >
                <div className="p-1 rounded-md bg-rose-100/90 text-rose-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 leading-relaxed">
                  {renderInline(el.text)}
                </div>
              </div>
            );

          case 'bullet':
            return (
              <div key={idx} className="flex items-start gap-2 text-xs pl-1">
                <span className="text-[#C05A35] font-bold text-sm leading-4">•</span>
                <div className="flex-1 text-[#332C26]">{renderInline(el.text)}</div>
              </div>
            );

          case 'numbered':
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs pl-1">
                <span className="w-4 h-4 rounded-full bg-[#EBE4DC] text-[#4A423B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {el.number}
                </span>
                <div className="flex-1 text-[#332C26]">{renderInline(el.text)}</div>
              </div>
            );

          case 'callout':
            return (
              <div
                key={idx}
                className="p-3 my-2 rounded-xl bg-[#FDF7F2] border border-[#F3DEC9] text-[#7A3F1F] flex items-start gap-2.5 text-xs"
              >
                <div className="w-1.5 h-full min-h-[16px] rounded-full bg-[#C05A35] shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">
                  {renderInline(el.text)}
                </div>
              </div>
            );

          case 'code':
            return (
              <CodeBlock
                key={idx}
                code={el.code}
                language={el.language}
                onApplyCode={onApplyCode}
              />
            );

          case 'paragraph':
          default:
            return (
              <p key={idx} className="text-xs text-[#332C26]">
                {renderInline(el.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
