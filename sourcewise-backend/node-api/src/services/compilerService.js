const axios = require('axios');
const logger = require('../utils/logger');

const WANDBOX_API = 'https://wandbox.org/api/compile.json';
const AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

const aiHeaders = () => ({
  'X-Internal-Key': INTERNAL_KEY,
  'Content-Type': 'application/json',
});

// Map of canonical languages to their Wandbox compiler configurations and file extensions
const SUPPORTED_LANGUAGES = {
  python: {
    id: 'python',
    name: 'Python 3',
    version: '3.12.7',
    compiler: 'cpython-3.12.7',
    extension: '.py',
    icon: 'py',
    aliases: ['py', 'python3'],
    defaultCode: `# DeepCode Python 3 Playground\ndef solve():\n    nums = [2, 7, 11, 15]\n    target = 9\n    lookup = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in lookup:\n            return [lookup[complement], i]\n        lookup[n] = i\n    return []\n\nif __name__ == "__main__":\n    result = solve()\n    print("Welcome to DeepCode Python!")\n    print(f"Two Sum Indices for target 9: {result}")\n`,
    sampleInput: '',
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    version: 'Node.js 20.17',
    compiler: 'nodejs-20.17.0',
    extension: '.js',
    icon: 'js',
    aliases: ['js', 'node'],
    defaultCode: `// DeepCode JavaScript Playground\nfunction main() {\n    console.log("Welcome to DeepCode JS!");\n    \n    function fibonacci(n) {\n        const seq = [0, 1];\n        for (let i = 2; i < n; i++) {\n            seq.push(seq[i - 1] + seq[i - 2]);\n        }\n        return seq.slice(0, n);\n    }\n    \n    console.log("First 8 Fibonacci numbers:", fibonacci(8));\n}\n\nmain();\n`,
    sampleInput: '',
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    version: '5.6.2',
    compiler: 'typescript-5.6.2',
    extension: '.ts',
    icon: 'ts',
    aliases: ['ts'],
    defaultCode: `// DeepCode TypeScript Playground\ninterface Scholar {\n    id: number;\n    name: string;\n    skills: string[];\n}\n\nfunction inspect(scholar: Scholar): string {\n    return \`Scholar: \${scholar.name} (Skills: \${scholar.skills.join(', ')})\`;\n}\n\nconst user: Scholar = {\n    id: 101,\n    name: "SourceWise Learner",\n    skills: ["AI Systems", "TypeScript", "Algorithms"]\n};\n\nconsole.log(inspect(user));\n`,
    sampleInput: '',
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    version: 'GCC 13.2 / C++20',
    compiler: 'gcc-head',
    extension: '.cpp',
    icon: 'cpp',
    aliases: ['c++', 'cxx'],
    defaultCode: `// DeepCode C++20 Playground\n#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::cout << "Welcome to DeepCode C++!\\n";\n    \n    std::vector<int> numbers = {42, 17, 99, 8, 23};\n    std::sort(numbers.begin(), numbers.end());\n    \n    std::cout << "Sorted elements: ";\n    for (int n : numbers) {\n        std::cout << n << " ";\n    }\n    std::cout << std::endl;\n    return 0;\n}\n`,
    sampleInput: '',
  },
  c: {
    id: 'c',
    name: 'C',
    version: 'GCC 13.2',
    compiler: 'gcc-head-c',
    extension: '.c',
    icon: 'c',
    aliases: ['gcc'],
    defaultCode: `// DeepCode C Playground\n#include <stdio.h>\n\nint main() {\n    printf("Welcome to DeepCode C!\\n");\n    int sum = 0;\n    for (int i = 1; i <= 10; i++) {\n        sum += i;\n    }\n    printf("Sum of 1..10 is: %d\\n", sum);\n    return 0;\n}\n`,
    sampleInput: '',
  },
  java: {
    id: 'java',
    name: 'Java',
    version: 'OpenJDK 21',
    compiler: 'openjdk-jdk-21+35',
    extension: '.java',
    icon: 'java',
    aliases: [],
    defaultCode: `// DeepCode Java Playground\nimport java.util.*;\n\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to DeepCode Java!");\n        List<String> items = Arrays.asList("Neural Networks", "Compilers", "Distributed Systems");\n        items.forEach(item -> System.out.println("  • " + item));\n    }\n}\n`,
    sampleInput: '',
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    version: '1.82.0',
    compiler: 'rust-1.82.0',
    extension: '.rs',
    icon: 'rust',
    aliases: ['rs'],
    defaultCode: `// DeepCode Rust Playground\nfn main() {\n    println!("Welcome to DeepCode Rust!");\n    let numbers = vec![1, 2, 3, 4, 5];\n    let doubled: Vec<i32> = numbers.iter().map(|&x| x * 2).collect();\n    println!("Doubled elements: {:?}", doubled);\n}\n`,
    sampleInput: '',
  },
  go: {
    id: 'go',
    name: 'Go',
    version: '1.23.2',
    compiler: 'go-1.23.2',
    extension: '.go',
    icon: 'go',
    aliases: ['golang'],
    defaultCode: `// DeepCode Go Playground\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Welcome to DeepCode Go!")\n    steps := []string{"Analyze", "Compile", "Execute"}\n    for i, s := range steps {\n        fmt.Printf("[%d] %s\\n", i+1, s)\n    }\n}\n`,
    sampleInput: '',
  },
  sql: {
    id: 'sql',
    name: 'SQL (SQLite)',
    version: '3.46.1',
    compiler: 'sqlite-3.46.1',
    extension: '.sql',
    icon: 'sql',
    aliases: ['sqlite'],
    defaultCode: `-- DeepCode SQL Playground\nCREATE TABLE scholars (id INTEGER PRIMARY KEY, name TEXT, xp INTEGER);\nINSERT INTO scholars VALUES (1, 'Ada Lovelace', 950);\nINSERT INTO scholars VALUES (2, 'Alan Turing', 980);\nINSERT INTO scholars VALUES (3, 'Grace Hopper', 920);\n\nSELECT * FROM scholars ORDER BY xp DESC;\n`,
    sampleInput: '',
  },
};

