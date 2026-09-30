import { useState } from 'react';
import {
  Terminal,
  CornerDownLeft,
  Sparkles,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Cpu,
  Wand2,
  Bug,
  Zap,
  FlaskConical,
} from 'lucide-react';

export default function TerminalOutput({
  outputResult,
  isLoading,
  stdin,
  onStdinChange,
  activeLanguage,
  aiAnalysis,
  aiLoading,
  onAiAction,
  onClearOutput,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('output');
  const [copied, setCopied] = useState(false);

  // Copy terminal output
  const handleCopyOutput = async () => {
    const text = [
      outputResult?.compiler_error,
      outputResult?.stderr,
      outputResult?.stdout,
    ]
      .filter(Boolean)
      .join('\n');

    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  return (
    <div
      className={`flex flex-col bg-white border border-[#EDE7E1] rounded-3xl overflow-hidden shadow-xs ring-1 ring-black/5 ${className}`}
    >
      {/* Tab Navigation Header (Light Theme) */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#FAF7F4] border-b border-[#EBE4DC] select-none">
        <div className="flex items-center space-x-1.5">
          {/* Output / Console Tab */}
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'output'
                ? 'bg-white text-[#C05A35] border border-[#E8D4C8] shadow-2xs'
                : 'text-[#6B6158] hover:text-[#1E1B16] hover:bg-[#EFEAE4]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal Output</span>
            {outputResult && (
              <span
                className={`w-2 h-2 rounded-full ml-1 ${
                  outputResult.success ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            )}
          </button>

          {/* Stdin Tab */}
          <button
            onClick={() => setActiveTab('stdin')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'stdin'
                ? 'bg-white text-[#C05A35] border border-[#E8D4C8] shadow-2xs'
                : 'text-[#6B6158] hover:text-[#1E1B16] hover:bg-[#EFEAE4]'
            }`}
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Standard Input</span>
            {stdin.trim().length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            )}
          </button>

          {/* AI Copilot Tab */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-[#FFF5ED] to-[#FEF3E2] text-[#C05A35] border border-[#FCD8CB] shadow-2xs'
                : 'text-[#6B6158] hover:text-[#1E1B16] hover:bg-[#EFEAE4]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8845F] animate-pulse" />
            <span>AI Copilot</span>
          </button>
        </div>

        {/* Tab Right Controls (Copy, Clear) */}
        {activeTab === 'output' && (
          <div className="flex items-center space-x-1 text-[#6B6158]">
            <button
              onClick={handleCopyOutput}
              disabled={!outputResult}
              className="p-1.5 hover:text-[#1E1B16] hover:bg-[#EFEAE4] rounded-lg transition-colors disabled:opacity-40"
              title="Copy Output"
              aria-label="Copy Output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClearOutput}
              disabled={!outputResult && !isLoading}
              className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
              title="Clear Terminal"
              aria-label="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Content Body (Light Theme) */}
      <div className="flex-1 p-4 overflow-auto min-h-[240px] font-mono text-xs text-[#2C2520] bg-white">
        {/* 1. OUTPUT / TERMINAL TAB */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            {/* Status Pills Banner */}
            {isLoading ? (
              <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-[#FDEEE6] border border-[#FCD8CB] text-[#C05A35]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C05A35]" />
                <span className="font-bold">Compiling & executing on sandbox engine...</span>
              </div>
            ) : outputResult ? (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DC]">
                {/* Exit Code Pill */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-extrabold text-[11px] ${
                    outputResult.success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                  }`}
                >
                  {outputResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  {outputResult.success
                    ? 'SUCCESS (EXIT 0)'
                    : `ERROR (EXIT ${outputResult.status ?? 1})`}
                </span>

                {/* Execution Time */}
                {outputResult.execution_time_ms !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-[#4A423B] border border-[#E2DAD1] text-[11px] font-medium shadow-2xs">
                    <Clock className="w-3 h-3 text-[#C05A35]" />
                    <span>{outputResult.execution_time_ms} ms</span>
                  </span>
                )}

                {/* Compiler Engine Tag */}
                {outputResult.compiler && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-[#7C726A] border border-[#E2DAD1] text-[11px] font-mono ml-auto shadow-2xs">
                    <Cpu className="w-3 h-3 text-[#6366F1]" />
                    <span>{outputResult.compiler}</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[#8C827A] text-center py-12 select-none">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DC] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Terminal className="w-6 h-6 text-[#9E948B]" />
                </div>
                <p className="font-bold text-[#2C2520] text-sm">Terminal ready for execution</p>
                <p className="text-xs text-[#8C827A] mt-1">
                  Press <kbd className="px-2 py-0.5 rounded-lg bg-[#F4EFEA] text-[#3D352E] border border-[#DDD5CC] font-mono font-semibold">Ctrl + Enter</kbd> to compile and run.
                </p>
              </div>
            )}

            {/* Program Outputs */}
            {outputResult && (
              <div className="space-y-3 font-mono leading-relaxed select-text">
                {/* 1. Compilation Error if any */}
                {outputResult.compiler_error && (
                  <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] whitespace-pre-wrap font-mono shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#991B1B] mb-2 pb-1.5 border-b border-[#FCA5A5]/40 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Compilation Diagnostic:</span>
                    </div>
                    <div className="text-[12px]">{outputResult.compiler_error}</div>
                  </div>
                )}

                {/* 2. Runtime Stderr if any */}
                {outputResult.stderr && (
                  <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#BE123C] whitespace-pre-wrap font-mono shadow-2xs">
                    <div className="font-bold text-[#9F1239] mb-1.5 text-xs">Standard Error (stderr):</div>
                    <div className="text-[12px]">{outputResult.stderr}</div>
                  </div>
                )}

                {/* 3. Program Stdout */}
                {outputResult.stdout && (
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE4DC] text-[#1E1B16] whitespace-pre-wrap font-mono shadow-2xs">
                    <div className="font-bold text-[#5C534B] mb-1.5 text-[11px] flex items-center justify-between border-b border-[#EBE4DC] pb-1">
                      <span>Standard Output (stdout):</span>
                      <span className="text-[10px] text-[#8C827A] font-normal">Console Stream</span>
                    </div>
                    <div className="text-[12px] text-[#1E1B16] font-medium">{outputResult.stdout}</div>
                  </div>
                )}

                {/* Clean exit with no output */}
                {outputResult.success && !outputResult.stdout && !outputResult.stderr && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                    Program executed successfully with no stdout output (exit code 0).
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. STANDARD INPUT (STDIN) TAB */}
        {activeTab === 'stdin' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#5C534B] font-medium">
                Provide custom input data passed to your program via <code className="text-[#C05A35] font-bold bg-[#FDEEE6] px-1.5 py-0.5 rounded">stdin</code>:
              </span>
              <button
                onClick={() => onStdinChange('')}
                className="text-xs text-[#8C827A] hover:text-rose-600 transition-colors font-medium"
              >
                Clear input
              </button>
            </div>

            <textarea
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="e.g.&#10;5&#10;10 20 30 40 50&#10;Target value: 30"
              rows={8}
              className="w-full p-3.5 bg-[#FAF8F5] border border-[#EBE4DC] rounded-2xl text-[#1E1B16] font-mono text-xs outline-none focus:border-[#C05A35] focus:bg-white focus:ring-2 focus:ring-[#C05A35]/10 resize-y transition-all"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-[#8C827A] font-semibold">Quick Samples:</span>
              <button
                onClick={() => onStdinChange('5\n1 2 3 4 5')}
                className="px-3 py-1 bg-[#F4EFEA] hover:bg-[#EAE3DC] border border-[#E2DAD1] rounded-xl text-xs text-[#3D352E] font-medium transition-colors shadow-2xs"
              >
                Array: 5 items
              </button>
              <button
                onClick={() => onStdinChange('Hello World DeepCode')}
                className="px-3 py-1 bg-[#F4EFEA] hover:bg-[#EAE3DC] border border-[#E2DAD1] rounded-xl text-xs text-[#3D352E] font-medium transition-colors shadow-2xs"
              >
                String Line
              </button>
              <button
                onClick={() => onStdinChange('3 3\n1 2 3\n4 5 6\n7 8 9')}
                className="px-3 py-1 bg-[#F4EFEA] hover:bg-[#EAE3DC] border border-[#E2DAD1] rounded-xl text-xs text-[#3D352E] font-medium transition-colors shadow-2xs"
              >
                3x3 Matrix Grid
              </button>
            </div>
          </div>
        )}

        {/* 3. AI COPILOT TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {/* Quick Action Prompt Triggers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => onAiAction('explain')}
                disabled={aiLoading}
                className="flex flex-col items-center p-3 bg-[#FAF8F5] hover:bg-[#F2ECE6] border border-[#EBE4DC] hover:border-[#D6CEC5] rounded-2xl text-center transition-all group disabled:opacity-50 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FDEEE6] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Wand2 className="w-4 h-4 text-[#C05A35]" />
                </div>
                <span className="text-xs font-bold text-[#1E1B16]">Explain Code</span>
                <span className="text-[10px] text-[#8C827A]">Logic & Big-O</span>
              </button>

              <button
                onClick={() => onAiAction('fix')}
                disabled={aiLoading}
                className="flex flex-col items-center p-3 bg-[#FAF8F5] hover:bg-[#F2ECE6] border border-[#EBE4DC] hover:border-[#D6CEC5] rounded-2xl text-center transition-all group disabled:opacity-50 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Bug className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-xs font-bold text-[#1E1B16]">Find & Fix Bugs</span>
                <span className="text-[10px] text-[#8C827A]">Detect flaws</span>
              </button>

              <button
                onClick={() => onAiAction('optimize')}
                disabled={aiLoading}
                className="flex flex-col items-center p-3 bg-[#FAF8F5] hover:bg-[#F2ECE6] border border-[#EBE4DC] hover:border-[#D6CEC5] rounded-2xl text-center transition-all group disabled:opacity-50 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-bold text-[#1E1B16]">Optimize Code</span>
                <span className="text-[10px] text-[#8C827A]">Speed & Memory</span>
              </button>

              <button
                onClick={() => onAiAction('test_cases')}
                disabled={aiLoading}
                className="flex flex-col items-center p-3 bg-[#FAF8F5] hover:bg-[#F2ECE6] border border-[#EBE4DC] hover:border-[#D6CEC5] rounded-2xl text-center transition-all group disabled:opacity-50 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-[#1E1B16]">Generate Tests</span>
                <span className="text-[10px] text-[#8C827A]">Corner cases</span>
              </button>
            </div>

            {/* AI Result Stream / Display */}
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#FAF8F5] border border-[#EBE4DC] rounded-2xl text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#C05A35]" />
                <p className="text-sm font-bold text-[#1E1B16]">DeepCode AI is inspecting your code...</p>
                <p className="text-xs text-[#8C827A]">Analyzing algorithmic patterns, syntax trees & time complexity</p>
              </div>
            ) : aiAnalysis ? (
              <div className="p-4 bg-[#FAF8F5] border border-[#EBE4DC] rounded-2xl leading-relaxed whitespace-pre-wrap text-[#1E1B16] font-sans text-xs shadow-2xs">
                {aiAnalysis}
              </div>
            ) : (
              <div className="p-8 bg-[#FAF8F5] border border-[#EBE4DC] rounded-2xl text-center space-y-2">
                <Sparkles className="w-6 h-6 text-[#E8845F] mx-auto" />
                <p className="text-xs font-medium text-[#5C534B]">
                  Select an action above to receive instantaneous AI mentorship, time-complexity analysis, and bug diagnostics.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
