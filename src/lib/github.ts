export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  created_at: string;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface TrendingRepo extends GitHubRepo {
  stars_gained: number;
}

const GITHUB_API = 'https://api.github.com/search/repositories';

function getDateRange(days: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export async function fetchTrendingRepos(
  language?: string,
  days: number = 30,
  page: number = 1,
  perPage: number = 30,
  sort: string = 'stars',
  token?: string
): Promise<{ repos: GitHubRepo[]; totalCount: number }> {
  const since = getDateRange(days);
  let query = `created:>${since}`;
  if (language && language !== 'All') {
    query += `+language:${encodeURIComponent(language)}`;
  }

  const sortParam = sort === 'updated' ? 'updated' : 'stars';
  const url = `${GITHUB_API}?q=${query}&sort=${sortParam}&order=desc&page=${page}&per_page=${perPage}`;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-trending-app',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please set GITHUB_TOKEN environment variable.');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data: GitHubSearchResponse = await response.json();

  return {
    repos: data.items,
    totalCount: Math.min(data.total_count, 1000), // GitHub API caps at 1000
  };
}

export function formatStars(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count.toString();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'Scala': '#c22d40',
    'Shell': '#89e051',
    'Dart': '#00B4AB',
    'Lua': '#000080',
    'Haskell': '#5e5086',
    'R': '#198CE7',
    'Julia': '#a270ba',
    'Zig': '#ec915c',
    'Elixir': '#6e4a7e',
    'Clojure': '#db5855',
    'Erlang': '#B83998',
    'OCaml': '#3be133',
    'F#': '#b845fc',
    'Vue': '#41b883',
    'Svelte': '#ff3e00',
  };
  return colors[language || ''] || '#8b949e';
}

export const LANGUAGES = [
  'All', 'Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'Java', 'C++',
  'Swift', 'Kotlin', 'PHP'
];

export const SORT_OPTIONS = [
  { value: 'stars', label: '⭐ Stars' },
  { value: 'updated', label: '🕐 Recently Updated' },
  { value: 'name', label: '🔤 Name' },
];

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'ai',
    label: 'AI / ML',
    icon: '🧠',
    keywords: ['ai', 'artificial-intelligence', 'machine-learning', 'deep-learning', 'llm', 'gpt', 'neural', 'transformer', 'nlp', 'computer-vision', 'ml', 'diffusion', 'chatgpt', 'openai', 'langchain', 'rag', 'embedding', 'fine-tune', 'inference', 'model', 'agent', 'copilot'],
  },
  {
    id: 'web',
    label: 'Web Dev',
    icon: '🌐',
    keywords: ['web', 'frontend', 'backend', 'fullstack', 'react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'astro', 'remix', 'website', 'css', 'tailwind', 'ui', 'component', 'dashboard', 'landing-page'],
  },
  {
    id: 'devtools',
    label: 'DevTools',
    icon: '🛠️',
    keywords: ['cli', 'terminal', 'tool', 'developer-tools', 'devtools', 'linter', 'formatter', 'debugger', 'testing', 'ci-cd', 'deployment', 'docker', 'kubernetes', 'devops', 'git', 'monitoring', 'logging', 'workflow', 'automation', 'scaffold', 'boilerplate'],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: '⚡',
    keywords: ['productivity', 'note-taking', 'todo', 'task', 'project-management', 'calendar', 'timer', 'pomodoro', 'knowledge', 'obsidian', 'notion', 'markdown', 'editor', 'writing', 'document', 'organize', 'personal', 'life', 'habit', 'tracker'],
  },
  {
    id: 'data',
    label: 'Data / DB',
    icon: '📊',
    keywords: ['database', 'sql', 'nosql', 'postgres', 'mysql', 'redis', 'mongodb', 'sqlite', 'data', 'analytics', 'visualization', 'chart', 'dashboard', 'etl', 'pipeline', 'pandas', 'spark', 'data-science', 'data-engineering'],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: '📱',
    keywords: ['mobile', 'android', 'ios', 'react-native', 'flutter', 'swiftui', 'kotlin-multiplatform', 'expo', 'app', 'smartphone', 'tablet', 'cross-platform'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    keywords: ['security', 'cybersecurity', 'vulnerability', 'pentest', 'ctf', 'encryption', 'authentication', 'authorization', 'oauth', 'jwt', 'firewall', 'malware', 'forensics', 'privacy', 'zero-trust'],
  },
  {
    id: 'blockchain',
    label: 'Web3',
    icon: '⛓️',
    keywords: ['blockchain', 'web3', 'crypto', 'ethereum', 'solidity', 'defi', 'nft', 'smart-contract', 'solana', 'bitcoin', 'dao', 'token', 'dapp'],
  },
];

export function classifyRepo(repo: { description: string | null; topics: string[]; name: string }): string[] {
  const text = [
    repo.name,
    repo.description || '',
    ...repo.topics,
  ].join(' ').toLowerCase();

  return CATEGORIES
    .filter(cat => cat.keywords.some(kw => text.includes(kw)))
    .map(cat => cat.id);
}
