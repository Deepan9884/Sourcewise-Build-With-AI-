import React, { useState, useCallback } from 'react'
import { Copy, Check, FileText, Terminal, ExternalLink } from 'lucide-react'

/**
 * Strips robotic disclaimer prefixes and conversational boilerplate
 */
function sanitizeRawText(rawText) {
  if (!rawText || typeof rawText !== 'string') return ''
  let cleaned = rawText
    // Remove robotic disclaimers like *(Note: ...)* or (Note: ...)
    .replace(/\*?\s*\(\s*Note:[^)]*?\)\s*\*?/gi, '')
    // Remove standalone bracketed note lines like [Note: ...]
    .replace(/^\s*\[Note:[^\]]*?\]\s*$/gmi, '')
    // Remove empty leading whitespace
    .trim()
  return cleaned
}

/**
 * Code Block with syntax styling and one-click copy
 */
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [code])

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[#EDE7E1] bg-[#1E1B16] text-[#F3EFEB] shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#2A2620] border-b border-[#3D3730] text-xs font-mono">
        <span className="flex items-center gap-1.5 text-[#B0A8A0] font-medium lowercase">
          <Terminal className="w-3.5 h-3.5 text-[#E8845F]" />
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#D0C8C0] hover:text-white px-2 py-0.5 rounded hover:bg-[#3D3730] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#2D9D78]" />
              <span className="text-[#2D9D78] font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed selection:bg-[#E8845F]/30">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  )
}

/**
 * Parses inline string into rich React elements:
 * - Eliminates all naked asterisks (`*`)
 * - Bolds `**text**` into styled <strong>
 * - Italics `*text*` or `_text_` into styled <em>
 * - Bold-italics `***text***` into <strong><em>
 * - Inline code `code` into <code>
 * - Citation tags like `[Doc.pdf, p. 1]` into elegant pills
 */
function renderInlineTokens(str, isUser) {
  if (!str) return null

  // Tokenize code, citations [Name, p. 1], bold-italic, bold, italic
  const tokenRegex = /(`[^`\n]+`|\[[^\]\n]+?(?:p\.?\s*\d+|Page\s*\d+|\d+)[^\]\n]*?\]|\[\d+\]|\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|\*[^*]+?\*|_[^_]+?_)/g
  const parts = str.split(tokenRegex)

  return parts.filter(Boolean).map((part, idx) => {
    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className={`px-1.5 py-0.5 rounded-md font-mono text-xs font-medium ${
            isUser
              ? 'bg-white/20 text-white'
              : 'bg-[#F3EFEB] text-[#C05A35] border border-[#EDE7E1]'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Bold-italic ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={idx} className={`font-semibold italic ${isUser ? 'text-white' : 'text-[#1E1B16]'}`}>
          {part.slice(3, -3)}
        </strong>
      )
    }

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className={`font-semibold ${isUser ? 'text-white' : 'text-[#1E1B16]'}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }

    // Italic *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      return (
        <em key={idx} className={`italic ${isUser ? 'text-white/90' : 'text-[#3D3732]'}`}>
          {part.slice(1, -1)}
        </em>
      )
    }

    // Citation badge [Source Name, p. 1]
    if (part.startsWith('[') && part.endsWith(']')) {
      const citeContent = part.slice(1, -1)
      if (isUser) {
        return <span key={idx} className="font-semibold text-white/95">[{citeContent}]</span>
      }
      return (
        <span
          key={idx}
          title={`Grounded in: ${citeContent}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded-md text-[11px] font-medium bg-[#FFF8F5] text-[#C05A35] border border-[#F3DFD5] shadow-2xs select-none align-baseline hover:bg-[#FDEEE6] transition-colors"
        >
          <FileText className="w-2.5 h-2.5 text-[#E8845F] shrink-0" />
          <span>{citeContent}</span>
        </span>
      )
    }

    // Plain text: STRICTLY strip all remaining stray asterisks so no naked * ever shows up
    const cleanText = part.replace(/\*/g, '')
    if (!cleanText) return null

    return <React.Fragment key={idx}>{cleanText}</React.Fragment>
  })
}

