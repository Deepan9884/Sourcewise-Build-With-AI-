/**
 * Fallback study puzzles for Game Arena.
 * Generates verified, high-quality interactive challenges when backend AI times out or is offline.
 */

function buildWordSearchGrid(terms, size = 12) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''))
  const placed = []
  const directions = [
    { dr: 0, dc: 1, name: 'E' },
    { dr: 1, dc: 0, name: 'S' },
    { dr: 1, dc: 1, name: 'SE' },
    { dr: 0, dc: -1, name: 'W' },
  ]

  for (const item of terms) {
    const word = item.term.toUpperCase().replace(/[^A-Z]/g, '').slice(0, size)
    if (word.length < 3) continue

    let wasPlaced = false
    let attempts = 0
    while (!wasPlaced && attempts < 100) {
      attempts++
      const dir = directions[Math.floor(Math.random() * directions.length)]
      const maxR = dir.dr === 1 ? size - word.length : size - 1
      const minR = dir.dr === -1 ? word.length - 1 : 0
      const maxC = dir.dc === 1 ? size - word.length : size - 1
      const minC = dir.dc === -1 ? word.length - 1 : 0

      const row = Math.floor(Math.random() * (maxR - minR + 1)) + minR
      const col = Math.floor(Math.random() * (maxC - minC + 1)) + minC

      let canPlace = true
      for (let i = 0; i < word.length; i++) {
        const r = row + dir.dr * i
        const c = col + dir.dc * i
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false
          break
        }
      }

      if (canPlace) {
        const positions = []
        for (let i = 0; i < word.length; i++) {
          const r = row + dir.dr * i
          const c = col + dir.dc * i
          grid[r][c] = word[i]
          positions.push({ row: r, col: c })
        }
        placed.push({
          word,
          definition: item.definition,
          positions,
          direction: dir.name,
          found: false,
        })
        wasPlaced = true
      }
    }
  }

  // Fill remaining cells with random letters
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)]
      }
    }
  }

  return { grid, words: placed, grid_size: size }
}

function scramble(word) {
  const letters = word.split('')
  for (let i = 0; i < 10; i++) {
    letters.sort(() => Math.random() - 0.5)
    if (letters.join('') !== word) break
  }
  return letters.join('')
}