// Starter templates for algorithms & common interview questions
const CODE_TEMPLATES = {
  two_sum: {
    name: 'Two Sum (Hash Map)',
    python: `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n\nprint("Two sum [3, 2, 4], target 6 =>", two_sum([3, 2, 4], 6))\n`,
    javascript: `function twoSum(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (seen.has(diff)) return [seen.get(diff), i];\n        seen.set(nums[i], i);\n    }\n    return [];\n}\n\nconsole.log("Two sum [3, 2, 4], target 6 =>", twoSum([3, 2, 4], 6));\n`,
    cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nstd::vector<int> twoSum(const std::vector<int>& nums, int target) {\n    std::unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); ++i) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) return {seen[complement], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n\nint main() {\n    std::vector<int> res = twoSum({3, 2, 4}, 6);\n    std::cout << "Indices: " << res[0] << ", " << res[1] << std::endl;\n    return 0;\n}\n`,
  },
  binary_search: {
    name: 'Binary Search (O(log N))',
    python: `def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\narr = [10, 23, 35, 47, 59, 72, 88, 99]\nprint(f"Searching 47 in {arr}: found at index {binary_search(arr, 47)}")\n`,
    javascript: `function binarySearch(arr, target) {\n    let low = 0, high = arr.length - 1;\n    while (low <= high) {\n        const mid = Math.floor((low + high) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) low = mid + 1;\n        else high = mid - 1;\n    }\n    return -1;\n}\n\nconst arr = [10, 23, 35, 47, 59, 72, 88, 99];\nconsole.log(\`Searching 47: index \${binarySearch(arr, 47)}\`);\n`,
    cpp: `#include <iostream>\n#include <vector>\n\nint binarySearch(const std::vector<int>& arr, int target) {\n    int low = 0, high = arr.size() - 1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) low = mid + 1;\n        else high = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    std::vector<int> arr = {10, 23, 35, 47, 59, 72, 88, 99};\n    std::cout << "Index of 47: " << binarySearch(arr, 47) << std::endl;\n    return 0;\n}\n`,
  },
  fibonacci: {
    name: 'Fibonacci (Dynamic Programming)',
    python: `def fib(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)\n    return memo[n]\n\nprint("Fibonacci(20) =", fib(20))\n`,
    javascript: `function fib(n, memo = {}) {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n    return (memo[n] = fib(n - 1, memo) + fib(n - 2, memo));\n}\n\nconsole.log("Fibonacci(20) =", fib(20));\n`,
    cpp: `#include <iostream>\n#include <vector>\n\nlong long fib(int n) {\n    if (n <= 1) return n;\n    std::vector<long long> dp(n + 1);\n    dp[0] = 0; dp[1] = 1;\n    for (int i = 2; i <= n; ++i) dp[i] = dp[i-1] + dp[i-2];\n    return dp[n];\n}\n\nint main() {\n    std::cout << "Fibonacci(20) = " << fib(20) << std::endl;\n    return 0;\n}\n`,
  },
};

/**
 * Resolve language identifier or alias to canonical language key
 */