/**
 * Parses markdown text into line-level block elements
 */
function parseBlocks(rawText) {
  const sanitized = sanitizeRawText(rawText)
  if (!sanitized) return []

  // 1. Separate code blocks
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
  const blockChunks = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      blockChunks.push({ type: 'text', content: sanitized.slice(lastIndex, match.index) })
    }
    blockChunks.push({
      type: 'code',
      lang: match[1] || 'text',
      code: match[2].trimEnd(),
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < sanitized.length) {
    blockChunks.push({ type: 'text', content: sanitized.slice(lastIndex) })
  }

  // 2. Parse text chunks into structured lines
  const parsedElements = []

  blockChunks.forEach((chunk, chunkIdx) => {
    if (chunk.type === 'code') {
      parsedElements.push({ key: `code-${chunkIdx}`, type: 'code', lang: chunk.lang, code: chunk.code })
      return
    }

    const lines = chunk.content.split('\n')
    let i = 0

    while (i < lines.length) {
      const rawLine = lines[i]
      const trimmed = rawLine.trim()

      if (!trimmed) {
        parsedElements.push({ key: `sp-${chunkIdx}-${i}`, type: 'spacer' })
        i++
        continue
      }

      // Markdown Table detection: lines start and end with |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = []
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim())
          i++
        }
        if (tableLines.length >= 2) {
          const parseRow = (row) => row.slice(1, -1).split('|').map((c) => c.trim())
          const header = parseRow(tableLines[0])
          const hasDivider = tableLines[1].includes('---')
          const rows = (hasDivider ? tableLines.slice(2) : tableLines.slice(1)).map(parseRow)
          parsedElements.push({ key: `tbl-${chunkIdx}-${i}`, type: 'table', header, rows })
          continue
        }
      }

      // Headings
      if (trimmed.startsWith('#### ')) {
        parsedElements.push({ key: `h4-${chunkIdx}-${i}`, type: 'h4', text: trimmed.slice(5) })
        i++
        continue
      }
      if (trimmed.startsWith('### ')) {
        parsedElements.push({ key: `h3-${chunkIdx}-${i}`, type: 'h3', text: trimmed.slice(4) })
        i++
        continue
      }
      if (trimmed.startsWith('## ')) {
        parsedElements.push({ key: `h2-${chunkIdx}-${i}`, type: 'h2', text: trimmed.slice(3) })
        i++
        continue
      }
      if (trimmed.startsWith('# ')) {
        parsedElements.push({ key: `h1-${chunkIdx}-${i}`, type: 'h1', text: trimmed.slice(2) })
        i++
        continue
      }

      // Horizontal Rule
      if (/^(?:---|___|\*\*\*)$/.test(trimmed)) {
        parsedElements.push({ key: `hr-${chunkIdx}-${i}`, type: 'hr' })
        i++
        continue
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        parsedElements.push({ key: `bq-${chunkIdx}-${i}`, type: 'blockquote', text: trimmed.slice(2) })
        i++
        continue
      }

      // Bullet list item (- , * , • , + )
      if (/^[-*•+]\s+/.test(trimmed)) {
        parsedElements.push({
          key: `ul-${chunkIdx}-${i}`,
          type: 'bullet',
          text: trimmed.replace(/^[-*•+]\s+/, ''),
        })
        i++
        continue
      }

      // Numbered list item
      if (/^\d+[\.\)]\s+/.test(trimmed)) {
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s+/)
        parsedElements.push({
          key: `ol-${chunkIdx}-${i}`,
          type: 'number',
          num: numMatch[1],
          text: trimmed.replace(/^\d+[\.\)]\s+/, ''),
        })
        i++
        continue
      }

      // Standard paragraph
      parsedElements.push({ key: `p-${chunkIdx}-${i}`, type: 'p', text: rawLine })
      i++
    }
  })

  return parsedElements
}

/**
 * Universal Rich Message Content Component
 * 
 * Beautifully formats markdown, headings, bullet lists, tables, and citations
 * while completely eliminating ugly raw asterisks (*) from the user's view.
 */