export function getClientFallbackPuzzle(type, topic = 'Computer Science') {
  const cleanTopic = topic || 'General Concepts'

  switch (type) {
    case 'word_search': {
      const terms = [
        { term: 'ALGORITHM', definition: 'A step-by-step procedure for solving a computational problem' },
        { term: 'VARIABLE', definition: 'A named storage location that holds dynamic data in memory' },
        { term: 'RECURSION', definition: 'A method where a solution depends on smaller instances of itself' },
        { term: 'DATABASE', definition: 'An organized collection of structured data stored electronically' },
        { term: 'COMPILER', definition: 'A software program translating source code into machine code' },
        { term: 'FUNCTION', definition: 'A reusable unit of code designed to perform a distinct action' },
        { term: 'NETWORK', definition: 'A group of connected computers exchanging digital information' },
        { term: 'POINTER', definition: 'A variable holding the direct memory address of another variable' },
        { term: 'ENCRYPTION', definition: 'The process of encoding data to prevent unauthorized access' },
      ]
      const { grid, words, grid_size } = buildWordSearchGrid(terms, 12)
      return { grid, words, grid_size, topic: cleanTopic }
    }

    case 'match_pairs': {
      const pairs = [
        { id: '1', term: 'Polymorphism', definition: 'Ability of different classes to respond to the same message in unique ways' },
        { id: '2', term: 'Encapsulation', definition: 'Bundling data and methods into a single unit while restricting direct outer access' },
        { id: '3', term: 'Inheritance', definition: 'Mechanism where a new class adopts properties and behaviors from an existing class' },
        { id: '4', term: 'Abstraction', definition: 'Hiding internal implementation details and exposing only the essential features' },
        { id: '5', term: 'Concurrency', definition: 'Ability of a computer system to execute multiple tasks simultaneously or in overlapping periods' },
      ]
      const terms = pairs.map(p => ({ id: p.id, term: p.term })).sort(() => Math.random() - 0.5)
      const definitions = pairs.map(p => ({ id: `d${p.id}`, term_id: p.id, definition: p.definition })).sort(() => Math.random() - 0.5)
      return { terms, definitions, pair_count: pairs.length, topic: cleanTopic }
    }

    case 'rapid_fire': {
      const questions = [
        {
          term: 'Time Complexity of Binary Search',
          options: ['O(log n)', 'O(n)', 'O(n²)', 'O(1)'],
          correct_index: 0,
          concept: 'Algorithms',
        },
        {
          term: 'FIFO Data Structure',
          options: ['Queue', 'Stack', 'Tree', 'Graph'],
          correct_index: 0,
          concept: 'Data Structures',
        },
        {
          term: 'LIFO Data Structure',
          options: ['Stack', 'Queue', 'Array', 'Heap'],
          correct_index: 0,
          concept: 'Data Structures',
        },
        {
          term: 'Protocol for Secure Web Browsing',
          options: ['HTTPS', 'FTP', 'SSH', 'SMTP'],
          correct_index: 0,
          concept: 'Networking',
        },
        {
          term: 'Database Index Primary Purpose',
          options: ['Speed up queries', 'Encrypt table contents', 'Compress storage', 'Verify passwords'],
          correct_index: 0,
          concept: 'Databases',
        },
      ]
      return { questions, total: questions.length, topic: cleanTopic }
    }

    case 'memory_flip': {
      const pairs = [
        { id: '1', term: 'DNS', definition: 'Domain Name System translating URLs to IP addresses' },
        { id: '2', term: 'RAM', definition: 'Volatile high-speed working memory for active programs' },
        { id: '3', term: 'CPU', definition: 'Central Processing Unit executing program instructions' },
        { id: '4', term: 'API', definition: 'Application Programming Interface enabling service communication' },
        { id: '5', term: 'GPU', definition: 'Graphics Processing Unit optimized for parallel computation' },
        { id: '6', term: 'SSD', definition: 'Solid State Drive for high-speed persistent storage' },
      ]
      const cards = []
      for (const p of pairs) {
        cards.push({ id: `t${p.id}`, pair_id: p.id, content: p.term, card_type: 'term' })
        cards.push({ id: `d${p.id}`, pair_id: p.id, content: p.definition, card_type: 'definition' })
      }
      cards.sort(() => Math.random() - 0.5)
      return { cards, pair_count: pairs.length, topic: cleanTopic }
    }

    case 'anagram': {
      const raw = [
        { term: 'DATABASE', definition: 'Structured digital storage system', hint: 'Holds relational records' },
        { term: 'VARIABLE', definition: 'Named container for dynamic data values', hint: 'Opposite of constant' },
        { term: 'COMPILER', definition: 'Translates source code to binary machine code', hint: 'Turns code into an executable' },
        { term: 'FUNCTION', definition: 'Reusable block of program statements', hint: 'Takes arguments and returns results' },
        { term: 'SOFTWARE', definition: 'Collection of computer programs and procedures', hint: 'Runs on hardware' },
      ]
      const anagrams = raw.map(item => ({
        term: item.term,
        scrambled: scramble(item.term),
        definition: item.definition,
        hint: item.hint,
      }))
      return { anagrams, total: anagrams.length, topic: cleanTopic }
    }

    case 'cloze': {
      return {
        passage: 'In computer programming, a {{0}} is a sequence of instructions designed to accomplish a specific task. To store intermediate results during execution, programs declare {{1}} which allocate temporary memory locations. When operations need to be executed repeatedly until a condition evaluates to false, developers use a {{2}} construct.',
        blanks: [
          {
            index: 0,
            answer: 'function',
            options: ['function', 'variable', 'syntax error', 'database'],
          },
          {
            index: 1,
            answer: 'variables',
            options: ['variables', 'compilers', 'interfaces', 'networks'],
          },
          {
            index: 2,
            answer: 'loop',
            options: ['loop', 'constant', 'hardware', 'pixel'],
          },
        ],
        topic: cleanTopic,
      }
    }

    default:
      return null
  }
}
