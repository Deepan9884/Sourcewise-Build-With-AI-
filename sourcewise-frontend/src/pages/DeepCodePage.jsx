import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Sparkles,
  Columns2,
  Rows2,
  Code2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChevronDown,
} from 'lucide-react';
import CodeEditor from '../components/compiler/CodeEditor';
import TerminalOutput from '../components/compiler/TerminalOutput';
import { executeCode, getLanguages, getAIAssist } from '../lib/compilerApi';

export default function DeepCodePage() {
  const [languages, setLanguages] = useState({});
  const [templates, setTemplates] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [outputResult, setOutputResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [splitLayout, setSplitLayout] = useState('horizontal'); // 'horizontal' (side-by-side) or 'vertical' (stacked)
  const [toastMsg, setToastMsg] = useState(null);

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
          setTemplates(data.templates || {});

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

  // When language changes: load saved code or default template for that language
  const handleLanguageChange = (langKey) => {
    setSelectedLanguage(langKey);
    setSelectedTemplate('default');

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

  // Apply template preset
  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    if (templateKey === 'default') {
      const defaultTemplate = languages[selectedLanguage]?.defaultCode || '';
      handleCodeChange(defaultTemplate);
      return;
    }

    const tpl = templates[templateKey];
    if (tpl && tpl[selectedLanguage]) {
      handleCodeChange(tpl[selectedLanguage]);
      showToast(`Loaded ${tpl.name}`, 'success');
    } else {
      showToast(`Preset not available in ${selectedLanguage}`, 'info');
    }
  };

  // Reset to default language code
  const handleResetCode = () => {
    const defaultTemplate = languages[selectedLanguage]?.defaultCode || '';
    handleCodeChange(defaultTemplate);
    showToast('Code reset to starter template', 'info');
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
    try {
      const errOut = [outputResult?.compiler_error, outputResult?.stderr].filter(Boolean).join('\n');
      const res = await getAIAssist({
        action,
        language: selectedLanguage,
        code,
        error_output: errOut,
      });
      setAiAnalysis(res.analysis);
      showToast(`AI ${action} completed`, 'success');
    } catch (err) {
      setAiAnalysis(`AI Inspector error: ${err.message}`);
      showToast('AI analysis request failed', 'error');
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
      <div className="bg-white/80 backdrop-blur-xl border border-[#EDE7E1] rounded-3xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Language Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="appearance-none pl-3.5 pr-9 py-2 bg-[#F9F7F5] hover:bg-[#F2ECE6] border border-[#E4DDD6] rounded-xl text-xs font-semibold text-[#2C2520] outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors shadow-2xs"
            >
              {Object.values(languages).map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.icon} {lang.name} ({lang.version})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Algorithm Template Dropdown */}
          <div className="relative hidden sm:block">
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 bg-[#F9F7F5] hover:bg-[#F2ECE6] border border-[#E4DDD6] rounded-xl text-xs font-medium text-[#4A433D] outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
            >
              <option value="default">Starter Template</option>
              {Object.entries(templates).map(([key, tpl]) => (
                <option key={key} value={key}>
                  Preset: {tpl.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            <Sparkles className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
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
        className={`grid gap-4 ${
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
            className={splitLayout === 'horizontal' ? 'h-[620px]' : 'h-[440px]'}
          />
        </div>
      </div>
    </div>
  );
}
