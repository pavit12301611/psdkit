/* ============================================================
   CODING & LEARN TOOLS (50) — formatters, converters, playgrounds,
   cheatsheets, plus word meaning / translator / thesaurus.
   ============================================================ */
import { el, fmt, copyText, toast, debounce, copyButton, downloadFile, ctx2d } from '../ui.js';
import { loadHtmlBeautify, loadCssBeautify, loadJsBeautify, loadMarked, loadTurndown } from './libs.js';
import { icon } from '../icons.js';
import { mountFormTool, num, wordsCapitalise, renderResult, parseColour, rgbToHex } from './formkit.js';
import { TOOL_COUNT } from '../data/catalog.js';

/* ── shared: searchable reference mount (cheatsheets & tables) ── */
function referenceTool({ intro, sections }) {
  return (container) => {
    const search = el('input.input', { placeholder: 'Search this reference…', style: { marginBottom: '16px' } });
    const list = el('div.col', { style: { gap: '10px' } });
    const render = (q = '') => {
      list.innerHTML = '';
      const query = q.trim().toLowerCase();
      for (const sec of sections) {
        const rows = sec.rows.filter(([a, b]) =>
          !query || (a + ' ' + b).toLowerCase().includes(query));
        if (!rows.length) continue;
        list.append(el('details.acc', { open: !!query },
          el('summary', { html: `<span>${sec.title}</span>${icon('plus', 17, 'acc-ico')}` }),
          el('div.acc-body', {
            html: rows.map(([a, b]) => `<div class="term-row"><div class="term-name"><code class="inline">${a}</code></div><div class="term-mean">${b}</div></div>`).join(''),
          }),
        ));
      }
      if (!list.children.length) {
        list.append(el('div.empty-state', { html: `${icon('search', 24)}<div style="margin-top:8px">No matches for “${q}”.</div>` }));
      }
    };
    search.addEventListener('input', debounce(() => render(search.value), 200));
    container.append(intro ? el('div.note', { html: icon('info', 17) + `<span>${intro}</span>` }) : null, search, list);
    render();
  };
}

/* ── simple pretty printers (no dependency) ── */
function prettyXML(xml) {
  const cleaned = xml.replace(/>\s*</g, '><').trim();
  let pad = 0;
  return cleaned.replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .map((line) => {
      if (/^<\/\w/.test(line)) pad = Math.max(0, pad - 1);
      const out = '  '.repeat(pad) + line;
      if (/^<\w[^>]*[^\/]>.*$/.test(line) && !/^<.*>.*<\/.*>/.test(line)) pad++;
      return out;
    })
    .join('\n');
}