function resolveLanguage(lang) {
  if (!lang) return null;
  const lower = lang.toLowerCase().trim();
  if (SUPPORTED_LANGUAGES[lower]) return lower;
  for (const [key, cfg] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (cfg.aliases.includes(lower)) return key;
  }
  return null;
}

/**
 * Executes code via Wandbox or fallback sandbox
 */
async function executeCode({ language, code, stdin = '', compiler = null }) {
  const canonical = resolveLanguage(language);
  if (!canonical) {
    throw new Error(`Unsupported language: '${language}'. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
  }

  const langConfig = SUPPORTED_LANGUAGES[canonical];
  const targetCompiler = compiler || langConfig.compiler;
  const startTime = Date.now();

  try {
    let sanitizedCode = code;
    if (canonical === 'java') {
      sanitizedCode = sanitizedCode.replace(/\bpublic\s+class\s+/g, 'class ');
    }

    const payload = {
      code: sanitizedCode,
      compiler: targetCompiler,
      stdin: stdin || '',
      save: false,
    };

    const response = await axios.post(WANDBOX_API, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 28000,
    });

    const elapsed = Date.now() - startTime;
    const data = response.data || {};

    const exitCode = parseInt(data.status ?? '0', 10);
    const compileError = data.compiler_error || data.compiler_output || '';
    const stdout = data.program_output || '';
    const stderr = data.program_error || '';

    const isSuccess = exitCode === 0 && !compileError;

    return {
      success: isSuccess,
      status: exitCode,
      stdout: stdout,
      stderr: stderr,
      compiler_error: compileError,
      execution_time_ms: elapsed,
      language: canonical,
      compiler: targetCompiler,
      engine: 'wandbox',
    };
  } catch (err) {
    logger.warn('compiler.wandbox_failed', { err: err.message, language: canonical });

    // Local fallback for JavaScript if Wandbox network is temporarily interrupted
    if (canonical === 'javascript') {
      try {
        const result = runLocalJavaScript(code, stdin);
        return {
          ...result,
          language: canonical,
          compiler: 'local-node',
          engine: 'local-sandbox',
          execution_time_ms: Date.now() - startTime,
        };
      } catch (localErr) {
        return {
          success: false,
          status: 1,
          stdout: '',
          stderr: localErr.message,
          compiler_error: '',
          execution_time_ms: Date.now() - startTime,
          language: canonical,
          compiler: 'local-node',
          engine: 'local-sandbox',
        };
      }
    }

    throw new Error(`Compiler execution service error: ${err.message}`);
  }
}

/**
 * Minimal in-process JavaScript runner fallback
 */
function runLocalJavaScript(code, stdin) {
  const vm = require('vm');
  let output = '';
  let errorOutput = '';

  const sandbox = {
    console: {
      log: (...args) => { output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
      error: (...args) => { errorOutput += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
      warn: (...args) => { output += '[WARN] ' + args.join(' ') + '\n'; },
    },
    stdin: stdin || '',
    setTimeout: (fn) => fn(),
  };

  const context = vm.createContext(sandbox);
  try {
    vm.runInContext(code, context, { timeout: 3000 });
    return {
      success: true,
      status: 0,
      stdout: output,
      stderr: errorOutput,
      compiler_error: '',
    };
  } catch (e) {
    return {
      success: false,
      status: 1,
      stdout: output,
      stderr: e.stack || e.message,
      compiler_error: '',
    };
  }
}

/**
 * Quick static syntax validator fallback when remote AI is unreachable
 */
function inspectSyntaxFallback(language, code, error_output) {
  const issues = [];
  const lines = code.split('\n');
  const lang = (language || '').toLowerCase();

  if (lang === 'python' || lang === 'py') {
    const blockHeaders = ['if', 'elif', 'else', 'while', 'for', 'def', 'class', 'try', 'except', 'finally', 'with'];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for missing colon on block headers
      for (const header of blockHeaders) {
        if (trimmed === header || trimmed.startsWith(header + ' ') || trimmed.startsWith(header + '(')) {
          if (!trimmed.endsWith(':')) {
            issues.push(`Line ${i + 1}: Missing colon (\`:\`) at the end of statement \`${trimmed}\`. In Python, compound statements must terminate with a colon.`);
          }
          // Check following non-empty line for indentation
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
          if (nextIdx < lines.length) {
            const nextLine = lines[nextIdx];
            const currentIndent = line.match(/^\s*/)[0].length;
            const nextIndent = nextLine.match(/^\s*/)[0].length;
            if (nextIndent <= currentIndent && !nextLine.trim().startsWith('#')) {
              issues.push(`Line ${nextIdx + 1}: Indentation error expected after line ${i + 1}. Python requires blocks inside \`${header}\` statements to be indented.`);
            }
          }
          break;
        }
      }

      // Check for direct string input comparison with number
      if (/\binput\s*\(/.test(code) && /[><!=]=?\s*\d+/.test(line)) {
        if (!/\bint\s*\(|\bfloat\s*\(/.test(code)) {
          issues.push(`Line ${i + 1}: Potential Type Error. \`input()\` returns a string (\`str\`) in Python 3. Comparing a string to an integer with \`>=\` raises \`TypeError\`. Convert the input with \`int(input())\`.`);
        }
      }
    }
  }

  // Bracket delimiter matching
  const stack = [];
  const openPairs = { '(': ')', '[': ']', '{': '}' };
  const closePairs = { ')': '(', ']': '[', '}': '{' };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
      if (openPairs[char]) stack.push({ char, line: i + 1 });
      else if (closePairs[char]) {
        if (stack.length === 0 || stack[stack.length - 1].char !== closePairs[char]) {
          issues.push(`Line ${i + 1}: Unmatched closing delimiter \`${char}\`.`);
        } else {
          stack.pop();
        }
      }
    }
  }
  while (stack.length > 0) {
    const unclosed = stack.pop();
    issues.push(`Line ${unclosed.line}: Unclosed delimiter \`${unclosed.char}\`.`);
  }

  return issues;
}