export function RichMessageContent({ content, isUser = false, className = '' }) {
  if (!content) return null

  // Fast path for non-string objects
  const rawText = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const blocks = parseBlocks(rawText)

  if (blocks.length === 0) return null

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'spacer':
            return <div key={block.key} className="h-1.5" />

          case 'code':
            return <CodeBlock key={block.key} code={block.code} lang={block.lang} />

          case 'h1':
            return (
              <h1
                key={block.key}
                className={`text-lg font-bold font-display pt-3 pb-1 border-b first:pt-0 ${
                  isUser ? 'text-white border-white/20' : 'text-[#1E1B16] border-[#EDE7E1]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </h1>
            )

          case 'h2':
            return (
              <h2
                key={block.key}
                className={`text-base font-bold font-display pt-2.5 pb-0.5 first:pt-0 ${
                  isUser ? 'text-white' : 'text-[#C05A35]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </h2>
            )

          case 'h3':
            return (
              <h3
                key={block.key}
                className={`text-sm font-bold pt-2 pb-0.5 first:pt-0 flex items-center gap-1.5 ${
                  isUser ? 'text-white' : 'text-[#1E1B16]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </h3>
            )

          case 'h4':
            return (
              <h4
                key={block.key}
                className={`text-xs font-bold uppercase tracking-wider pt-1.5 first:pt-0 ${
                  isUser ? 'text-white/80' : 'text-[#8A817B]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </h4>
            )

          case 'hr':
            return (
              <hr
                key={block.key}
                className={`my-3 ${isUser ? 'border-white/20' : 'border-[#EDE7E1]'}`}
              />
            )

          case 'blockquote':
            return (
              <blockquote
                key={block.key}
                className={`pl-3.5 border-l-2 py-1.5 px-3 rounded-r-xl text-xs italic my-2 ${
                  isUser
                    ? 'border-white/40 bg-white/10 text-white/90'
                    : 'border-[#E8845F] bg-[#FAF8F5] text-[#5B544E]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </blockquote>
            )

          case 'bullet':
            return (
              <div key={block.key} className="flex items-start gap-2.5 my-1 pl-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                    isUser ? 'bg-white' : 'bg-[#E8845F]'
                  }`}
                />
                <div
                  className={`flex-1 text-sm leading-relaxed ${
                    isUser ? 'text-white' : 'text-[#1E1B16]'
                  }`}
                >
                  {renderInlineTokens(block.text, isUser)}
                </div>
              </div>
            )

          case 'number':
            return (
              <div key={block.key} className="flex items-start gap-2 my-1 pl-1">
                <span
                  className={`font-semibold text-xs min-w-[20px] pt-0.5 ${
                    isUser ? 'text-white' : 'text-[#C05A35]'
                  }`}
                >
                  {block.num}.
                </span>
                <div
                  className={`flex-1 text-sm leading-relaxed ${
                    isUser ? 'text-white' : 'text-[#1E1B16]'
                  }`}
                >
                  {renderInlineTokens(block.text, isUser)}
                </div>
              </div>
            )

          case 'table':
            return (
              <div
                key={block.key}
                className="my-3 overflow-x-auto rounded-xl border border-[#EDE7E1] bg-white shadow-2xs"
              >
                <table className="w-full text-left text-xs">
                  {block.header && block.header.length > 0 && (
                    <thead className="bg-[#FAF8F5] border-b border-[#EDE7E1] text-[#8A817B] font-semibold uppercase tracking-wider">
                      <tr>
                        {block.header.map((col, cIdx) => (
                          <th key={cIdx} className="px-3.5 py-2.5">
                            {renderInlineTokens(col, isUser)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-[#EDE7E1]">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#FAF8F5]/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-[#1E1B16]">
                            {renderInlineTokens(cell, isUser)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          case 'p':
          default:
            return (
              <p
                key={block.key}
                className={`text-sm leading-relaxed my-1 ${
                  isUser ? 'text-white' : 'text-[#1E1B16]'
                }`}
              >
                {renderInlineTokens(block.text, isUser)}
              </p>
            )
        }
      })}
    </div>
  )
}

export default RichMessageContent
