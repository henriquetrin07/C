import React, { useRef, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import { CompilerDiagnostic } from '../types';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  fileName: string;
  diagnostics: CompilerDiagnostic[];
  onRun: () => void;
  highlightedLine?: number | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  fileName,
  diagnostics,
  onRun,
  highlightedLine,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const linesGutterRef = useRef<HTMLDivElement>(null);

  // Split code into lines for gutter
  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  // Syntax highlighting via Prism
  const highlightedCode = useMemo(() => {
    try {
      return Prism.highlight(code || '', Prism.languages.c, 'c');
    } catch {
      return code;
    }
  }, [code]);

  // Map diagnostics for this file by line number
  const diagnosticsByLine = useMemo(() => {
    const map = new Map<number, CompilerDiagnostic>();
    diagnostics.forEach((diag) => {
      if (diag.file === fileName || !diag.file.includes('.')) {
        if (!map.has(diag.line) || diag.type === 'error') {
          map.set(diag.line, diag);
        }
      }
    });
    return map;
  }, [diagnostics, fileName]);

  // Synchronize scrolling between textarea and overlay
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (linesGutterRef.current) {
      linesGutterRef.current.scrollTop = scrollTop;
    }
  };

  // Scroll to highlighted line when requested
  useEffect(() => {
    if (highlightedLine && textareaRef.current) {
      const lineHeight = 21; // approx px per line
      const targetScroll = (highlightedLine - 3) * lineHeight;
      textareaRef.current.scrollTop = Math.max(0, targetScroll);
    }
  }, [highlightedLine]);

  // Handle Tab key, auto-closing brackets, and Enter auto-indent
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter or F9 to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'F9') {
      e.preventDefault();
      onRun();
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Tab key: Insert 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabSpaces = '    ';
      const newValue = value.substring(0, selectionStart) + tabSpaces + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tabSpaces.length;
      }, 0);
      return;
    }

    // Auto-close brackets and quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key] && selectionStart === selectionEnd) {
      const closeChar = pairs[e.key];
      // If pressing close char right before existing close char, just skip
      if (value[selectionStart] === e.key && (e.key === '"' || e.key === "'")) {
        e.preventDefault();
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        return;
      }
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + e.key + closeChar + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      // Find current line indent
      const currentLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(currentLineStart, selectionStart);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : '';

      // If line ended with '{', add 4 spaces
      const trimmedLine = currentLine.trim();
      const extraIndent = trimmedLine.endsWith('{') ? '    ' : '';

      // Check if immediately followed by '}'
      const followedByClose = value.substring(selectionStart, selectionStart + 1) === '}';
      let insert = '\n' + indent + extraIndent;
      let newCursor = selectionStart + insert.length;

      if (followedByClose && extraIndent) {
        insert = '\n' + indent + extraIndent + '\n' + indent;
      }

      const newValue = value.substring(0, selectionStart) + insert + value.substring(selectionEnd);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      }, 0);
    }
  };

  return (
    <div className="relative flex-1 h-full flex bg-[#0d1117] text-slate-100 font-mono-code text-[13px] leading-[21px] overflow-hidden select-text">
      {/* Line Numbers Gutter */}
      <div
        ref={linesGutterRef}
        className="w-12 py-3 bg-[#090d13] text-slate-600 select-none text-right pr-3 font-mono text-[12px] border-r border-slate-800/80 overflow-hidden flex-shrink-0"
      >
        {lines.map((_, idx) => {
          const lineNum = idx + 1;
          const diag = diagnosticsByLine.get(lineNum);
          const isHighlighted = highlightedLine === lineNum;

          return (
            <div
              key={lineNum}
              className={`relative flex items-center justify-end h-[21px] ${
                isHighlighted ? 'bg-blue-500/20 text-blue-300 font-bold' : ''
              }`}
            >
              {diag && (
                <span
                  title={`${diag.type.toUpperCase()}: ${diag.message}`}
                  className={`absolute left-1.5 w-2 h-2 rounded-full ${
                    diag.type === 'error'
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse'
                      : 'bg-amber-400 shadow-sm shadow-amber-400/50'
                  }`}
                />
              )}
              <span className={diag?.type === 'error' ? 'text-rose-400' : ''}>{lineNum}</span>
            </div>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Syntax Highlighted Render (Underneath) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 py-3 px-4 font-mono-code text-[13px] leading-[21px] pointer-events-none whitespace-pre overflow-hidden text-slate-100 z-0 select-none"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
        />

        {/* Real Transparent Textarea (On Top for Input) */}
        <textarea
          ref={textareaRef}
          id="code-editor-textarea"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="absolute inset-0 w-full h-full m-0 py-3 px-4 font-mono-code text-[13px] leading-[21px] bg-transparent text-transparent caret-white outline-none resize-none whitespace-pre overflow-auto z-10 selection:bg-blue-600/40"
          placeholder="// Escreva seu código C aqui..."
        />
      </div>
    </div>
  );
};