/**
 * AI Code Assistant: Explains code, diagnoses errors, optimizes, or generates tests
 */
async function aiAssist({ action, language, code, error_output = '', user_id = null }) {
  const canonical = resolveLanguage(language) || language;
  
  const prompts = {
    explain: `Analyze this ${canonical} code. Explain what it does step by step, its time complexity (Big-O), space complexity, and any edge case handling. Keep it educational and concise for a computer science scholar.`,
    fix: error_output
      ? `This ${canonical} code produced the following compiler or runtime diagnostic:\n"""\n${error_output}\n"""\nIdentify the exact line causing the error, explain why it happened, find any additional syntax or logical flaws, and provide the complete corrected code snippet.`
      : `Thoroughly inspect this ${canonical} code for syntax errors (e.g. missing colons, missing indentation in Python), type mismatches, logic bugs, and runtime exceptions. Explicitly identify each error, explain why it happens, and provide the complete corrected code snippet.`,
    optimize: `Review this ${canonical} code for performance and readability. Suggest improvements for lower time/space complexity or cleaner idiomatic style, with before/after snippets.`,
    test_cases: `Generate 4 diverse test cases (including normal inputs, edge cases like empty/single elements, negative numbers, or large inputs) for this ${canonical} code.`,
  };

  const instruction = prompts[action] || prompts.explain;

  try {
    // Proxy to python-ai /chat endpoint
    const response = await axios.post(
      `${AI_URL}/chat`,
      {
        question: `You are DeepCode AI Inspector, an expert programming mentor and compiler diagnostics engine.\n\n${instruction}\n\nHere is the code:\n\`\`\`${canonical}\n${code}\n\`\`\``,
        source_ids: [],
        conversation_history: [],
        user_id: user_id || 'anonymous_scholar',
      },
      { headers: aiHeaders(), timeout: 35000 }
    );

    const answer = response.data?.answer || response.data?.reply || response.data?.message;
    if (answer) {
      return {
        action,
        language: canonical,
        analysis: answer,
      };
    }
  } catch (err) {
    logger.warn('compiler.ai_assist_failed', { err: err.message, action });
  }

  // Local fallback intelligent diagnostic inspector
  const detectedIssues = inspectSyntaxFallback(canonical, code, error_output);
  let fallbackMessage = '';

  if (detectedIssues.length > 0) {
    fallbackMessage = `### 🔍 Detected Syntax & Runtime Errors\n\n` +
      detectedIssues.map((issue) => `- ❌ **${issue}**`).join('\n\n') +
      `\n\n💡 *Tip: Fix the highlighted syntax errors and re-run your program.*`;
  } else if (error_output) {
    fallbackMessage = `**Observed Diagnostic:**\n\`\`\`\n${error_output}\n\`\`\`\n\n💡 *Tip: Check variable scoping, array bounds, and return types.*`;
  } else {
    fallbackMessage = `Run the code to verify execution output. (Static inspection found no obvious syntax delimiter errors).`;
  }

  return {
    action,
    language: canonical,
    analysis: `### 🤖 DeepCode AI Inspector\n\n**Action:** ${action.toUpperCase()}\n**Language:** ${canonical}\n\n**Code Overview:**\n- Analyzed ${code.split('\n').length} lines of code.\n\n${fallbackMessage}`,
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  CODE_TEMPLATES,
  resolveLanguage,
  executeCode,
  aiAssist,
};
