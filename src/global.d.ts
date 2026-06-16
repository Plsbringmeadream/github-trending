interface Window {
  openAiSummary: (repo: any) => void;
  openAiBatchSummary: (repos: any[]) => void;
  openAiRecommend: (repos: any[]) => void;
  openAiCompare: (repo1: any, repo2: any) => void;
  __toggleFavorite: (fullName: string) => void;
  __getCompareState: () => { selected: any[]; clear: () => void };
}