function prettySQL(sql) {
  const kw = /\b(SELECT|FROM|WHERE|AND|OR|NOT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AS|COUNT|SUM|AVG|MIN|MAX|DISTINCT|CREATE TABLE|ALTER TABLE|DROP TABLE|PRIMARY KEY|FOREIGN KEY|REFERENCES|NULL|IS|IN|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|UNION|ALL)\b/gi;
  return sql
    .replace(kw, (m) => '\n' + m.toUpperCase())
    .replace(/\s+/g, ' ')
    .replace(/\n /g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

function minifyGeneric(code, kind) {
  let out = code;
  if (kind === 'js') {
    out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    out = out.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ');
  } else if (kind === 'css') {
    out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s{2,}/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1');
  } else {
    out = out.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '<').replace(/\s{2,}/g, ' ');
  }
  return out.trim();
}

const caseConverters = (s) => {
  const words = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const cap = (w) => w[0].toUpperCase() + w.slice(1).toLowerCase();
  return {
    camel: words.map((w, i) => (i ? cap(w) : w.toLowerCase())).join(''),
    pascal: words.map(cap).join(''),
    snake: words.map((w) => w.toLowerCase()).join('_'),
    kebab: words.map((w) => w.toLowerCase()).join('-'),
    constant: words.map((w) => w.toUpperCase()).join('_'),
    title: words.map(cap).join(' '),
  };
};

/* ── cheatsheet content ── */
const GIT_SECTIONS = [
  { title: 'Setup & config', rows: [
    ['git config --global user.name "Name"', 'Set the name attached to your commits.'],
    ['git config --global user.email "mail"', 'Set the email attached to your commits.'],
    ['git init', 'Start a new repository in the current folder.'],
    ['git clone <url>', 'Copy an existing repository (with full history).'],
    ['git status', 'See changed, staged and untracked files.'],
  ] },
  { title: 'Daily workflow', rows: [
    ['git add .', 'Stage every change for the next commit.'],
    ['git add <file>', 'Stage one specific file.'],
    ['git commit -m "msg"', 'Save a snapshot of the staged changes.'],
    ['git commit -am "msg"', 'Stage modified files and commit in one step.'],
    ['git pull', 'Fetch and merge changes from the remote.'],
    ['git push', 'Upload your commits to the remote.'],
    ['git fetch', 'Download remote changes without merging.'],
  ] },
  { title: 'Branching', rows: [
    ['git branch', 'List local branches (* marks current).'],
    ['git branch <name>', 'Create a new branch.'],
    ['git checkout <name>', 'Switch to a branch.'],
    ['git checkout -b <name>', 'Create and switch in one command.'],
    ['git switch <name>', 'Modern way to switch branches.'],
    ['git merge <branch>', 'Merge another branch into the current one.'],
    ['git rebase <branch>', 'Replay commits on top of another branch (cleaner history).'],
  ] },
  { title: 'Undoing things', rows: [
    ['git restore <file>', 'Discard local changes to a file.'],
    ['git restore --staged <file>', 'Unstage a file (keeps changes).'],
    ['git reset --hard <commit>', 'Move HEAD and delete changes — destructive!'],
    ['git revert <commit>', 'Create a new commit that undoes an old one (safe).'],
    ['git stash', 'Temporarily shelve uncommitted changes.'],
    ['git stash pop', 'Re-apply the last stash.'],
  ] },
  { title: 'Inspecting history', rows: [
    ['git log --oneline --graph', 'Compact visual history.'],
    ['git log -p <file>', 'History with diffs for one file.'],
    ['git diff', 'See unstaged changes.'],
    ['git diff --staged', 'See staged (about to commit) changes.'],
    ['git show <commit>', 'Inspect a specific commit.'],
    ['git blame <file>', 'Who changed each line and when.'],
  ] },
];

const LINUX_SECTIONS = [
  { title: 'Navigating files', rows: [
    ['ls -la', 'List all files with permissions and sizes.'],
    ['cd <dir>', 'Change directory.'],
    ['pwd', 'Print the current directory path.'],
    ['tree', 'Directory tree view (may need install).'],
    ['find . -name "*.js"', 'Find files by name pattern.'],
    ['locate <file>', 'Quick file search from the index.'],
  ] },
  { title: 'Working with files', rows: [
    ['cp -r src dest', 'Copy files or folders recursively.'],
    ['mv old new', 'Move or rename.'],
    ['rm -rf dir', 'Delete forcefully — be careful!'],
    ['mkdir -p a/b/c', 'Create nested folders.'],
    ['touch file.txt', 'Create an empty file / update timestamp.'],
    ['ln -s target link', 'Create a symbolic link.'],
  ] },
  { title: 'Viewing & searching', rows: [
    ['cat file', 'Print the whole file.'],
    ['less file', 'Scroll through a large file (q to quit).'],
    ['head -n 20 file', 'First 20 lines.'],
    ['tail -f log.txt', 'Follow a file live — great for logs.'],
    ['grep -rn "text" .', 'Search text recursively, with line numbers.'],
    ['wc -l file', 'Count lines (also words/bytes).'],
    ['sort | uniq -c', 'Sort lines and count duplicates.'],
  ] },
  { title: 'Permissions & processes', rows: [
    ['chmod +x script.sh', 'Make a script executable.'],
    ['chmod 755 file', 'rwx for owner, rx for everyone.'],
    ['chown user:group file', 'Change ownership.'],
    ['ps aux', 'List running processes.'],
    ['top / htop', 'Live process monitor.'],
    ['kill -9 <pid>', 'Force-kill a process.'],
    ['jobs / fg / bg', 'Manage background jobs.'],
  ] },
  { title: 'Networking', rows: [
    ['curl <url>', 'Fetch a URL from the terminal.'],
    ['wget <url>', 'Download a file.'],
    ['ping host', 'Test connectivity.'],
    ['ss -tulpn', 'Show open ports and sockets.'],
    ['ip a', 'Show network interfaces and IPs.'],
    ['ssh user@host', 'Log into another machine securely.'],
    ['scp file user@host:~/', 'Copy files over SSH.'],
  ] },
  { title: 'System & package managers', rows: [
    ['sudo apt update && upgrade', 'Debian/Ubuntu system update.'],
    ['sudo apt install <pkg>', 'Install a package.'],
    ['df -h', 'Disk space per filesystem.'],
    ['du -sh *', 'Size of each item in the folder.'],
    ['free -h', 'Memory usage.'],
    ['uname -a', 'Kernel and system info.'],
    ['history | grep "cmd"', 'Search your own command history.'],
  ] },
];

const NPM_SECTIONS = [
  { title: 'Starting out', rows: [
    ['npm init', 'Create package.json interactively.'],
    ['npm init -y', 'Create package.json with defaults.'],
    ['npm install / npm i', 'Install every dependency from package.json.'],
    ['npm install <pkg>', 'Add a package to dependencies.'],
    ['npm install -D <pkg>', 'Add a package to devDependencies.'],
    ['npm uninstall <pkg>', 'Remove a package.'],
  ] },
  { title: 'Running & updating', rows: [
    ['npm run <script>', 'Run a script defined in package.json.'],
    ['npm start / npm test', 'Common shortcuts for start/test scripts.'],
    ['npm update', 'Update packages within semver ranges.'],
    ['npm outdated', 'See which packages have newer versions.'],
    ['npm audit', 'Check for known security issues.'],
    ['npm audit fix', 'Automatically fix vulnerabilities.'],
  ] },
  { title: 'Global & npx', rows: [
    ['npm install -g <pkg>', 'Install globally (available everywhere).'],
    ['npx <tool>', 'Run a package without installing it.'],
    ['npx create-vite@latest', 'Scaffold a new Vite project.'],
    ['npm cache clean --force', 'Clear the npm cache.'],
  ] },
  { title: 'Yarn equivalents', rows: [
    ['yarn / yarn install', 'Install dependencies.'],
    ['yarn add <pkg> / yarn add -D <pkg>', 'Add packages.'],
    ['yarn remove <pkg>', 'Remove a package.'],
    ['yarn <script>', 'Run a package script.'],
    ['yarn upgrade-interactive', 'Update with a visual picker.'],
    ['yarn why <pkg>', 'Explain why a package is installed.'],
  ] },
];

const VSCODE_SECTIONS = [
  { title: 'Editing', rows: [
    ['Ctrl + D', 'Select next occurrence (multi-cursor).'],
    ['Ctrl + Shift + L', 'Select all occurrences.'],
    ['Alt + ↑ / ↓', 'Move line up or down.'],
    ['Shift + Alt + ↓', 'Copy line down.'],
    ['Ctrl + /', 'Toggle line comment.'],
    ['Ctrl + Shift + K', 'Delete whole line.'],
    ['Ctrl + Space', 'Trigger suggestions.'],
  ] },
  { title: 'Navigation', rows: [
    ['Ctrl + P', 'Quick open any file by name.'],
    ['Ctrl + G', 'Go to line number.'],
    ['Ctrl + Shift + O', 'Go to symbol in file.'],
    ['Ctrl + T', 'Search symbols across the project.'],
    ['F12', 'Jump to definition.'],
    ['Alt + ← / →', 'Go back / forward.'],
    ['Ctrl + Shift + F', 'Search across all files.'],
    ['Ctrl + Shift + H', 'Replace across all files.'],
  ] },
  { title: 'Windows & panels', rows: [
    ['Ctrl + `', 'Toggle terminal.'],
    ['Ctrl + B', 'Toggle sidebar.'],
    ['Ctrl + \\', 'Split editor.'],
    ['Ctrl + Shift + P', 'Command palette — everything lives here.'],
    ['Ctrl + ,', 'Open settings.'],
    ['Ctrl + K Z', 'Zen mode.'],
    ['Alt + Shift + F', 'Format document.'],
  ] },
];

const HTTP_SECTIONS = [
  { title: '2xx — Success', rows: [
    ['200 OK', 'Request succeeded — the standard happy path.'],
    ['201 Created', 'A new resource was created (common after POST).'],
    ['202 Accepted', 'Accepted for processing, not finished yet.'],
    ['204 No Content', 'Success with no body — great for DELETE.'],
    ['206 Partial Content', 'Range request succeeded (downloads/video).'],
  ] },
  { title: '3xx — Redirection', rows: [
    ['301 Moved Permanently', 'Resource has a new permanent URL.'],
    ['302 Found', 'Temporary redirect.'],
    ['303 See Other', 'Redirect to a result page (often after POST).'],
    ['304 Not Modified', 'Cached version is still fresh — use cache.'],
    ['307 / 308', 'Preserve the method across the redirect.'],
  ] },
  { title: '4xx — Client errors', rows: [
    ['400 Bad Request', 'Server cannot understand the request.'],
    ['401 Unauthorized', 'Not authenticated — log in first.'],
    ['403 Forbidden', 'Authenticated but not allowed.'],
    ['404 Not Found', 'URL does not exist.'],
    ['405 Method Not Allowed', 'Wrong HTTP method for this URL.'],
    ['408 Request Timeout', 'Client took too long.'],
    ['409 Conflict', 'State conflict (e.g. duplicate resource).'],
    ['410 Gone', 'Permanently removed.'],
    ['422 Unprocessable Entity', 'Syntax is fine but validation failed.'],
    ['429 Too Many Requests', 'Rate limit hit — slow down.'],
  ] },
  { title: '5xx — Server errors', rows: [
    ['500 Internal Server Error', 'Generic server-side failure.'],
    ['501 Not Implemented', 'Server lacks the feature.'],
    ['502 Bad Gateway', 'Upstream server sent an invalid reply.'],
    ['503 Service Unavailable', 'Overloaded or in maintenance.'],
    ['504 Gateway Timeout', 'Upstream took too long.'],
  ] },
];

const PY_SECTIONS = [
  { title: 'Basics', rows: [
    ['x = 5  # int, float, str, bool', 'Dynamic typing — variables hold any value.'],
    ['name = "Ada"\nf = f"Hi {name}"', 'f-strings are the modern way to format text.'],
    ['if x > 0:\n    print("pos")\nelif x == 0:\n    print("zero")\nelse:\n    print("neg")', 'Indentation defines blocks — no braces.'],
    ['for i in range(5):\n    print(i)', 'Loop over a range (0..4).'],
    ['while x > 0:\n    x -= 1', 'Loop while a condition holds.'],
  ] },
  { title: 'Data structures', rows: [
    ['lst = [1, 2, 3]', 'Lists — ordered, changeable.'],
    ['lst.append(4); lst[0]; lst[-1]', 'Append and index (negative = from end).'],
    ['lst[1:3]; lst[::2]', 'Slicing: start:stop:step.'],
    ['d = {"a": 1, "b": 2}', 'Dictionaries — key/value maps.'],
    ['d.get("c", default)', 'Safe access with a fallback.'],
    ['st = {1, 2, 3}; tp = (1, 2)', 'Sets (unique) and tuples (immutable).'],
    ['[x**2 for x in range(5)]', 'List comprehensions — concise transforms.'],
  ] },
  { title: 'Functions & modules', rows: [
    ['def greet(name, greeting="Hi"):', 'Define with default arguments.'],
    ['def fn(*args, **kwargs):', 'Accept any positional and keyword args.'],
    ['lambda x: x * 2', 'Small anonymous functions.'],
    ['import math\nfrom os import path', 'Import modules or specific names.'],
    ['try:\n    ...\nexcept ValueError as e:\n    print(e)', 'Handle errors gracefully.'],
  ] },
  { title: 'Files & classes', rows: [
    ['with open("f.txt") as fh:\n    data = fh.read()', 'Files auto-close with `with`.'],
    ['class Dog:\n    def __init__(self, name):\n        self.name = name', 'Classes and constructors.'],
    ['class Puppy(Dog):\n    ...', 'Inheritance.'],
    ['json.load(f) / json.dump(d, f)', 'Read and write JSON.'],
  ] },
];

const JS_SECTIONS = [
  { title: 'Basics', rows: [
    ['let x = 5; const y = 10;', 'Prefer const, use let when reassigning. Avoid var.'],
    ['`Hi ${name}`', 'Template literals with backticks.'],
    ['typeof x; x ?? "default"; x?.y', 'Type checks, nullish default, optional chaining.'],
    ['if (x > 0) { } else { }', 'Blocks use braces.'],
    ['for (const item of array) { }', 'Loop over iterables.'],
    ['array.forEach / map / filter / reduce', 'Functional array methods you will use daily.'],
  ] },
  { title: 'Functions', rows: [
    ['function add(a, b) { return a + b; }', 'Classic function declaration.'],
    ['const add = (a, b) => a + b;', 'Arrow functions — short and lexically bound `this`.'],
    ['function fn(a = 1, ...rest) {}', 'Default and rest parameters.'],
    ['const { name, age } = person;', 'Destructuring from objects.'],
    ['const [first, second] = arr;', 'Destructuring from arrays.'],
    ['const copy = { ...obj, extra: 1 };', 'Spread — create copies and merge.'],
  ] },
  { title: 'Async JavaScript', rows: [
    ['await fetch(url); await res.json();', 'Modern async requests.'],
    ['async function fn() { ... }', 'Functions that can use await.'],
    ['Promise.all([p1, p2])', 'Run promises in parallel.'],
    ['Promise.race / allSettled / any', 'Other combinators.'],
    ['setTimeout(fn, 1000); setInterval(fn, 1000)', 'Timers.'],
    ['try { await risky(); } catch (e) { }', 'Handle async errors with try/catch.'],
  ] },
  { title: 'Objects & classes', rows: [
    ['const obj = { key: "value", method() {} }', 'Object literals and methods.'],
    ['obj.key; obj["key"]; obj?.missing', 'Property access styles.'],
    ['class Dog { constructor(n) { this.n = n; } }', 'ES classes.'],
    ['class Puppy extends Dog {}', 'Inheritance.'],
    ['Object.keys/values/entries(obj)', 'Iterate object data.'],
    ['JSON.stringify / JSON.parse', 'Convert to/from JSON text.'],
  ] },
];

const TS_SECTIONS = [
  { title: 'Types', rows: [
    ['let x: number = 5;', 'Basic type annotations.'],
    ['type ID = string | number;', 'Union types — one or the other.'],
    ['type User = { name: string; age?: number };', 'Optional properties with ?.'],
    ['type Pair<T> = { a: T; b: T };', 'Generics — reusable typed shapes.'],
    ['function fn(x: string): void {}', 'Parameter and return types.'],
    ['const dir: "up" | "down";', 'Literal types.'],
  ] },
  { title: 'Interfaces & classes', rows: [
    ['interface User { name: string; }', 'Describe object shapes (extensible).'],
    ['interface Admin extends User { role: string; }', 'Extend interfaces.'],
    ['class Point implements Shape {}', 'Classes can implement contracts.'],
    ['private x; public y; readonly z;', 'Member visibility and immutability.'],
  ] },
  { title: 'Everyday patterns', rows: [
    ['as const / satisfies', 'Narrow types without widening.'],
    ['typeof obj / keyof T', 'Type-level operators.'],
    ['Record<K, V> / Partial<T> / Pick<T, K>', 'Built-in utility types.'],
    ['try { } catch (e: unknown) {}', 'Typed error handling.'],
    ['enum Color { Red, Green }', 'Enumerations (or use union literals).'],
    ['// @ts-expect-error', 'Suppress one line deliberately.'],
  ] },
];

const REACT_SECTIONS = [
  { title: 'Components', rows: [
    ['function Hello({ name }) { return <h1>Hi {name}</h1>; }', 'Function components with props.'],
    ['export default function App() {}', 'One component per file, exported.'],
    ['<Hello name="Ada" />', 'Pass props like HTML attributes.'],
    ['{items.map(i => <Item key={i.id} {...i} />)}', 'Render lists — keys must be stable.'],
    ['{isLoading && <Spinner />}', 'Conditional rendering.'],
  ] },
  { title: 'Hooks', rows: [
    ['const [n, setN] = useState(0);', 'Local state.'],
    ['useEffect(() => { ... }, [dep]);', 'Run side effects when deps change.'],
    ['const val = useMemo(() => heavy(a), [a]);', 'Cache expensive calculations.'],
    ['const fn = useCallback(() => ..., [dep]);', 'Cache function identity.'],
    ['const ref = useRef(null);', 'Mutable value that survives renders / DOM node.'],
    ['const ctx = useContext(ThemeCtx);', 'Read shared context.'],
    ['function useUser(id) { ... }', 'Custom hooks — share stateful logic.'],
  ] },
  { title: 'Mental model', rows: [
    ['State updates are async', 'setN(n + 1) schedules — use updater form setN(x => x + 1) when needed.'],
    ['Props flow down, events bubble up', 'Children call parent functions via props.'],
    ['Re-render ≠ DOM update', 'React diffs and only touches what changed.'],
    ['Lift state up', 'Shared state belongs to the closest common parent.'],
    ['Effects are for sync, not data shaping', 'Compute during render; use effects for the outside world.'],
  ] },
];

const SQL_SECTIONS = [
  { title: 'Querying', rows: [
    ['SELECT col1, col2 FROM t;', 'Pick columns from a table.'],
    ['SELECT * FROM t WHERE age > 18;', 'Filter rows.'],
    ['SELECT DISTINCT city FROM t;', 'Unique values only.'],
    ['SELECT * FROM t ORDER BY name DESC;', 'Sort results.'],
    ['SELECT * FROM t LIMIT 10 OFFSET 20;', 'Paginate results.'],
    ['SELECT * FROM t WHERE name LIKE \'A%\';', 'Pattern matching (% = any run).'],
    ['SELECT * FROM t WHERE id IN (1,2,3);', 'Match a set of values.'],
  ] },
  { title: 'Aggregation', rows: [
    ['SELECT city, COUNT(*) FROM t GROUP BY city;', 'Group and count.'],
    ['SELECT dept, AVG(salary) FROM t GROUP BY dept HAVING AVG(salary) > 50000;', 'Filter groups with HAVING.'],
    ['SELECT MIN/MAX/SUM/AVG(col) FROM t;', 'Common aggregate functions.'],
  ] },
  { title: 'Joins', rows: [
    ['SELECT * FROM a JOIN b ON a.id = b.a_id;', 'INNER join — matching rows only.'],
    ['SELECT * FROM a LEFT JOIN b ON ...;', 'LEFT join — keep all rows from a.'],
    ['SELECT * FROM a RIGHT JOIN b ON ...;', 'RIGHT join — keep all rows from b.'],
    ['SELECT * FROM a FULL OUTER JOIN b ON ...;', 'Keep rows from both sides.'],
  ] },
  { title: 'Changing data', rows: [
    ['INSERT INTO t (a, b) VALUES (1, 2);', 'Add a row.'],
    ['UPDATE t SET a = 1 WHERE id = 5;', 'Change rows — always include WHERE!'],
    ['DELETE FROM t WHERE id = 5;', 'Remove rows — also needs WHERE.'],
    ['CREATE TABLE t (id INT PRIMARY KEY, name TEXT);', 'Define a table.'],
    ['ALTER TABLE t ADD col DATE;', 'Add a column.'],
  ] },
];

const DS_SECTIONS = [
  { title: 'Complexity cheat table', rows: [
    ['O(1)', 'Constant — array index, hash map lookup.'],
    ['O(log n)', 'Logarithmic — binary search, balanced tree ops.'],
    ['O(n)', 'Linear — single pass through a list.'],
    ['O(n log n)', 'Linearithmic — good sorts (merge, heap, quick avg).'],
    ['O(n²)', 'Quadratic — nested loops, bubble/insertion sort.'],
    ['O(2ⁿ)', 'Exponential — naive recursive subsets/fib.'],
  ] },
  { title: 'Arrays & strings', rows: [
    ['Access / push', 'O(1) access by index; push is amortised O(1).'],
    ['Search / insert middle', 'O(n) — must shift or scan.'],
    ['When to use', 'Ordered data, index access, iteration, small sizes.'],
  ] },
  { title: 'Hash maps / sets', rows: [
    ['Lookup / insert / delete', 'Average O(1), worst O(n) with collisions.'],
    ['When to use', 'Counts, dedupe, fast membership, grouping.'],
  ] },
  { title: 'Stacks & queues', rows: [
    ['Stack (LIFO)', 'O(1) push/pop — undo, parsing, DFS.'],
    ['Queue (FIFO)', 'O(1) enqueue/dequeue — scheduling, BFS.'],
  ] },
  { title: 'Trees & graphs', rows: [
    ['Binary search tree', 'O(log n) average ops when balanced.'],
    ['Heap / priority queue', 'O(log n) push/pop — top-k, scheduling.'],
    ['Graph BFS', 'O(V+E) — shortest path in unweighted graphs.'],
    ['Graph DFS', 'O(V+E) — cycles, components, topological sort.'],
  ] },
];

const BRAILLE_MAP = {
  a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑', f: '⠋', g: '⠛', h: '⠓', i: '⠊', j: '⠚',
  k: '⠅', l: '⠇', m: '⠍', n: '⠝', o: '⠕', p: '⠏', q: '⠟', r: '⠗', s: '⠎', t: '⠞',
  u: '⠥', v: '⠧', w: '⠺', x: '⠭', y: '⠽', z: '⠵', ' ': ' ', '.': '⠲', ',': '⠂', '?': '⠦', '!': '⠖', '-': '⠤', ':': '⠒', ';': '⠆', '/': '⠌', '@': '⠈⠁', '#': '⠼',
};
const BRAILLE_REVERSE = Object.fromEntries(Object.entries(BRAILLE_MAP).map(([k, v]) => [v, k]));
const GITIGNORE_PRESETS = {
  Node: ['node_modules/', 'dist/', '.env', '.DS_Store', '*.log', 'coverage/'],
  Python: ['__pycache__/', '*.pyc', '.venv/', '.pytest_cache/', '.env', '.mypy_cache/'],
  Java: ['target/', '*.class', '.idea/', '.project', '.settings/'],
  React: ['node_modules/', 'dist/', 'build/', '.env.local', '.DS_Store'],
  Go: ['bin/', 'pkg/', '*.test', '.env'],
  Rust: ['target/', 'Cargo.lock', '.env'],
  macOS: ['.DS_Store', '._*', '.Spotlight-V100', '.Trashes'],
};
const HTTP_METHOD_HEADER_SECTIONS = [
  { title: 'Methods', rows: [['GET', 'Fetch data without changing server state.'], ['POST', 'Create or submit data.'], ['PUT', 'Replace a resource.'], ['PATCH', 'Partially update a resource.'], ['DELETE', 'Remove a resource.'], ['HEAD', 'Fetch headers only.'], ['OPTIONS', 'Discover allowed methods / CORS info.']] },
  { title: 'Common headers', rows: [['Content-Type', 'Describes the request or response body format.'], ['Accept', 'Tells the server which response formats are okay.'], ['Authorization', 'Sends credentials such as Bearer tokens.'], ['Cache-Control', 'Controls caching in browsers and CDNs.'], ['User-Agent', 'Identifies the client making the request.'], ['Origin', 'Shows the browser origin for CORS checks.'], ['Set-Cookie', 'Tells the browser to store a cookie.'], ['ETag', 'A response version tag for efficient caching.']] },
];
const DESIGN_PATTERN_SECTIONS = [
  { title: 'Creational', rows: [['Factory', 'Create objects without exposing the exact class.'], ['Builder', 'Construct complex objects step by step.'], ['Singleton', 'Exactly one shared instance — use sparingly.'], ['Prototype', 'Clone existing objects quickly.']] },
  { title: 'Structural', rows: [['Adapter', 'Make incompatible interfaces work together.'], ['Decorator', 'Add behaviour without changing the original class.'], ['Facade', 'Provide one simple interface over many moving parts.'], ['Proxy', 'Control access to another object.']] },
  { title: 'Behavioral', rows: [['Observer', 'Notify subscribers when state changes.'], ['Strategy', 'Swap algorithms at runtime behind one interface.'], ['Command', 'Wrap actions as objects so they can be queued/undone.'], ['State', 'Change behaviour when internal state changes.'], ['Template Method', 'A fixed algorithm with overridable steps.']] },
];
const MARKDOWN_CHEATSHEET_SECTIONS = [
  { title: 'Text', rows: [['# Heading 1', 'Top-level heading'], ['## Heading 2', 'Second-level heading'], ['**bold**', 'Bold text'], ['*italic*', 'Italic text'], ['`inline code`', 'Inline code styling']] },
  { title: 'Lists & quotes', rows: [['- item', 'Bulleted list item'], ['1. item', 'Ordered list item'], ['> quote', 'Blockquote'], ['---', 'Horizontal rule']] },
  { title: 'Links & media', rows: [['[label](url)', 'Link syntax'], ['![alt](image.png)', 'Image syntax'], ['[x] task', 'GitHub task list item']] },
  { title: 'Tables & code blocks', rows: [['```js', 'Start a fenced code block'], ['| A | B |', 'Basic table row'], ['| --- | --- |', 'Table header separator']] },
];

function tsType(value, name = 'Root') {
  if (Array.isArray(value)) {
    if (!value.length) return 'unknown[]';
    return `${tsType(value[0], name)}[]`;
  }
  if (value && typeof value === 'object') {
    const lines = Object.entries(value).map(([key, val]) => `  ${key}: ${tsType(val, key)};`);
    return `\n{\n${lines.join('\n')}\n}`;
  }
  if (value === null) return 'null';
  return typeof value;
}

function nextCronRuns(expr, count = 5) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error('Use 5 cron parts: minute hour day month weekday');
  const [min, hour, day, month, weekday] = parts;
  const parse = (value, current, minVal, maxVal) => {
    if (value === '*') return true;
    if (/^\*\/(\d+)$/.test(value)) return current % Number(RegExp.$1) === 0;
    return value.split(',').some((piece) => {
      if (/^(\d+)-(\d+)$/.test(piece)) return current >= Number(RegExp.$1) && current <= Number(RegExp.$2);
      return current === Number(piece);
    });
  };
  const now = new Date();
  now.setSeconds(0, 0);
  const out = [];
  const cursor = new Date(now);
  for (let i = 0; i < 50000 && out.length < count; i++) {
    cursor.setMinutes(cursor.getMinutes() + 1);
    if (
      parse(min, cursor.getMinutes(), 0, 59) &&
      parse(hour, cursor.getHours(), 0, 23) &&
      parse(day, cursor.getDate(), 1, 31) &&
      parse(month, cursor.getMonth() + 1, 1, 12) &&
      parse(weekday, cursor.getDay(), 0, 6)
    ) out.push(new Date(cursor));
  }
  return out;
}

