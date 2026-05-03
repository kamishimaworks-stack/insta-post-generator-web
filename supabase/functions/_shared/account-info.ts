export type AccountInfo = {
  account_name: string;
  target_audience: string;
  purpose: string;
  genre: string;
  follower_scale: string;
  competitors: string;
};

const LABELS: ReadonlyArray<readonly [keyof AccountInfo, string]> = [
  ["account_name", "アカウント名"],
  ["target_audience", "ターゲット層"],
  ["purpose", "投稿の目的"],
  ["genre", "ジャンル"],
  ["follower_scale", "フォロワー規模"],
  ["competitors", "競合・参考アカウント"],
];

export function formatAccountInfo(info: AccountInfo): string {
  const lines: string[] = [];
  for (const [key, label] of LABELS) {
    const value = info[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    lines.push(`${label}: ${trimmed}`);
  }
  if (lines.length === 0) return "";
  return `【アカウント情報】\n${lines.join("\n")}`;
}
