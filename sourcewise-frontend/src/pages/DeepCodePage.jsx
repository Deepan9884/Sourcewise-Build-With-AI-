import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Bot,
  Columns2,
  Rows2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Check,
} from 'lucide-react';
import CodeEditor from '../components/compiler/CodeEditor';
import TerminalOutput from '../components/compiler/TerminalOutput';
import LanguageIcon from '../components/compiler/LanguageIcon';
import { executeCode, getLanguages, getAIAssist } from '../lib/compilerApi';
import { inspectCodeOffline } from '../lib/compilerFallbacks';

export default function DeepCodePage() {
  const [languages, setLanguages] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langMenuRef = useRef(null);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [outputResult, setOutputResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [splitLayout, setSplitLayout] = useState('horizontal'); // 'horizontal' (side-by-side) or 'vertical' (stacked)
  const [toastMsg, setToastMsg] = useState(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Show transient toast
  const showToast = (msg, type = 'info') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load language configurations on mount
  useEffect(() => {
    async function initLanguages() {
      try {
        const data = await getLanguages();
        if (data?.languages) {
          setLanguages(data.languages);

          // Initial code setup from local storage or defaults
          const savedCode = localStorage.getItem(`deepcode_code_python`);
          setCode(savedCode || data.languages.python?.defaultCode || '');
        }
      } catch (err) {
        // Fallback default setup if offline
        const fallbackDefault = `# DeepCode Python 3 Playground\nprint("Welcome to DeepCode! 🚀")\nfor i in range(1, 6):\n    print(f"Counting: {i}")\n`;
        setCode(fallbackDefault);
      }
    }
    initLanguages();
  }, []);

  // When language changes: load saved code or default code for that language
  const handleLanguageChange = (langKey) => {
    setSelectedLanguage(langKey);

    const saved = localStorage.getItem(`deepcode_code_${langKey}`);
    const defaultTemplate = languages[langKey]?.defaultCode || '';
    setCode(saved || defaultTemplate);

    const savedStdin = localStorage.getItem(`deepcode_stdin_${langKey}`) || '';
    setStdin(savedStdin);

    setOutputResult(null);
    setAiAnalysis('');
  };

  // When user edits code: persist in localStorage
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    localStorage.setItem(`deepcode_code_${selectedLanguage}`, newCode);
  };

  // When user edits stdin: persist in localStorage
  const handleStdinChange = (newStdin) => {
    setStdin(newStdin);
    localStorage.setItem(`deepcode_stdin_${selectedLanguage}`, newStdin);
  };

  // Reset to default language code
  const handleResetCode = () => {
    const defaultTemplate = languages[selectedLanguage]?.defaultCode || '';
    handleCodeChange(defaultTemplate);
    showToast('Code reset to default', 'info');
  };

  // Execute Code action
  const handleRunCode = useCallback(async () => {
    if (isLoading) return;
    if (!code.trim()) {
      showToast('Please enter some code to execute', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await executeCode({
        language: selectedLanguage,
        code,
        stdin,
      });
      setOutputResult(result);

      if (result.success) {
        showToast(`Executed in ${result.execution_time_ms}ms`, 'success');
      } else {
        showToast('Execution finished with errors', 'error');
      }
    } catch (err) {
      setOutputResult({
        success: false,
        status: 1,
        stdout: '',
        stderr: err.response?.data?.error || err.message,
        compiler_error: '',
        execution_time_ms: 0,
      });
      showToast(err.response?.data?.error || 'Execution failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [code, stdin, selectedLanguage, isLoading]);

  // AI Assist trigger
  const handleAiAction = async (action) => {
    setAiLoading(true);
    const errOut = [outputResult?.compiler_error, outputResult?.stderr].filter(Boolean).join('\n');
    try {
      const res = await getAIAssist({
        action,
        language: selectedLanguage,
        code,
        error_output: errOut,
      });
      setAiAnalysis(res.analysis);
      showToast(`AI ${action} completed`, 'success');
    } catch (err) {
      // Resilient fallback: Run local diagnostic inspector if network or server fails
      const fallbackReport = inspectCodeOffline({
        action,
        language: selectedLanguage,
        code,
        error_output: errOut,
      });
      setAiAnalysis(fallbackReport);
      showToast('Diagnostic completed (Fast/Offline mode)', 'info');
    } finally {
      setAiLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to Run
  useEffect(() => {
    const onGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [handleRunCode]);

  const activeLangConfig = languages[selectedLanguage] || {
    id: selectedLanguage,
    name: selectedLanguage,
    version: '',
    extension: '.txt',
    icon: '💻',
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 backdrop-blur-md ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toastMsg.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-gray-900/90 border-gray-700 text-gray-200'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toastMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : null}
            <span>{toastMsg.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Control Deck */}
      <div className="relative z-30 bg-white/80 backdrop-blur-xl border border-[#EDE7E1] rounded-3xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Language Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2.5 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E8845F] via-[#D96F4A] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#1E1B16] tracking-tight leading-tight">
                  DeepCode
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  IDE v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#7C726A]">
                Multi-Language Cloud Compiler & AI Playground
              </p>
            </div>
          </div>

          {/* Custom Professional Language Selector Dropdown */}
          <div className="relative z-40" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center space-x-2.5 pl-3.5 pr-3 py-2 bg-[#F9F7F5] hover:bg-[#F2ECE6] border border-[#E4DDD6] rounded-xl text-xs font-semibold text-[#2C2520] outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors shadow-2xs"
              aria-haspopup="listbox"
              aria-expanded={isLangOpen}
            >
              <LanguageIcon lang={selectedLanguage} className="w-4 h-4 shrink-0" />
              <span>{activeLangConfig.name}</span>
              <span className="text-[11px] text-[#7C726A] font-normal hidden sm:inline">
                ({activeLangConfig.version})
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                  isLangOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#EDE7E1] rounded-2xl shadow-2xl p-1.5 z-50 ring-1 ring-black/10"
                  role="listbox"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#8C827A] uppercase tracking-wider font-sans">
                    Select Language
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-0.5 overscroll-contain">
                    {Object.values(languages).map((lang) => {
                      const isSelected = lang.id === selectedLanguage;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            handleLanguageChange(lang.id);
                            setIsLangOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors font-sans ${
                            isSelected
                              ? 'bg-[#F4EFEA] text-[#1E1B16] font-bold'
                              : 'text-[#4A433D] hover:bg-[#FAF7F4] hover:text-[#1E1B16]'
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <LanguageIcon lang={lang.id} className="w-4 h-4 shrink-0" />
                            <span className="truncate">{lang.name}</span>
                            <span className="text-[11px] text-[#8C827A] font-normal shrink-0">
                              ({lang.version})
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#C05A35] shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Actions (Run, AI, Split, Reset) */}
        <div className="flex items-center space-x-2.5 shrink-0 self-end lg:self-auto">
          {/* Layout Orientation Toggle */}
          <div className="flex items-center bg-[#F4EFEA] p-0.5 rounded-xl border border-[#E4DDD6]">
            <button
              onClick={() => setSplitLayout('horizontal')}
              className={`p-1.5 rounded-lg transition-all ${
                splitLayout === 'horizontal'
                  ? 'bg-white text-[#C05A35] font-bold shadow-2xs'
                  : 'text-[#7C726A] hover:text-[#1E1B16]'
              }`}
              title="Side-by-side view"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSplitLayout('vertical')}
              className={`p-1.5 rounded-lg transition-all ${
                splitLayout === 'vertical'
                  ? 'bg-white text-[#C05A35] font-bold shadow-2xs'
                  : 'text-[#7C726A] hover:text-[#1E1B16]'
              }`}
              title="Stacked view"
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Copilot Quick Button */}
          <button
            onClick={() => handleAiAction('explain')}
            disabled={aiLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-all shadow-2xs group"
          >
            <Bot className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span>AI Copilot</span>
          </button>

          {/* Primary RUN CODE Button */}
          <button
            onClick={handleRunCode}
            disabled={isLoading}
            className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isLoading ? 'animate-pulse' : ''}`} />
            <span>{isLoading ? 'COMPILING...' : 'RUN CODE'}</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[10px] bg-emerald-800/60 rounded text-emerald-100 font-mono">
              Ctrl+↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Main Coding Workspace (Split View) */}
      <div
        className={`relative z-10 grid gap-4 ${
          splitLayout === 'horizontal'
            ? 'grid-cols-1 lg:grid-cols-12 items-start'
            : 'grid-cols-1'
        }`}
      >
        {/* Code Editor Pane */}
        <div className={splitLayout === 'horizontal' ? 'lg:col-span-7 xl:col-span-7' : 'w-full'}>
          <CodeEditor
            code={code}
            onChange={handleCodeChange}
            language={selectedLanguage}
            languageConfig={activeLangConfig}
            onReset={handleResetCode}
            className={splitLayout === 'horizontal' ? 'h-[620px]' : 'h-[480px]'}
          />
        </div>

        {/* Terminal & AI Console Pane */}
        <div className={splitLayout === 'horizontal' ? 'lg:col-span-5 xl:col-span-5' : 'w-full'}>
          <TerminalOutput
            outputResult={outputResult}
            isLoading={isLoading}
            stdin={stdin}
            onStdinChange={handleStdinChange}
            activeLanguage={selectedLanguage}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
            onAiAction={handleAiAction}
            onClearOutput={() => setOutputResult(null)}
            onApplyCode={handleCodeChange}
            className={splitLayout === 'horizontal' ? 'h-[620px]' : 'h-[440px]'}
          />
        </div>
      </div>
    </div>
  );
}