/* ──────────────────────── TOOL DEFINITIONS ──────────────────────── */
export const CODING_IMPLS = {

  /* 1 ── Playground */
  'code-playground': {
    mount(container) {
      const tabs = [['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript']];
      const areas = {
        html: el('textarea.textarea.code-area', { html: '' }),
        css: el('textarea.textarea.code-area', { html: '' }),
        js: el('textarea.textarea.code-area', { html: '' }),
      };
      areas.html.value = `<div class="card-demo">\n  <h1>Hello, PSDKIT 👋</h1>\n  <p>Edit the code and see it live.</p>\n  <button id="btn">Click me</button>\n</div>`;
      areas.css.value = `.card-demo {\n  font-family: sans-serif;\n  text-align: center;\n  padding: 40px;\n  background: #F5EFE6;\n}\nbutton {\n  background: #DE5D35;\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 999px;\n  font-size: 16px;\n  cursor: pointer;\n}`;
      areas.js.value = `let count = 0;\ndocument.getElementById('btn').addEventListener('click', () => {\n  count++;\n  alert('Clicked ' + count + ' time(s)!');\n});`;

      const iframe = el('iframe.preview-frame', {
        sandbox: 'allow-scripts',
        style: { height: '340px', background: '#fff', border: '1.5px solid var(--cream-line)', borderRadius: '14px', width: '100%' },
      });
      let active = 'html';
      const tabRow = el('div.wrap-gap-sm');
      const show = (k) => {
        active = k;
        for (const [key, area] of Object.entries(areas)) {
          area.style.display = key === k ? 'block' : 'none';
        }
        tabRow.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.k === k));
      };
      for (const [k, label] of tabs) {
        tabRow.append(el('button.chip', { dataset: { k }, text: label, onclick: () => show(k) }));
      }
      const run = debounce(() => {
        const src = `<!DOCTYPE html><html><head><style>${areas.css.value}</style></head><body>${areas.html.value}<script>try{${areas.js.value}}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style="color:#c00;padding:12px">'+e+'</pre>')}<\/script></body></html>`;
        iframe.srcdoc = src;
      }, 500);

      Object.values(areas).forEach((a) => {
        a.addEventListener('input', run);
        a.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = a.selectionStart;
            a.value = a.value.slice(0, s) + '  ' + a.value.slice(a.selectionEnd);
            a.selectionStart = a.selectionEnd = s + 2;
          }
        });
      });

      container.append(
        tabRow,
        el('div.mt-2', areas.html, areas.css, areas.js),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: `${icon('play', 16)} Run`, onclick: run }),
          el('button.btn.btn-soft', {
            html: `${icon('download', 15)} Export HTML file`,
            onclick: () => downloadFile('psdkit-playground.html', `<!DOCTYPE html><html><head><style>${areas.css.value}</style></head><body>${areas.html.value}<script>${areas.js.value}<\/script></body></html>`, 'text/html'),
          }),
        ),
        el('div.field-label.mt-3', { text: 'Live preview' }),
        iframe,
      );
      show('html');
      run();
    },
  },

  /* 2 ── JS console */
  'js-console': {
    mount(container) {
      const out = el('div.result-card');
      const outBody = el('div.result-body', { style: { minHeight: '140px', maxHeight: '320px', overflow: 'auto' } });
      out.append(el('div.result-head', el('span.result-title', { text: 'Console output' })), outBody);
      const ta = el('textarea.textarea.code-area', { rows: 5 });
      ta.value = `const nums = [1, 2, 3, 4, 5];\nnums.map(n => n * n).join(', ');`;
      const runCode = () => {
        outBody.innerHTML = '';
        const log = (type, args) => {
          outBody.append(el('div', {
            style: {
              padding: '8px 12px', marginBottom: '6px', borderRadius: '10px',
              background: type === 'error' ? 'var(--blush)' : 'var(--cream)',
              fontFamily: 'ui-monospace, monospace', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            },
            text: args.map((a) => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
          }));
        };
        try {
          const result = new Function('console', `"use strict"; return (() => { ${ta.value.includes('return') ? ta.value : `return (${ta.value})` } })()`)({
            log: (...a) => log('log', a),
            warn: (...a) => log('warn', a),
            error: (...a) => log('error', a),
          });
          if (result !== undefined) log('log', [result]);
        } catch (e) {
          try {
            new Function('console', `"use strict"; ${ta.value}`)({ log: (...a) => log('log', a), warn: (...a) => log('warn', a), error: (...a) => log('error', a) });
          } catch (e2) {
            log('error', [e2.message]);
          }
        }
      };
      container.append(
        el('div.note', { html: icon('shield', 17) + '<span>Code runs in a sandboxed function inside your browser tab — nothing is sent to any server.</span>' }),
        el('div.mt-2', ta),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: `${icon('play', 16)} Run code`, onclick: runCode }),
          el('button.btn.btn-soft', { html: `${icon('trash', 15)} Clear output`, onclick: () => (outBody.innerHTML = '') }),
        ),
        el('div.mt-3', out),
      );
      runCode();
    },
  },

  /* 3 ── JSON formatter */
  'json-format': {
    fields: [
      { id: 'json', label: 'JSON input', type: 'textarea', rows: 9, default: '{"tool":"PSDKIT Pro","tools":150,"free":true,"tags":["daily","internet","coding"]}' },
      { id: 'indent', label: 'Indent', type: 'select', options: [['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tab']], half: true },
    ],
    compute(v) {
      if (!v.json?.trim()) return 'Paste some JSON first.';
      try {
        const obj = JSON.parse(v.json);
        const indent = v.indent === 'tab' ? '\t' : Number(v.indent) || 2;
        const pretty = JSON.stringify(obj, null, indent);
        return {
          title: '✅ Valid JSON',
          html: `<pre class="code" style="max-height:420px;overflow:auto">${pretty.replace(/</g, '&lt;')}</pre>`,
          copy: pretty,
          text: `Valid JSON · ${pretty.length} chars formatted · minified: ${JSON.stringify(obj).length} chars`,
          downloadText: pretty,
          downloadName: 'formatted.json',
        };
      } catch (e) {
        return { title: '❌ Invalid JSON', text: `Parse error:\n${e.message}`, note: 'Tip: JSON needs double quotes around keys and strings — no trailing commas.' };
      }
    },
  },

  /* 4 ── JSON ⇄ YAML */
  'json-yaml': {
    mount(container) {
      const ta = el('textarea.textarea.code-area', { rows: 9 });
      ta.value = `{\n  "name": "PSDKIT Pro",\n  "tools": 150,\n  "categories": ["daily", "internet", "essentials", "coding"]\n}`;
      const out = el('div');
      const toYaml = (obj, indent = 0) => {
        const pad = '  '.repeat(indent);
        if (Array.isArray(obj)) {
          return obj.map((v) => {
            if (v && typeof v === 'object') return `${pad}- ${toYaml(v, indent + 1).replace(/^\s+/, '')}`;
            return `${pad}- ${JSON.stringify(v)}`;
          }).join('\n');
        }
        return Object.entries(obj).map(([k, v]) => {
          if (v && typeof v === 'object') return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
          return `${pad}${k}: ${JSON.stringify(v)}`;
        }).join('\n');
      };
      const fromYaml = (text) => {
        // Minimal YAML→JSON for flat/nested maps & lists (common cases)
        const lines = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
        const root = {};
        const stack = [{ indent: -1, obj: root }];
        for (const raw of lines) {
          const indent = raw.match(/^\s*/)[0].length;
          const line = raw.trim();
          if (line.startsWith('- ')) {
            const parent = stack[stack.length - 1].obj;
            const arr = Array.isArray(parent) ? parent : (stack[stack.length - 1].lastArr = []);
            if (!Array.isArray(parent)) {
              const key = stack[stack.length - 1].lastKey;
              parent[key] = arr;
              stack.push({ indent, obj: arr });
            }
            let val = line.slice(2).trim();
            if (val.includes(': ') && !val.startsWith('"')) {
              const obj = {};
              const [k, ...rest] = val.split(': ');
              obj[k.trim()] = parseScalar(rest.join(': '));
              arr.push(obj);
            } else arr.push(parseScalar(val));
            continue;
          }
          const m = line.match(/^([^:]+):\s*(.*)$/);
          if (!m) continue;
          const key = m[1].trim().replace(/^["']|["']$/g, '');
          const val = m[2].trim();
          while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
          const parent = stack[stack.length - 1].obj;
          if (!val) {
            parent[key] = {};
            stack.push({ indent, obj: parent[key], lastKey: key });
          } else {
            parent[key] = parseScalar(val);
            stack[stack.length - 1].lastKey = key;
          }
        }
        return root;
      };
      const parseScalar = (s) => {
        s = s.trim().replace(/^["']|["']$/g, '');
        if (s === 'true') return true;
        if (s === 'false') return false;
        if (s === 'null') return null;
        if (!isNaN(Number(s)) && s !== '') return Number(s);
        return s;
      };
      const render = (mode) => {
        try {
          out.innerHTML = '';
          if (mode === 'yaml') {
            const obj = JSON.parse(ta.value);
            const y = toYaml(obj);
            out.append(el('div.result-card',
              el('div.result-head', el('span.result-title', { text: 'YAML output' }), copyButton(y)),
              el('div.result-body', el('pre.code', { text: y })),
            ));
          } else {
            const obj = fromYaml(ta.value);
            const j = JSON.stringify(obj, null, 2);
            out.append(el('div.result-card',
              el('div.result-head', el('span.result-title', { text: 'JSON output' }), copyButton(j)),
              el('div.result-body', el('pre.code', { text: j })),
            ));
          }
        } catch (e) {
          out.innerHTML = '';
          out.append(el('div.note', { html: icon('info', 17) + `<span>Conversion failed: ${e.message}</span>` }));
        }
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'Input (JSON or YAML)' }), ta),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: '→ YAML', onclick: () => render('yaml') }),
          el('button.btn.btn-soft', { html: '→ JSON', onclick: () => render('json') }),
        ),
        el('div.mt-3', out),
      );
      render('yaml');
    },
  },

  /* 5 ── JSON ⇄ CSV */
  'json-csv': {
    mount(container) {
      const ta = el('textarea.textarea.code-area', { rows: 8 });
      ta.value = `[\n  {"name": "Ada", "role": "Engineer", "years": 10},\n  {"name": "Linus", "role": "Kernel", "years": 30},\n  {"name": "Grace", "role": "Admiral", "years": 45}\n]`;
      const out = el('div');
      const render = (mode) => {
        try {
          out.innerHTML = '';
          if (mode === 'csv') {
            const arr = JSON.parse(ta.value);
            const cols = [...new Set(arr.flatMap((o) => Object.keys(o)))];
            const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csv = [cols.join(','), ...arr.map((o) => cols.map((c) => esc(o[c])).join(','))].join('\n');
            out.append(el('div.result-card',
              el('div.result-head', el('span.result-title', { text: 'CSV output' }), copyButton(csv)),
              el('div.result-body', el('pre.code', { text: csv })),
            ));
          } else {
            const lines = ta.value.trim().split('\n');
            const cols = lines[0].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            const rows = lines.slice(1).map((l) => {
              const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
              const obj = {};
              cols.forEach((c, i) => {
                const raw = (cells[i] || '').replace(/,$/, '').trim();
                const val = raw.replace(/^"|"$/g, '').replace(/""/g, '"');
                obj[c] = isNaN(Number(val)) || val === '' ? val : Number(val);
              });
              return obj;
            });
            const j = JSON.stringify(rows, null, 2);
            out.append(el('div.result-card',
              el('div.result-head', el('span.result-title', { text: 'JSON output' }), copyButton(j)),
              el('div.result-body', el('pre.code', { text: j })),
            ));
          }
        } catch (e) {
          out.innerHTML = '';
          out.append(el('div.note', { html: icon('info', 17) + `<span>Conversion failed: ${e.message}. For JSON→CSV, input must be an array of objects.</span>` }));
        }
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'Input (JSON array or CSV)' }), ta),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: 'JSON → CSV', onclick: () => render('csv') }),
          el('button.btn.btn-soft', { html: 'CSV → JSON', onclick: () => render('json') }),
        ),
        el('div.mt-3', out),
      );
      render('csv');
    },
  },

  /* 6 ── XML formatter */
  'xml-format': {
    fields: [
      { id: 'xml', label: 'XML input', type: 'textarea', rows: 9, default: '<note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>' },
    ],
    compute(v) {
      if (!v.xml?.trim()) return 'Paste some XML first.';
      try {
        const doc = new DOMParser().parseFromString(v.xml, 'text/xml');
        const err = doc.querySelector('parsererror');
        if (err) return { title: '❌ Invalid XML', text: err.textContent.trim().slice(0, 400) };
        const pretty = prettyXML(v.xml);
        return {
          title: '✅ Valid XML',
          html: `<pre class="code" style="max-height:420px;overflow:auto">${pretty.replace(/</g, '&lt;')}</pre>`,
          copy: pretty,
          text: pretty,
        };
      } catch (e) {
        return `XML error: ${e.message}`;
      }
    },
  },

  /* 7 ── HTML formatter */
  'html-format': {
    fields: [
      { id: 'code', label: 'HTML input', type: 'textarea', rows: 9, default: '<div class="a"><p>Hello <strong>world</strong></p><br></div>' },
      { id: 'mode', label: 'Mode', type: 'select', options: [['beautify', 'Beautify / indent'], ['minify', 'Minify (shrink)']], half: true },
    ],
    live: false,
    buttonLabel: 'Format HTML',
    async compute(v) {
      if (!v.code?.trim()) return 'Paste some HTML first.';
      if (v.mode === 'minify') {
        const min = minifyGeneric(v.code, 'html');
        return {
          title: `Minified — saved ${Math.round((1 - min.length / v.code.length) * 100) || 0}%`,
          html: `<pre class="code" style="max-height:420px;overflow:auto">${min.replace(/</g, '&lt;')}</pre>`,
          copy: min,
          text: min,
        };
      }
      const pretty = (await loadHtmlBeautify())(v.code, { indent_size: 2, wrap_line_length: 0 });
      return {
        title: 'Formatted HTML',
        html: `<pre class="code" style="max-height:420px;overflow:auto">${pretty.replace(/</g, '&lt;')}</pre>`,
        copy: pretty,
        text: pretty,
      };
    },
  },

  /* 8 ── CSS formatter */
  'css-format': {
    fields: [
      { id: 'code', label: 'CSS input', type: 'textarea', rows: 9, default: '.card{background:#F5EFE6;padding:20px;border-radius:16px}.card h1{color:#DE5D35;margin:0}' },
      { id: 'mode', label: 'Mode', type: 'select', options: [['beautify', 'Beautify / indent'], ['minify', 'Minify (shrink)']], half: true },
    ],
    live: false,
    buttonLabel: 'Format CSS',
    async compute(v) {
      if (!v.code?.trim()) return 'Paste some CSS first.';
      if (v.mode === 'minify') {
        const min = minifyGeneric(v.code, 'css');
        return {
          title: `Minified — saved ${Math.round((1 - min.length / v.code.length) * 100) || 0}%`,
          html: `<pre class="code">${min.replace(/</g, '&lt;')}</pre>`,
          copy: min,
          text: min,
        };
      }
      const pretty = (await loadCssBeautify())(v.code, { indent_size: 2 });
      return {
        title: 'Formatted CSS',
        html: `<pre class="code">${pretty.replace(/</g, '&lt;')}</pre>`,
        copy: pretty,
        text: pretty,
      };
    },
  },

  /* 9 ── JS formatter */
  'js-format': {
    fields: [
      { id: 'code', label: 'JavaScript input', type: 'textarea', rows: 9, default: 'function greet(n){if(n){console.log("Hi "+n)}else{console.log("Hi guest")}}' },
      { id: 'mode', label: 'Mode', type: 'select', options: [['beautify', 'Beautify / indent'], ['minify', 'Minify (shrink)']], half: true },
    ],
    live: false,
    buttonLabel: 'Format JavaScript',
    async compute(v) {
      if (!v.code?.trim()) return 'Paste some JavaScript first.';
      if (v.mode === 'minify') {
        const min = minifyGeneric(v.code, 'js');
        return {
          title: `Minified — saved ${Math.round((1 - min.length / v.code.length) * 100) || 0}%`,
          html: `<pre class="code" style="max-height:420px;overflow:auto">${min.replace(/</g, '&lt;')}</pre>`,
          copy: min,
          text: min,
          note: 'This lightweight minifier strips comments and excess whitespace. For production, use esbuild or Terser.',
        };
      }
      const pretty = (await loadJsBeautify())(v.code, { indent_size: 2 });
      return {
        title: 'Formatted JavaScript',
        html: `<pre class="code" style="max-height:420px;overflow:auto">${pretty.replace(/</g, '&lt;')}</pre>`,
        copy: pretty,
        text: pretty,
      };
    },
  },

  /* 10 ── SQL formatter */
  'sql-format': {
    fields: [
      { id: 'sql', label: 'SQL query', type: 'textarea', rows: 8, default: 'select u.name, count(o.id) as orders from users u left join orders o on u.id = o.user_id where u.active = 1 group by u.name having count(o.id) > 2 order by orders desc limit 10;' },
    ],
    compute(v) {
      if (!v.sql?.trim()) return 'Paste a SQL query first.';
      const pretty = prettySQL(v.sql);
      return {
        title: 'Formatted SQL',
        html: `<pre class="code" style="max-height:420px;overflow:auto">${pretty.replace(/</g, '&lt;')}</pre>`,
        copy: pretty,
        text: pretty,
      };
    },
  },

  /* 11 ── Markdown preview */
  'markdown-preview': {
    mount(container) {
      const ta = el('textarea.textarea.code-area', { rows: 12 });
      ta.value = `# Welcome to PSDKIT\n\nWrite **Markdown** on the left, see it *rendered* on the right.\n\n## Features\n\n- Live preview\n- Headings, bold, italics\n- Lists and links\n\n> Blockquotes look great too.\n\n\`inline code\` and blocks:\n\n\`\`\`js\nconst tools = 150;\n\`\`\`\n\n[Visit PSDKIT Pro](#/home)`;
      const preview = el('div', {
        style: {
          padding: '22px', background: 'var(--cream-soft)', border: '1.5px solid var(--cream-line)',
          borderRadius: '16px', minHeight: '340px', overflowY: 'auto', fontSize: '14.5px', lineHeight: 1.75, color: 'var(--ink-soft)',
        },
      });
      const render = debounce(async () => {
        preview.innerHTML = (await loadMarked()).parse(ta.value);
      }, 300);
      ta.addEventListener('input', render);
      container.append(
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } },
          el('div', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Markdown' }), ta),
          el('div', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Preview' }), preview),
        ),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-soft', {
            html: `${icon('copy', 15)} Copy rendered HTML`,
            onclick: async () => {
              copyText((await loadMarked()).parse(ta.value));
            },
          }),
        ),
      );
      render();
    },
  },

  /* 12 ── Markdown ⇄ HTML */
  'markdown-html': {
    mount(container) {
      const ta = el('textarea.textarea.code-area', { rows: 8 });
      ta.value = '# Title\n\nA paragraph with **bold** text and a [link](https://example.com).';
      const out = el('div');
      const toHTML = async () => {
        const html = (await loadMarked()).parse(ta.value);
        out.innerHTML = '';
        out.append(el('div.result-card',
          el('div.result-head', el('span.result-title', { text: 'HTML output' }), copyButton(html)),
          el('div.result-body', el('pre.code', { text: html })),
        ));
      };
      const toMD = async () => {
        const TurndownService = await loadTurndown();
        const md = new TurndownService({ headingStyle: 'atx' }).turndown(ta.value);
        out.innerHTML = '';
        out.append(el('div.result-card',
          el('div.result-head', el('span.result-title', { text: 'Markdown output' }), copyButton(md)),
          el('div.result-body', el('pre.code', { text: md })),
        ));
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'Input (Markdown or HTML)' }), ta),
        el('div.tool-actions', { style: { marginTop: '12px' } },
          el('button.btn.btn-accent', { html: 'MD → HTML', onclick: toHTML }),
          el('button.btn.btn-soft', { html: 'HTML → MD', onclick: toMD }),
        ),
        el('div.mt-3', out),
      );
      toHTML();
    },
  },

  /* 13 ── Base64 */
  'base64-codec': {
    fields: [
      { id: 'text', label: 'Input', type: 'textarea', rows: 5, default: 'Hello from PSDKIT Pro!' },
    ],
    compute(v) {
      const t = v.text ?? '';
      if (!t) return 'Type something to encode or decode.';
      const encode = () => btoa(String.fromCharCode(...new TextEncoder().encode(t)));
      const decode = () => {
        try {
          return new TextDecoder().decode(Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0)));
        } catch { return '(not valid Base64)'; }
      };
      const enc = encode();
      return {
        title: 'Base64',
        text: `Encoded:\n${enc}\n\nDecoded (auto):\n${decode()}`,
        copy: enc,
      };
    },
  },

  /* 14 ── URL codec */
  'url-codec': {
    fields: [
      { id: 'text', label: 'Input URL or text', type: 'textarea', rows: 4, default: 'https://psdkit.vercel.app/search?q=hello world&lang=en' },
    ],
    compute(v) {
      const t = v.text ?? '';
      return {
        title: 'URL encoding',
        text: `Fully encoded (encodeURIComponent):\n${encodeURIComponent(t)}\n\nFull URL encoded (encodeURI):\n${encodeURI(t)}\n\nDecoded (decodeURIComponent):\n${(() => { try { return decodeURIComponent(t); } catch { return '(not valid encoded text)'; } })()}`,
        copy: encodeURIComponent(t),
      };
    },
  },

  /* 15 ── HTML entities */
  'html-entities': {
    fields: [
      { id: 'text', label: 'Input', type: 'textarea', rows: 5, default: '<div class="a">Tom & Jerry\'s "show" — 5 < 10</div>' },
    ],
    compute(v) {
      const t = v.text ?? '';
      const encoded = t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const decoded = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return {
        title: 'Entities',
        text: `Encoded:\n${encoded}\n\nDecoded:\n${decoded}`,
        copy: encoded,
      };
    },
  },

  /* 16 ── JWT decoder */
  'jwt-decoder': {
    fields: [
      { id: 'jwt', label: 'JWT token', type: 'textarea', rows: 4, default: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.KumVScLbFtEw1jV0vLdMBqKGZKq3-9PSVjPzBKTLUA0' },
    ],
    compute(v) {
      const t = (v.jwt || '').trim();
      if (!t) return 'Paste a JWT token.';
      const parts = t.split('.');
      if (parts.length < 2) return 'A JWT has three dot-separated parts — this does not look like one.';
      const b64 = (s) => {
        try {
          return JSON.stringify(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))), null, 2);
        } catch { return '(could not decode)'; }
      };
      const header = b64(parts[0]);
      const payload = b64(parts[1]);
      return {
        title: 'Decoded token',
        html: `<div class="field-label" style="margin-bottom:8px">Header</div><pre class="code">${header.replace(/</g, '&lt;')}</pre>
               <div class="field-label" style="margin:14px 0 8px">Payload</div><pre class="code">${payload.replace(/</g, '&lt;')}</pre>
               <div class="field-label" style="margin:14px 0 8px">Signature</div><pre class="code">${(parts[2] || '(none)').replace(/</g, '&lt;')}</pre>`,
        copy: `Header:\n${header}\n\nPayload:\n${payload}`,
        text: `Header: ${header}\nPayload: ${payload}`,
        note: 'Decoding needs no key. Verifying a signature requires the secret/public key — never share tokens; anyone holding one can use it until it expires.',
      };
    },
  },

  /* 17 ── Regex tester */
  'regex-tester': {
    mount(container) {
      const pattern = el('input.input', { value: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', style: { fontFamily: 'ui-monospace, monospace' } });
      const flags = el('input.input', { value: 'g', style: { width: '90px', fontFamily: 'ui-monospace, monospace' } });
      const sample = el('textarea.textarea.code-area', { rows: 6 });
      sample.value = 'Contact us at hello@psdkit.dev or support@psdkit.dev.\nInvalid: @nope, a@b.\nAlso try team+tag@example.org';
      const out = el('div');
      const run = debounce(() => {
        out.innerHTML = '';
        try {
          const re = new RegExp(pattern.value, flags.value);
          const text = sample.value;
          const matches = [...text.matchAll(re)];
          const highlighted = text.replace(new RegExp(pattern.value, flags.value.includes('g') ? flags.value : flags.value + 'g'), (m) => `<mark style="background:var(--accent-soft);border-radius:4px;padding:1px 3px">${m.replace(/</g, '&lt;')}</mark>`);
          out.append(
            el('div.stat-grid', ...[
              ['Matches', matches.length],
              ['Pattern', pattern.value.slice(0, 20) + (pattern.value.length > 20 ? '…' : '')],
              ['Flags', flags.value || '(none)'],
            ].map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '15px' } })))),
            el('div.field-label', { style: { margin: '14px 0 8px' }, text: 'Matches highlighted' }),
            el('div.result-card', el('div.result-body', el('div', { html: highlighted.replace(/\n/g, '<br>') }))),
            matches.length
              ? el('div.field-label', { style: { margin: '14px 0 8px' }, text: `Captured groups (${matches.length} matches)` })
              : null,
            matches.length
              ? el('pre.code', { text: matches.slice(0, 50).map((m, i) => `#${i + 1}  ${m[0]}${m.length > 1 ? `  groups: [${m.slice(1).map((g) => g ?? '—').join(', ')}]` : ''}`).join('\n') })
              : null,
          );
        } catch (e) {
          out.append(el('div.note', { html: icon('info', 17) + `<span>Invalid regex: ${e.message}</span>` }));
        }
      }, 250);
      [pattern, flags, sample].forEach((i) => i.addEventListener('input', run));
      container.append(
        el('div.row', { style: { gap: '10px', alignItems: 'flex-end' } },
          el('div.field', { style: { flex: 1 } }, el('label.field-label', { text: 'Regular expression' }), pattern),
          el('div.field', el('label.field-label', { text: 'Flags' }), flags),
        ),
        el('div.field.mt-2', el('label.field-label', { text: 'Test text' }), sample),
        el('div.note.mt-2', { html: icon('info', 17) + '<span>Flags: <code>g</code> global · <code>i</code> ignore case · <code>m</code> multiline · <code>s</code> dot-all</span>' }),
        el('div.mt-3', out),
      );
      run();
    },
  },

  /* 18 ── Cron builder */
  'cron-builder': {
    mount(container) {
      const fields = [
        ['min', 'Minutes', '0-59', '0'],
        ['hour', 'Hours', '0-23', '0'],
        ['dom', 'Day of month', '1-31', '*'],
        ['mon', 'Month', '1-12', '*'],
        ['dow', 'Day of week', '0-6 (Sun=0)', '*'],
      ];
      const inputs = {};
      const out = el('div');
      const describe = (expr) => {
        const [min, hour, dom, mon, dow] = expr.split(' ');
        const when = [];
        if (min === '*' ) when.push('every minute');
        else if (min.startsWith('*/')) when.push(`every ${min.slice(2)} minutes`);
        else when.push(`at minute ${min}`);
        if (hour === '*') when.push('of every hour');
        else if (hour.startsWith('*/')) when.push(`every ${hour.slice(2)} hours`);
        else when.push(`at ${hour}:00`);
        if (dom !== '*') when.push(`on day ${dom} of the month`);
        if (mon !== '*') when.push(`in month ${mon}`);
        if (dow !== '*') {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          when.push(`on ${dow.split(',').map((d) => days[+d] || d).join(' & ')}`);
        }
        return `Runs ${when.join(' ')}.`;
      };
      const render = () => {
        const expr = fields.map(([k]) => inputs[k].value.trim() || '*').join(' ');
        out.innerHTML = '';
        out.append(
          el('div.result-card',
            el('div.result-head', el('span.result-title', { text: 'Cron expression' }), copyButton(expr)),
            el('div.result-body',
              el('pre.code', { text: expr }),
              el('p', { style: { marginTop: '12px', fontSize: '14.5px', color: 'var(--muted)', lineHeight: 1.7 }, text: describe(expr) }),
            ),
          ),
          el('div.wrap-gap-sm.mt-2', ...[
            ['Every 5 minutes', '*/5 * * * *'],
            ['Every day at 9:00', '0 9 * * *'],
            ['Weekdays at 18:30', '30 18 * * 1-5'],
            ['First of month 00:00', '0 0 1 * *'],
            ['Every Sunday midnight', '0 0 * * 0'],
          ].map(([label, exp]) => el('button.chip', {
            text: label,
            onclick: () => {
              exp.split(' ').forEach((val, i) => (inputs[fields[i][0]].value = val));
              render();
            },
          }))),
        );
      };
      const grid = el('div.grid.grid-3', { style: { gap: '12px' } });
      for (const [k, label, hint, def] of fields) {
        inputs[k] = el('input.input', { value: def, placeholder: '*' });
        grid.append(el('div.field', el('label.field-label', { text: label }), inputs[k], el('div.field-hint', { text: hint })));
      }
      grid.addEventListener('input', debounce(render, 250));
      container.append(grid, el('div.mt-3', out));
      render();
    },
  },

  /* 19 ── Unix time */
  'unix-time': {
    mount(container) {
      const nowEl = el('div.big-timer', { text: '0', style: { fontSize: '42px' } });
      const out = el('div');
      const input = el('input.input', { placeholder: 'Paste a timestamp or a date…' });
      const render = () => {
        const now = Date.now();
        nowEl.textContent = Math.floor(now / 1000);
        out.innerHTML = '';
        out.append(el('div.stat-grid', ...[
          ['Unix seconds', Math.floor(now / 1000)],
          ['Unix milliseconds', now],
          ['ISO (UTC)', new Date(now).toISOString()],
          /* compact — the full Date.toString() does not fit a stat tile */
          ['Local time', new Date(now).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })],
        ].map(([k, v]) => el('div.stat', el('div.k', { text: k }), el('div.v', { text: String(v), style: { fontSize: '13px', wordBreak: 'break-all' } })))));
      };
      const t = setInterval(render, 1000);
      container._cleanup = () => clearInterval(t);
      const convert = () => {
        const raw = input.value.trim();
        if (!raw) return;
        let d;
        if (/^\d{10}$/.test(raw)) d = new Date(Number(raw) * 1000);
        else if (/^\d{13}$/.test(raw)) d = new Date(Number(raw));
        else d = new Date(raw);
        if (isNaN(d)) return toast('Could not parse that value', 'x');
        out.prepend(el('div.result-card',
          el('div.result-head', el('span.result-title', { text: 'Converted' }), copyButton(d.toISOString())),
          el('div.result-body', el('div.result-out', {
            text: `Input: ${raw}\nISO: ${d.toISOString()}\nLocal: ${d.toString()}\nUnix s: ${Math.floor(d.getTime() / 1000)}\nUnix ms: ${d.getTime()}`,
          })),
        ));
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') convert(); });
      container.append(
        el('div.canvas-stage', { style: { flexDirection: 'column', gap: '10px', padding: '26px' } },
          el('div.eyebrow.no-dots', { text: 'CURRENT UNIX TIME' }), nowEl),
        el('div.row.mt-3', { style: { gap: '10px' } }, input, el('button.btn.btn-accent', { text: 'Convert', onclick: convert })),
        el('div.mt-3', out),
      );
      render();
    },
  },

  /* 20 ── Base converter */
  'base-convert': {
    fields: [
      { id: 'value', label: 'Number', type: 'text', default: '255', half: true },
      { id: 'from', label: 'From base', type: 'select', options: [[10, 'Decimal'], [2, 'Binary'], [8, 'Octal'], [16, 'Hex']], default: 10, half: true },
    ],
    compute(v) {
      const raw = (v.value || '').trim();
      if (!raw) return 'Enter a number.';
      let n;
      try {
        n = BigInt(parseInt(raw, Number(v.from)));
        if (isNaN(Number(n))) throw new Error();
      } catch {
        return 'Could not parse that number in the chosen base.';
      }
      const dec = Number(n);
      return {
        title: 'Base conversions',
        stats: [
          { label: 'Decimal', value: dec },
          { label: 'Binary', value: n.toString(2) },
          { label: 'Octal', value: n.toString(8) },
          { label: 'Hexadecimal', value: n.toString(16).toUpperCase() },
        ],
        text: `Decimal:     ${dec}\nBinary:      ${n.toString(2)}\nOctal:       ${n.toString(8)}\nHexadecimal: ${n.toString(16).toUpperCase()}`,
        copy: `dec=${dec} bin=${n.toString(2)} oct=${n.toString(8)} hex=${n.toString(16).toUpperCase()}`,
      };
    },
  },

  /* 21 ── Hex ⇄ text */
  'hex-convert': {
    fields: [
      { id: 'text', label: 'Input (text or hex bytes)', type: 'textarea', rows: 4, default: '48656c6c6f205053444b4954' },
    ],
    compute(v) {
      const t = (v.text || '').trim();
      if (!t) return 'Enter text or hex.';
      const isHex = /^[0-9a-fA-F\s]+$/.test(t) && t.replace(/\s/g, '').length % 2 === 0;
      let out;
      if (isHex) {
        const bytes = t.replace(/\s/g, '').match(/.{2}/g).map((b) => parseInt(b, 16));
        out = `Hex → Text: ${new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes))}\nHex bytes: ${bytes.join(' ')}`;
      } else {
        const hex = [...new TextEncoder().encode(t)].map((b) => b.toString(16).padStart(2, '0')).join('');
        out = `Text → Hex: ${hex}\nWith spaces: ${hex.match(/.{2}/g).join(' ')}\nUppercase: ${hex.toUpperCase()}`;
      }
      return { title: 'Hex conversion', text: out, copy: out };
    },
  },

  /* 22 ── ASCII */
  'ascii-convert': {
    fields: [
      { id: 'text', label: 'Input (text or codes like 72 101 108)', type: 'textarea', rows: 4, default: 'PSDKIT' },
    ],
    compute(v) {
      const t = (v.text || '').trim();
      if (!t) return 'Enter text or codes.';
      const isCodes = /^\d+(\s+\d+)+$/.test(t) || /^\d+$/.test(t);
      if (isCodes) {
        const codes = t.split(/\s+/).map(Number);
        return {
          title: 'Codes → Text',
          text: `Text: ${codes.map((c) => String.fromCharCode(c)).join('')}\nCodes: ${codes.join(' ')}`,
          copy: codes.map((c) => String.fromCharCode(c)).join(''),
        };
      }
      const codes = [...t].map((c) => c.charCodeAt(0));
      return {
        title: 'Text → Codes',
        stats: [{ label: 'Characters', value: t.length }, { label: 'Codes', value: codes.slice(0, 3).join(' ') + (codes.length > 3 ? '…' : '') }],
        text: `Codes: ${codes.join(' ')}\nText: ${t}`,
        copy: codes.join(' '),
      };
    },
  },

  /* 23 ── Text ⇄ binary */
  'binary-convert': {
    fields: [
      { id: 'text', label: 'Input (text or binary 0/1)', type: 'textarea', rows: 4, default: 'Hi' },
    ],
    compute(v) {
      const t = (v.text || '').trim();
      if (!t) return 'Enter text or binary.';
      const isBin = /^[01\s]+$/.test(t);
      if (isBin) {
        const chars = t.replace(/\s/g, '').match(/.{1,8}/g) || [];
        return {
          title: 'Binary → Text',
          text: `Text: ${chars.map((b) => String.fromCharCode(parseInt(b, 2))).join('')}\nBytes: ${chars.join(' ')}`,
          copy: chars.map((b) => String.fromCharCode(parseInt(b, 2))).join(''),
        };
      }
      const bin = [...t].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      return { title: 'Text → Binary', text: `Binary: ${bin}`, copy: bin };
    },
  },

  /* 24 ── Morse */
  'morse-code': {
    fields: [
      { id: 'text', label: 'Input (text or morse)', type: 'textarea', rows: 4, default: 'SOS PSDKIT' },
    ],
    compute(v) {
      const map = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', ' ': '/' };
      const rev = Object.fromEntries(Object.entries(map).map(([k, val]) => [val, k]));
      const t = (v.text || '').trim();
      if (!t) return 'Enter text or morse code.';
      const isMorse = /^[.\-/\s]+$/.test(t);
      if (isMorse) {
        const text = t.split('/').map((w) => w.trim().split(/\s+/).map((c) => rev[c] || '').join('')).join(' ');
        return { title: 'Morse → Text', text, copy: text };
      }
      const morse = [...t.toUpperCase()].map((c) => map[c] || c).join(' ');
      return { title: 'Text → Morse', text: morse, copy: morse, note: 'Letters separated by spaces, words by "/". Try the Metronome tool in Essentials to send it!' };
    },
  },

  /* 25 ── Slug */
  'slug-gen': {
    fields: [
      { id: 'text', label: 'Title', type: 'textarea', rows: 3, default: `PSDKIT Pro: ${TOOL_COUNT} Free Tools for Everyone!` },
    ],
    compute(v) {
      const t = v.text || '';
      const slug = t
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      return {
        title: 'URL slug',
        /* the slug itself lives in the copyable text block below — a long slug
           in a stat tile would wrap to four cramped lines */
        stats: [
          { label: 'Characters', value: slug.length },
          { label: 'Words', value: slug ? slug.split('-').filter(Boolean).length : 0 },
          { label: 'SEO friendly', value: slug && slug.length <= 75 ? 'Yes' : 'Too long' },
        ],
        text: slug,
        copy: slug,
        note: 'Aim for under 75 characters. Use lowercase letters and hyphens — no spaces or underscores.',
      };
    },
  },

  /* 26 ── Code case */
  'code-case': {
    fields: [
      { id: 'text', label: 'Identifier (any format)', type: 'text', default: 'saveUserProfile' },
    ],
    compute(v) {
      const t = v.text || '';
      if (!t.trim()) return 'Type an identifier.';
      const r = caseConverters(t);
      return {
        title: 'Naming conventions',
        text: `camelCase:   ${r.camel}\nPascalCase:  ${r.pascal}\nsnake_case:  ${r.snake}\nkebab-case:  ${r.kebab}\nCONSTANT:    ${r.constant}\nTitle Case:  ${r.title}`,
        copy: r.snake,
      };
    },
  },

  /* 27 ── Text diff */
  'text-diff': {
    mount(container) {
      const a = el('textarea.textarea.code-area', { rows: 8, placeholder: 'Original text…' });
      const b = el('textarea.textarea.code-area', { rows: 8, placeholder: 'Changed text…' });
      a.value = 'The quick brown fox\njumps over the lazy dog\nPSDKIT is free\nand works offline.';
      b.value = 'The quick red fox\njumps over the lazy dog\nPSDKIT Pro is free\nand works in your browser.';
      const out = el('div');
      const run = () => {
        const la = a.value.split('\n'), lb = b.value.split('\n');
        const max = Math.max(la.length, lb.length);
        const rows = [];
        for (let i = 0; i < max; i++) {
          const x = la[i], y = lb[i];
          if (x === y) rows.push(`<div style="padding:6px 12px;background:var(--cream-soft);border-radius:8px;font-family:ui-monospace,monospace;font-size:12.5px;color:var(--muted)">  ${escape(x)}</div>`);
          else {
            if (x !== undefined) rows.push(`<div style="padding:6px 12px;background:var(--blush);border-radius:8px;font-family:ui-monospace,monospace;font-size:12.5px">- ${escape(x)}</div>`);
            if (y !== undefined) rows.push(`<div style="padding:6px 12px;background:var(--sage);border-radius:8px;font-family:ui-monospace,monospace;font-size:12.5px">+ ${escape(y)}</div>`);
          }
        }
        const changed = rows.filter((r) => r.includes('blush') || r.includes('sage')).length;
        out.innerHTML = '';
        out.append(
          el('div.row-between', { style: { marginBottom: '10px' } },
            el('span.chip', { style: { cursor: 'default' }, text: `${changed / 2 | 0} line(s) changed` }),
            copyButton(a.value + '\n---\n' + b.value, 'Copy both'),
          ),
          el('div', { html: rows.join('') }),
        );
      };
      const escape = (s) => String(s).replace(/</g, '&lt;');
      run();
      const dRun = debounce(run, 350);
      a.addEventListener('input', dRun);
      b.addEventListener('input', dRun);
      container.append(
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
          el('div', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Before' }), a),
          el('div', el('div.field-label', { style: { marginBottom: '8px' }, text: 'After' }), b),
        ),
        el('div.mt-3', out),
      );
    },
  },

  /* 28 ── Line tools */
  'line-tools': {
    fields: [
      { id: 'text', label: 'Lines', type: 'textarea', rows: 8, default: 'banana\napple\ncherry\napple\nbanana\ndate\n\nelderberry' },
    ],
    compute(v) {
      const lines = (v.text || '').split('\n');
      const nonEmpty = lines.filter((l) => l.trim());
      const unique = [...new Set(nonEmpty)];
      const sorted = [...nonEmpty].sort((a, b) => a.localeCompare(b));
      return {
        title: 'Line analysis',
        stats: [
          { label: 'Total lines', value: lines.length },
          { label: 'Blank', value: lines.length - nonEmpty.length },
          { label: 'Duplicates', value: nonEmpty.length - unique.length },
          { label: 'Unique', value: unique.length },
        ],
        text:
          `Removed duplicates & blanks:\n${unique.join('\n')}\n\n` +
          `Sorted A→Z:\n${sorted.join('\n')}\n\n` +
          `Sorted Z→A:\n${[...sorted].reverse().join('\n')}`,
        copy: unique.join('\n'),
      };
    },
  },

  /* 29 ── Find & replace */
  'find-replace': {
    fields: [
      { id: 'text', label: 'Text', type: 'textarea', rows: 7, default: 'The colour of the colourful shirt is colour.' },
      { id: 'find', label: 'Find', type: 'text', default: 'colour', half: true },
      { id: 'replace', label: 'Replace with', type: 'text', default: 'color', half: true },
      { id: 'useRegex', label: 'Use regex', type: 'checkbox', default: false, checkLabel: 'Treat “Find” as a regular expression' },
    ],
    compute(v) {
      const t = v.text || '';
      if (!v.find) return 'Enter something to find.';
      try {
        const re = v.useRegex ? new RegExp(v.find, 'gi') : new RegExp(v.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const count = (t.match(re) || []).length;
        const result = t.replace(re, v.replace ?? '');
        return {
          title: `Replaced ${count} match(es)`,
          text: result,
          copy: result,
          downloadText: result,
          downloadName: 'replaced.txt',
        };
      } catch (e) {
        return `Invalid regex: ${e.message}`;
      }
    },
  },

  /* 30 ── Comment remover */
  'comment-strip': {
    fields: [
      { id: 'code', label: 'Code with comments', type: 'textarea', rows: 8, default: '// Header comment\nfunction add(a, b) { // adds two numbers\n  /* block comment */\n  return a + b; // result\n}' },
      { id: 'lang', label: 'Language', type: 'select', options: [['js', 'JavaScript / CSS / Java / C-style'], ['html', 'HTML'], ['hash', 'Hash-style (#) comments']], half: true },
    ],
    compute(v) {
      const code = v.code || '';
      let out = code;
      if (v.lang === 'js') {
        out = out.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
      } else if (v.lang === 'html') {
        out = out.replace(/<!--[\s\S]*?-->/g, '');
      } else {
        out = out.replace(/(^|[^\\])#[^\n]*/g, '$1');
      }
      out = out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '');
      return {
        title: `Comments removed — ${code.length - out.length} chars cleaned`,
        text: out,
        copy: out,
      };
    },
  },

  /* 31 ── Colour code converter */
  'color-code': {
    fields: [
      { id: 'color', label: 'Colour', type: 'color', default: '#DE5D35', half: true },
      { id: 'custom', label: 'Or type HEX / RGB / HSL', type: 'text', default: '', placeholder: '#DE5D35 · rgb(222,93,53) · hsl(14,72%,54%)' },
    ],
    compute(v) {
      const src = ((v.custom || '').trim() || v.color || '').trim();
      /* Parse first — deterministic, and it works with no canvas at all. The
         canvas round-trip is only a fallback for CSS names outside our table.
         The old code did it the other way round, so an unrecognised colour kept
         the previous fillStyle and was reported as black instead of rejected. */
      let rgb = parseColour(src);
      if (!rgb) {
        const ctx = ctx2d(document.createElement('canvas'));
        if (ctx) {
          ctx.fillStyle = '#123456'; // sentinel that is itself a valid colour
          ctx.fillStyle = src;
          const got = ctx.fillStyle;
          if (got !== '#123456') rgb = parseColour(got);
        }
      }
      if (!rgb) return `Could not read "${src || '(empty)'}" as a colour. Try #DE5D35, rgb(222,93,53), hsl(14,72%,54%) or a name like tomato.`;
      const { r, g, b } = rgb;
      const hexNorm = rgbToHex(rgb);
      const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2, d = max - min;
      const s = d ? (l > 0.5 ? d / (2 - max - min) : d / (max + min)) : 0;
      let h = 0;
      if (d) {
        const rr = r / 255, gg = g / 255, bb = b / 255;
        if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
        else if (max === gg) h = ((bb - rr) / d + 2) * 60;
        else h = ((rr - gg) / d + 4) * 60;
      }
      return {
        title: 'Colour conversions',
        html: `<div style="height:110px;border-radius:16px;background:${hexNorm};border:1px solid var(--cream-line)"></div>
        <div class="stat-grid" style="margin-top:12px">
          <div class="stat"><div class="k">HEX</div><div class="v" style="font-size:15px">${hexNorm.toUpperCase()}</div></div>
          <div class="stat"><div class="k">RGB</div><div class="v" style="font-size:15px">rgb(${r}, ${g}, ${b})</div></div>
          <div class="stat"><div class="k">HSL</div><div class="v" style="font-size:15px">hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)</div></div>
          <div class="stat"><div class="k">CSS</div><div class="v" style="font-size:15px">--color: ${hexNorm};</div></div>
        </div>`,
        copy: `HEX: ${hexNorm.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
        text: `HEX ${hexNorm.toUpperCase()} · RGB(${r},${g},${b}) · HSL(${Math.round(h)},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`,
      };
    },
  },

  /* 32 ── Box shadow */
  'box-shadow': {
    mount(container) {
      const controls = {
        x: el('input.range', { type: 'range', min: -50, max: 50, value: 8 }),
        y: el('input.range', { type: 'range', min: -50, max: 50, value: 12 }),
        blur: el('input.range', { type: 'range', min: 0, max: 100, value: 32 }),
        spread: el('input.range', { type: 'range', min: -30, max: 60, value: 0 }),
        opacity: el('input.range', { type: 'range', min: 0, max: 100, value: 14 }),
        color: el('input', { type: 'color', value: '#161514', style: { width: '60px', height: '40px', padding: '4px', borderRadius: '10px', border: '1.5px solid var(--cream-line)' } }),
      };
      const preview = el('div', {
        style: {
          height: '200px', borderRadius: '22px', background: 'var(--cream-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--muted)',
        },
        text: 'Preview card',
      });
      const code = el('pre.code');
      const hexToRgba = (hex, a) => {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      };
      const render = () => {
        const sh = `${controls.x.value}px ${controls.y.value}px ${controls.blur.value}px ${controls.spread.value}px ${hexToRgba(controls.color.value, controls.opacity.value / 100)}`;
        preview.style.boxShadow = sh;
        code.textContent = `box-shadow: ${sh};`;
      };
      const grid = el('div.grid.grid-2', { style: { gap: '12px' } });
      for (const [k, label] of [['x', 'Horizontal'], ['y', 'Vertical'], ['blur', 'Blur'], ['spread', 'Spread'], ['opacity', 'Opacity %']]) {
        grid.append(el('div.field', el('label.field-label', { text: label }), controls[k]));
      }
      grid.append(el('div.field', el('label.field-label', { text: 'Shadow colour' }), controls.color));
      grid.addEventListener('input', render);
      container.append(
        el('div.canvas-stage', { style: { padding: '28px' } }, preview),
        el('div.mt-3', grid),
        el('div.mt-3', el('div.field-label', { style: { marginBottom: '8px' }, text: 'CSS' }), code),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy CSS`, onclick: () => copyText(code.textContent) })),
      );
      render();
    },
  },

  /* 33 ── Border radius */
  'border-radius': {
    mount(container) {
      const keys = ['tl', 'tr', 'br', 'bl'];
      const controls = Object.fromEntries(keys.map((k) => [k, el('input.range', { type: 'range', min: 0, max: 50, value: 18 })]));
      const preview = el('div', {
        style: { height: '200px', background: 'var(--accent-soft)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--accent-deep)' },
        text: 'Rounded shape',
      });
      const code = el('pre.code');
      const render = () => {
        const { tl, tr, br, bl } = Object.fromEntries(keys.map((k) => [k, controls[k].value]));
        preview.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
        code.textContent = tl === tr && tr === br && br === bl
          ? `border-radius: ${tl}px;`
          : `border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`;
      };
      const grid = el('div.grid.grid-2', { style: { gap: '12px' } });
      for (const [k, label] of [['tl', 'Top left'], ['tr', 'Top right'], ['br', 'Bottom right'], ['bl', 'Bottom left']]) {
        grid.append(el('div.field', el('label.field-label', { text: label }), controls[k]));
      }
      grid.addEventListener('input', render);
      container.append(
        el('div.canvas-stage', { style: { padding: '28px' } }, preview),
        el('div.mt-3', grid),
        el('div.mt-3', el('div.field-label', { style: { marginBottom: '8px' }, text: 'CSS' }), code),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy CSS`, onclick: () => copyText(code.textContent) }),
          el('button.btn.btn-soft', {
            html: 'Blob preset',
            onclick: () => {
              [50, 30, 45, 25].forEach((v, i) => (controls[keys[i]].value = v));
              render();
            },
          })),
      );
      render();
    },
  },

  /* 34 ── Flexbox playground */
  'flexbox-play': {
    mount(container) {
      const opts = {
        direction: ['row', 'row-reverse', 'column', 'column-reverse'],
        justify: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        align: ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'],
        wrap: ['nowrap', 'wrap', 'wrap-reverse'],
      };
      const selects = {};
      const preview = el('div', {
        style: { display: 'flex', height: '240px', background: 'var(--cream)', borderRadius: '16px', padding: '12px', gap: '10px' },
      });
      for (let i = 1; i <= 5; i++) {
        preview.append(el('div', {
          style: {
            padding: '14px 18px', borderRadius: '12px', fontWeight: 800, fontSize: '13px',
            background: ['#F2CDBD', '#DEE7DA', '#DAE5EF', '#E6DEF0', '#F2E9CF'][i - 1],
            color: '#2B2825',
          },
          text: `Item ${i}`,
        }));
      }
      const code = el('pre.code');
      const grid = el('div.grid.grid-2', { style: { gap: '12px' } });
      for (const [key, values] of Object.entries(opts)) {
        const sel = el('select.select');
        values.forEach((val) => sel.append(el('option', { value: val, text: val })));
        selects[key] = sel;
        grid.append(el('div.field', el('label.field-label', { text: key.replace(/^./, (c) => c.toUpperCase()) }), sel));
      }
      const render = () => {
        for (const [key, sel] of Object.entries(selects)) preview.style[key === 'align' ? 'alignItems' : key === 'justify' ? 'justifyContent' : key] = sel.value;
        code.textContent = `display: flex;\nflex-direction: ${selects.direction.value};\njustify-content: ${selects.justify.value};\nalign-items: ${selects.align.value};\nflex-wrap: ${selects.wrap.value};`;
      };
      grid.addEventListener('change', render);
      container.append(
        el('div.canvas-stage', { style: { padding: '14px' } }, preview),
        el('div.mt-3', grid),
        el('div.mt-3', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Generated CSS' }), code),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy CSS`, onclick: () => copyText(code.textContent) })),
      );
      render();
    },
  },

  /* 35 ── Grid playground */
  'grid-play': {
    mount(container) {
      const cols = el('input.input', { type: 'number', value: 3, min: 1, max: 6 });
      const gap = el('input.range', { type: 'range', min: 0, max: 40, value: 12 });
      const rows = el('input.input', { type: 'number', value: 2, min: 1, max: 6 });
      const preview = el('div', { style: { display: 'grid', height: '280px', background: 'var(--cream)', borderRadius: '16px', padding: '12px' } });
      const code = el('pre.code');
      const render = () => {
        const c = Math.max(1, Math.min(6, +cols.value || 3));
        const r = Math.max(1, Math.min(6, +rows.value || 2));
        preview.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
        preview.style.gridTemplateRows = `repeat(${r}, 1fr)`;
        preview.style.gap = `${gap.value}px`;
        preview.innerHTML = '';
        const colors = ['#F2CDBD', '#DEE7DA', '#DAE5EF', '#E6DEF0', '#F2E9CF', '#F6E0E0'];
        for (let i = 0; i < c * r; i++) {
          preview.append(el('div', {
            style: { borderRadius: '10px', background: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', color: '#2B2825' },
            text: String(i + 1),
          }));
        }
        code.textContent = `display: grid;\ngrid-template-columns: repeat(${c}, 1fr);\ngrid-template-rows: repeat(${r}, 1fr);\ngap: ${gap.value}px;`;
      };
      [cols, rows, gap].forEach((i) => i.addEventListener('input', render));
      container.append(
        el('div.canvas-stage', { style: { padding: '14px' } }, preview),
        el('div.grid.grid-3', { style: { gap: '12px', marginTop: '14px' } },
          el('div.field', el('label.field-label', { text: 'Columns' }), cols),
          el('div.field', el('label.field-label', { text: 'Rows' }), rows),
          el('div.field', el('label.field-label', { text: 'Gap (px)' }), gap),
        ),
        el('div.mt-3', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Generated CSS' }), code),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-soft', { html: `${icon('copy', 15)} Copy CSS`, onclick: () => copyText(code.textContent) })),
      );
      render();
    },
  },

  /* 36 ── Git cheatsheet */
  'git-cheatsheet': {
    mount: referenceTool({
      intro: 'Every git command you actually use, explained in plain English. Search to filter instantly.',
      sections: GIT_SECTIONS,
    }),
  },

  /* 37 ── Git command builder */
  'git-builder': {
    mount(container) {
      const action = el('select.select');
      for (const [v, l] of [['commit', 'commit — save changes'], ['push', 'push — upload commits'], ['pull', 'pull — get remote changes'], ['clone', 'clone — copy a repo'], ['branch', 'branch — work in parallel'], ['merge', 'merge — combine branches'], ['stash', 'stash — shelve changes'], ['reset', 'reset — undo things']]) {
        action.append(el('option', { value: v, text: l }));
      }
      const optsWrap = el('div.col', { style: { gap: '12px' } });
      const out = el('pre.code');
      const OPTION_MAP = {
        commit: [['-m "message"', 'Commit message', true], ['-a', 'Stage modified files automatically', false], ['--amend', 'Fix the previous commit', false], ['-s', 'Add a sign-off', false]],
        push: [['origin main', 'Remote and branch', true], ['-u', 'Set upstream (first push)', false], ['--force-with-lease', 'Safer force push', false], ['--tags', 'Push tags too', false]],
        pull: [['origin main', 'Remote and branch', true], ['--rebase', 'Rebase instead of merge', false], ['--ff-only', 'Only fast-forward', false]],
        clone: [['<repo-url>', 'Repository URL', true], ['--depth 1', 'Shallow clone (faster)', false], ['-b <branch>', 'Clone a specific branch', false]],
        branch: [['<name>', 'Branch name', true], ['-d', 'Delete after merge', false], ['-D', 'Force delete', false], ['-m', 'Rename current branch', false]],
        merge: [['<branch>', 'Branch to merge in', true], ['--no-ff', 'Keep merge commit', false], ['--squash', 'Combine into one commit', false]],
        stash: [['push -m "msg"', 'Stash with a message', true], ['pop', 'Re-apply last stash', true], ['list', 'See all stashes', true], ['drop', 'Delete a stash', false]],
        reset: [['--soft HEAD~1', 'Undo commit, keep changes staged', true], ['--mixed HEAD~1', 'Undo commit, keep changes', true], ['--hard HEAD~1', 'Undo everything (careful!)', true]],
      };
      const render = () => {
        optsWrap.innerHTML = '';
        const opts = OPTION_MAP[action.value] || [];
        for (const [val, label, on] of opts) {
          const cb = el('input', { type: 'checkbox' });
          cb.checked = on;
          cb.addEventListener('change', build);
          optsWrap.append(el('label.checkline', cb, `${val}  —  ${label}`));
        }
        build();
      };
      const build = () => {
        const parts = ['git', action.value];
        const opts = OPTION_MAP[action.value] || [];
        [...optsWrap.querySelectorAll('input')].forEach((cb, i) => {
          if (cb.checked) parts.push(opts[i][0]);
        });
        out.textContent = parts.join(' ');
      };
      action.addEventListener('change', render);
      container.append(
        el('div.field', el('label.field-label', { text: 'What do you want to do?' }), action),
        el('div.mt-3', optsWrap),
        el('div.mt-3', el('div.field-label', { style: { marginBottom: '8px' }, text: 'Your command' }), out),
        el('div.tool-actions', { style: { marginTop: '10px' } },
          el('button.btn.btn-accent', { html: `${icon('copy', 15)} Copy command`, onclick: () => copyText(out.textContent) })),
      );
      render();
    },
  },

  /* 38 ── HTTP status */
  'http-status': {
    mount: referenceTool({
      intro: 'Every HTTP status code, what it means and what you should do about it.',
      sections: HTTP_SECTIONS,
    }),
  },

  /* 39 ── Linux commands */
  'linux-commands': {
    mount: referenceTool({
      intro: 'The Linux commands that cover 95% of daily terminal work.',
      sections: LINUX_SECTIONS,
    }),
  },

  /* 40 ── npm commands */
  'npm-commands': {
    mount: referenceTool({
      intro: 'npm and yarn commands with what they actually do.',
      sections: NPM_SECTIONS,
    }),
  },

  /* 41 ── VS Code shortcuts */
  'vscode-shortcuts': {
    mount: referenceTool({
      intro: 'Shortcuts shown for Windows/Linux — use Cmd on macOS.',
      sections: VSCODE_SECTIONS,
    }),
  },

  /* 42 ── Python cheatsheet */
  'python-guide': {
    mount: referenceTool({
      intro: 'Python syntax and patterns with real examples. New to coding? Start here, then try the Playground tool.',
      sections: PY_SECTIONS,
    }),
  },

  /* 43 ── JS cheatsheet */
  'js-guide': {
    mount: referenceTool({
      intro: 'Modern JavaScript (ES6+) in one searchable place.',
      sections: JS_SECTIONS,
    }),
  },

  /* 44 ── TS cheatsheet */
  'ts-guide': {
    mount: referenceTool({
      intro: 'TypeScript essentials — the types and patterns you use every day.',
      sections: TS_SECTIONS,
    }),
  },

  /* 45 ── React cheatsheet */
  'react-guide': {
    mount: referenceTool({
      intro: 'React components, hooks and the mental model that makes it click.',
      sections: REACT_SECTIONS,
    }),
  },

  /* 46 ── SQL cheatsheet */
  'sql-guide': {
    mount: referenceTool({
      intro: 'SQL queries, joins and aggregation with copy-ready examples.',
      sections: SQL_SECTIONS,
    }),
  },

  /* 47 ── DS & Big-O */
  'ds-big-o': {
    mount: referenceTool({
      intro: 'Complexity and data structures — what to pick and why.',
      sections: DS_SECTIONS,
    }),
  },

  /* 48 ── Dictionary */
  'word-meaning': {
    fields: [
      { id: 'word', label: 'Word', type: 'text', default: 'serendipity', hint: 'English dictionary — meanings, pronunciation and examples' },
    ],
    live: false,
    buttonLabel: 'Look up meaning',
    async compute(v) {
      const word = (v.word || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!word) return 'Type a word to look up.';
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (res.status === 404) return { title: 'Not found', text: `No dictionary entry for “${word}”. Check the spelling or try the Translator tool.` };
        const data = await res.json();
        const entry = data[0];
        const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '';
        const meanings = entry.meanings.slice(0, 3).map((m) => ({
          pos: m.partOfSpeech,
          defs: m.definitions.slice(0, 3).map((d) => d.definition + (d.example ? ` — “${d.example}”` : '')),
          syn: (m.synonyms || []).slice(0, 6),
        }));
        return {
          title: 'Dictionary entry',
          html: `<div class="dict-word">${entry.word}</div>
            <div class="dict-phonetic">${phonetic}</div>
            ${meanings.map((m) => `
              <div class="def-item">
                <div class="def-pos">${m.pos}</div>
                <ul class="list">${m.defs.map((d) => `<li>${d.replace(/</g, '&lt;')}</li>`).join('')}</ul>
                ${m.syn.length ? `<div class="wrap-gap-sm">${m.syn.map((s) => `<span class="chip" style="cursor:default">${s}</span>`).join('')}</div>` : ''}
              </div>`).join('')}`,
          text: `${entry.word} ${phonetic}\n\n${meanings.map((m) => `${m.pos}:\n${m.defs.map((d) => '• ' + d).join('\n')}`).join('\n\n')}`,
          note: 'Powered by the free dictionaryapi.dev — data from open dictionary sources.',
        };
      } catch {
        return 'Could not reach the dictionary service — check your connection.';
      }
    },
  },

  /* 49 ── Translator */
  'translator': {
    fields: [
      { id: 'text', label: 'Text to translate', type: 'textarea', rows: 4, default: 'Good morning! How are you today?' },
      { id: 'from', label: 'From', type: 'select', options: [['Autodetect', 'Auto-detect'], ['en', 'English'], ['hi', 'Hindi'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['ar', 'Arabic'], ['bn', 'Bengali'], ['ta', 'Tamil'], ['te', 'Telugu'], ['mr', 'Marathi'], ['ur', 'Urdu'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['it', 'Italian'], ['tr', 'Turkish'], ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['nl', 'Dutch'], ['pl', 'Polish'], ['th', 'Thai'], ['ms', 'Malay'], ['fil', 'Filipino'], ['sw', 'Swahili'], ['el', 'Greek'], ['he', 'Hebrew'], ['sv', 'Swedish'], ['fa', 'Persian']], default: 'Autodetect', half: true },
      { id: 'to', label: 'To', type: 'select', options: [['hi', 'Hindi'], ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['ar', 'Arabic'], ['bn', 'Bengali'], ['ta', 'Tamil'], ['te', 'Telugu'], ['mr', 'Marathi'], ['ur', 'Urdu'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['it', 'Italian'], ['tr', 'Turkish'], ['vi', 'Vietnamese'], ['id', 'Indonesian'], ['nl', 'Dutch'], ['pl', 'Polish'], ['th', 'Thai'], ['ms', 'Malay'], ['fil', 'Filipino'], ['sw', 'Swahili'], ['el', 'Greek'], ['he', 'Hebrew'], ['sv', 'Swedish'], ['fa', 'Persian']], default: 'hi', half: true },
    ],
    live: false,
    buttonLabel: 'Translate',
    async compute(v) {
      const t = (v.text || '').trim();
      if (!t) return 'Type something to translate.';
      try {
        const from = v.from === 'Autodetect' ? '' : v.from;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${from || 'Autodetect'}|${v.to}`;
        const res = await fetch(url.replace('Autodetect|', '|').replace('langpair=|', 'langpair=en|'));
        const data = await res.json();
        const out = data?.responseData?.translatedText;
        if (!out || /MYMEMORY WARNING|INVALID/i.test(out)) {
          return { title: 'Translation', text: 'The free translation service is rate-limited right now. Try again in a moment or translate shorter text.' };
        }
        return {
          title: 'Translation',
          html: `<div style="font-family:var(--serif);font-style:italic;font-size:26px;line-height:1.5;color:var(--ink)">${out.replace(/</g, '&lt;')}</div>
                 <div class="field-hint" style="margin-top:10px">Match quality: ${data.responseData?.match ?? '—'}</div>`,
          text: out,
          copy: out,
          note: 'Free tier of MyMemory (mymemory.translated.net) — great for everyday phrases.',
        };
      } catch {
        return 'Could not reach the translation service — check your connection.';
      }
    },
  },

  /* 50 ── Thesaurus */
  'thesaurus': {
    fields: [
      { id: 'word', label: 'Word', type: 'text', default: 'happy', hint: 'Find synonyms and antonyms' },
    ],
    live: false,
    buttonLabel: 'Find synonyms',
    async compute(v) {
      const word = (v.word || '').trim().toLowerCase();
      if (!word) return 'Type a word first.';
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (res.status === 404) return { title: 'Not found', text: `No entry for “${word}”. Try the Dictionary tool for definitions.` };
        const data = await res.json();
        const syn = [...new Set(data.flatMap((e) => e.meanings.flatMap((m) => m.synonyms || [])))];
        const ant = [...new Set(data.flatMap((e) => e.meanings.flatMap((m) => m.antonyms || [])))];
        return {
          title: `Synonyms for “${word}”`,
          html: `<div class="field-label" style="margin-bottom:10px">Synonyms (${syn.length})</div>
                 <div class="wrap-gap-sm">${syn.slice(0, 40).map((s) => `<span class="chip" style="cursor:default">${s}</span>`).join('') || '<span class="text-muted" style="font-size:14px">None listed in the dictionary.</span>'}</div>
                 ${ant.length ? `<div class="field-label" style="margin:16px 0 10px">Antonyms (${ant.length})</div>
                 <div class="wrap-gap-sm">${ant.slice(0, 20).map((s) => `<span class="chip" style="cursor:default">${s}</span>`).join('')}</div>` : ''}`,
          text: `Synonyms of ${word}: ${syn.join(', ') || 'none found'}\nAntonyms of ${word}: ${ant.join(', ') || 'none found'}`,
          copy: syn.join(', '),
        };
      } catch {
        return 'Could not reach the dictionary service — check your connection.';
      }
    },
  },

  'csv-viewer-editor': {
    mount(container) {
      let rows = [];
      let headers = [];
      const input = el('textarea.textarea', { rows: 8, placeholder: 'name,email\nAda,ada@example.com', value: 'name,email\nAda,ada@example.com\nLinus,linus@example.com' });
      const table = el('div');
      const parseCsv = (text) => text.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(',').map((cell) => cell.trim()));
      const toCsv = (data) => data.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const render = () => {
        const parsed = parseCsv(input.value || '');
        headers = parsed[0] || [];
        rows = parsed.slice(1);
        table.innerHTML = '';
        if (!headers.length) return;
        const tbl = el('table', { class: 'mini-table' });
        tbl.append(el('thead', el('tr', ...headers.map((head) => el('th', { text: head })))));
        const tbody = el('tbody');
        rows.forEach((row, rowIndex) => {
          tbody.append(el('tr', ...headers.map((_, colIndex) => {
            /* width:100% + min-width:0 lets the cell shrink with the panel;
               the .table-scroll wrapper handles the genuinely-too-narrow case
               by scrolling instead of pushing the table out of the card. */
            const cell = el('input.input', { value: row[colIndex] || '', style: { width: '100%', minWidth: '0' } });
            cell.addEventListener('input', () => { rows[rowIndex][colIndex] = cell.value; });
            return el('td', cell);
          })));
        });
        tbl.append(tbody);
        /* wide CSVs scroll horizontally inside their own wrapper */
        tbl.style.minWidth = `${Math.max(headers.length * 150, 100)}px`;
        table.append(el('div.table-scroll', tbl));
      };
      container.append(
        el('div.field', el('label.field-label', { text: 'CSV input' }), input),
        el('div.tool-actions',
          el('button.btn.btn-accent', { html: `${icon('database', 16)} Render table`, onclick: render }),
          el('button.btn.btn-soft', { html: `${icon('download', 16)} Export CSV`, onclick: () => downloadFile('table.csv', toCsv([headers, ...rows]), 'text/csv') }),
          el('button.btn.btn-soft', { html: `${icon('copy', 16)} Copy JSON`, onclick: () => copyText(JSON.stringify(rows.map((row) => Object.fromEntries(headers.map((head, index) => [head, row[index] || '']))), null, 2)) }),
        ),
        el('div.mt-3', table),
      );
      render();
    },
  },

  'key-code-detector': {
    mount(container) {
      const out = el('div.stat-grid');
      const pad = el('div.canvas-stage', { tabIndex: 0, style: { padding: '40px', minHeight: '180px', flexDirection: 'column', gap: '8px' }, html: `<strong>Press any key</strong><div class="field-hint">Focus this area and start typing.</div>` });
      const render = (event) => {
        out.innerHTML = '';
        [['key', event.key], ['code', event.code], ['keyCode', event.keyCode], ['modifiers', `${event.ctrlKey ? 'Ctrl ' : ''}${event.shiftKey ? 'Shift ' : ''}${event.altKey ? 'Alt ' : ''}${event.metaKey ? 'Meta' : ''}`.trim() || 'None']]
          .forEach(([label, value]) => out.append(el('div.stat', el('div.k', { text: label }), el('div.v', { text: String(value) }))));
      };
      pad.addEventListener('keydown', (event) => { event.preventDefault(); render(event); });
      container.append(pad, el('div.mt-2', out));
    },
  },

  'braille-translator': {
    fields: [{ id: 'text', label: 'Text or Braille', type: 'textarea', rows: 5, default: 'hello world' }],
    compute(v) {
      const text = String(v.text || '');
      const looksBraille = /[⠁-⣿]/.test(text);
      if (looksBraille) {
        const translated = [...text].map((char) => BRAILLE_REVERSE[char] ?? char).join('');
        return { title: 'Braille → text', text: translated, copy: translated };
      }
      const braille = text.toLowerCase().split('').map((char) => BRAILLE_MAP[char] ?? char).join('');
      return { title: 'Text → Braille', text: braille, copy: braille };
    },
  },

  'regex-library': {
    mount(container) {
      const sections = [
        ['Email', '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/'],
        ['Phone (basic)', '/^[0-9+()\\-\\s]{7,}$/'],
        ['URL', '/^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]{2,}(\\/\\S*)?$/i'],
        ['Date YYYY-MM-DD', '/^\\d{4}-\\d{2}-\\d{2}$/'],
        ['Hex colour', '/^#?(?:[0-9a-fA-F]{3}){1,2}$/'],
        ['Strong password', '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/'],
      ];
      container.append(...sections.map(([name, pattern]) => el('div.card',
        el('div.row-between', el('div', el('div', { style: { fontWeight: 800 }, text: name }), el('div.field-hint', { text: pattern })), el('div.row',
          el('button.copy-btn', { html: `${icon('copy', 14)} Copy`, onclick: () => copyText(pattern) }),
          el('a.copy-btn', { href: '#/tool/regex-tester', text: 'Test it' }),
        )),
      )));
    },
  },

  'cron-next-run': {
    fields: [{ id: 'expr', label: 'Cron expression', type: 'text', default: '*/15 9-18 * * 1-5', hint: 'minute hour day month weekday' }],
    compute(v) {
      const runs = nextCronRuns(v.expr || '');
      return {
        title: 'Next runs',
        html: runs.map((date) => `<div class="term-row"><div class="term-name">${date.toLocaleString()}</div><div class="term-mean">${date.toUTCString()}</div></div>`).join(''),
        copy: runs.map((date) => date.toISOString()).join('\n'),
      };
    },
  },

  'json-to-ts': {
    fields: [{ id: 'json', label: 'Sample JSON', type: 'textarea', rows: 8, default: '{\n  "id": 1,\n  "name": "Ada",\n  "active": true,\n  "tags": ["js"],\n  "profile": { "city": "Delhi" }\n}' }],
    compute(v) {
      const parsed = JSON.parse(v.json);
      const body = tsType(parsed);
      const out = `interface Root ${body}`;
      return { title: 'TypeScript interface', text: out, copy: out };
    },
  },

  'gitignore-generator': {
    fields: [{ id: 'stack', label: 'Preset stacks (comma separated)', type: 'text', default: 'Node, macOS' }],
    compute(v) {
      const picks = v.stack.split(',').map((item) => item.trim()).filter(Boolean);
      const lines = [...new Set(picks.flatMap((pick) => GITIGNORE_PRESETS[pick] || []))];
      return { title: '.gitignore', text: lines.join('\n') || '# No preset matched', copy: lines.join('\n') || '# No preset matched' };
    },
  },

  'packagejson-generator': {
    fields: [
      { id: 'name', label: 'Package name', type: 'text', default: 'psdkit-app', half: true },
      { id: 'version', label: 'Version', type: 'text', default: '1.0.0', half: true },
      { id: 'description', label: 'Description', type: 'text', default: 'A starter project generated by PSDKIT Pro' },
      { id: 'entry', label: 'Main entry', type: 'text', default: 'index.js', half: true },
      { id: 'license', label: 'License', type: 'text', default: 'MIT', half: true },
    ],
    compute(v) {
      const pkg = {
        name: v.name,
        version: v.version,
        description: v.description,
        main: v.entry,
        type: 'module',
        scripts: { dev: 'node index.js', test: 'echo "Add tests"' },
        license: v.license,
      };
      return { title: 'package.json', text: JSON.stringify(pkg, null, 2), copy: JSON.stringify(pkg, null, 2) };
    },
  },

  'readme-generator': {
    fields: [
      { id: 'name', label: 'Project name', type: 'text', default: 'PSDKIT Project' },
      { id: 'summary', label: 'Short summary', type: 'textarea', rows: 3, default: 'Describe what your project does and why it exists.' },
      { id: 'install', label: 'Install command', type: 'text', default: 'npm install', half: true },
      { id: 'run', label: 'Run command', type: 'text', default: 'npm run dev', half: true },
    ],
    compute(v) {
      const out = `# ${v.name}\n\n${v.summary}\n\n## Features\n- Fast setup\n- Clear purpose\n- Easy to extend\n\n## Installation\n\n\`\`\`bash\n${v.install}\n\`\`\`\n\n## Usage\n\n\`\`\`bash\n${v.run}\n\`\`\`\n\n## License\nMIT`;
      return { title: 'README.md', text: out, copy: out };
    },
  },

  'linux-permissions': {
    mount(container) {
      const perms = ['owner', 'group', 'public'].map((role) => ({ role, r: el('input', { type: 'checkbox', checked: true }), w: el('input', { type: 'checkbox' }), x: el('input', { type: 'checkbox' }) }));
      const out = el('div.stat-grid');
      const render = () => {
        const value = perms.map((set) => Number(set.r.checked) * 4 + Number(set.w.checked) * 2 + Number(set.x.checked)).join('');
        const symbolic = perms.map((set) => `${set.r.checked ? 'r' : '-'}${set.w.checked ? 'w' : '-'}${set.x.checked ? 'x' : '-'}`).join('');
        out.innerHTML = '';
        [['chmod', value], ['symbolic', symbolic], ['command', `chmod ${value} file`]].forEach(([label, val]) => out.append(el('div.stat', el('div.k', { text: label }), el('div.v', { text: val, style: { fontSize: '18px' } }))));
      };
      container.append(...perms.map((set) => el('div.card', el('div', { style: { fontWeight: 800, marginBottom: '8px' }, text: set.role }), el('label.checkline', set.r, 'Read'), el('label.checkline', set.w, 'Write'), el('label.checkline', set.x, 'Execute'))), out);
      container.querySelectorAll('input').forEach((input) => input.addEventListener('change', render));
      render();
    },
  },

  'http-methods-headers': { mount: referenceTool({ intro: 'A quick refresher on the HTTP methods and headers you use most often.', sections: HTTP_METHOD_HEADER_SECTIONS }) },
  'design-patterns': { mount: referenceTool({ intro: 'Classic software design patterns and the problems they solve.', sections: DESIGN_PATTERN_SECTIONS }) },
  'markdown-cheatsheet': { mount: referenceTool({ intro: 'Markdown syntax at a glance, with copy-ready examples.', sections: MARKDOWN_CHEATSHEET_SECTIONS }) },
};
