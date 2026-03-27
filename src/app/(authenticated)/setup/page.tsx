"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { analyzeStyle } from "@/lib/api";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type SetupData = {
  account_name: string;
  target_audience: string;
  purpose: string;
  genre: string;
  follower_scale: string;
  custom_instructions: string;
  past_posts: string[];
  past_hashtags: string;
  competitors: string;
  skipped_posts: boolean;
  skipped_hashtags: boolean;
  skipped_competitors: boolean;
};

const TOTAL_STEPS = 9;
const SKIPPABLE_STEPS = [7, 8, 9];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SetupData>({
    account_name: "",
    target_audience: "",
    purpose: "",
    genre: "",
    follower_scale: "",
    custom_instructions: "",
    past_posts: ["", "", "", "", ""],
    past_hashtags: "",
    competitors: "",
    skipped_posts: false,
    skipped_hashtags: false,
    skipped_competitors: false,
  });

  const updateField = useCallback(
    <K extends keyof SetupData>(field: K, value: SetupData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addPostField = useCallback(() => {
    setData((prev) => ({
      ...prev,
      past_posts: [...prev.past_posts, ""],
    }));
  }, []);

  const updatePost = useCallback((index: number, value: string) => {
    setData((prev) => ({
      ...prev,
      past_posts: prev.past_posts.map((p, i) => (i === index ? value : p)),
    }));
  }, []);

  const removePost = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      past_posts: prev.past_posts.filter((_, i) => i !== index),
    }));
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.account_name.trim().length > 0;
      case 2:
        return data.target_audience.trim().length > 0;
      case 3:
        return data.purpose.trim().length > 0;
      case 4:
        return data.genre.trim().length > 0;
      case 5:
        return data.follower_scale.trim().length > 0;
      case 6:
        return true; // 空欄OK
      case 7:
        return true; // スキップ可
      case 8:
        return true; // スキップ可
      case 9:
        return true; // スキップ可
      default:
        return false;
    }
  };

  const isCurrentStepEmpty = (): boolean => {
    switch (step) {
      case 7:
        return data.past_posts.filter((p) => p.trim().length > 0).length === 0;
      case 8:
        return data.past_hashtags.trim().length === 0;
      case 9:
        return data.competitors.trim().length === 0;
      default:
        return false;
    }
  };

  const getButtonLabel = (): string => {
    if (step === TOTAL_STEPS) {
      return isCurrentStepEmpty() ? "スキップしてAIで分析" : "AIで分析して設定完了";
    }
    if (SKIPPABLE_STEPS.includes(step) && isCurrentStepEmpty()) {
      return "スキップ";
    }
    return "次へ";
  };

  const handleNext = useCallback(async () => {
    setError("");

    if (step < TOTAL_STEPS) {
      // 投稿文: 空ならスキップ扱い
      if (step === 7) {
        const nonEmpty = data.past_posts.filter((p) => p.trim().length > 0);
        setData((prev) => ({ ...prev, skipped_posts: nonEmpty.length === 0 }));
      }
      // ハッシュタグ: 空ならスキップ扱い
      if (step === 8) {
        setData((prev) => ({
          ...prev,
          skipped_hashtags: data.past_hashtags.trim().length === 0,
        }));
      }
      // 競合: 空ならスキップ扱い
      if (step === 9) {
        setData((prev) => ({
          ...prev,
          skipped_competitors: data.competitors.trim().length === 0,
        }));
      }
      setStep((s) => s + 1);
      return;
    }

    // 最終ステップ — 分析して保存
    setLoading(true);

    try {
      const hasPosts =
        !data.skipped_posts &&
        data.past_posts.filter((p) => p.trim().length > 0).length >= 1;
      const hasHashtags =
        !data.skipped_hashtags && data.past_hashtags.trim().length > 0;

      const analysisResult = await analyzeStyle(
        hasPosts ? data.past_posts : [],
        hasHashtags ? data.past_hashtags : "",
        data.account_name.trim(),
        data.target_audience.trim(),
        data.purpose.trim(),
        data.genre.trim(),
        data.follower_scale.trim(),
        data.skipped_competitors ? "" : data.competitors.trim()
      );

      if (!analysisResult.success) {
        setError(analysisResult.error?.message ?? "分析に失敗しました");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("ログインしてください");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          account_name: data.account_name.trim(),
          target_audience: data.target_audience.trim(),
          purpose: data.purpose.trim(),
          genre: data.genre.trim(),
          follower_scale: data.follower_scale.trim(),
          competitors: data.skipped_competitors
            ? ""
            : data.competitors.trim(),
          tone: analysisResult.data!.tone_analysis,
          fixed_hashtags: analysisResult.data!.hashtag_strategy,
          custom_instructions: data.custom_instructions.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        setError("設定の保存に失敗しました");
        setLoading(false);
        return;
      }

      router.push("/create");
      router.refresh();
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  }, [step, data, router]);

  const followerOptions = [
    "〜1,000人",
    "1,000〜5,000人",
    "5,000〜1万人",
    "1万〜5万人",
    "5万〜10万人",
    "10万人以上",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      {loading && <LoadingOverlay status="analyzing" />}

      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">初期設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            ステップ {step} / {TOTAL_STEPS}
          </p>
          <div className="mx-auto mt-3 flex max-w-xs gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-[#2563EB]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {/* === 必須ステップ（1-5） === */}
          {step === 1 && (
            <StepContent
              title="アカウント名を教えてください"
              description="Instagramのアカウント名やブランド名を入力してください。"
            >
              <input
                type="text"
                placeholder="例: マルヤス工業【公式】"
                value={data.account_name}
                onChange={(e) => updateField("account_name", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 2 && (
            <StepContent
              title="ターゲットは誰ですか？"
              description="投稿を届けたい人を具体的に教えてください。"
            >
              <input
                type="text"
                placeholder="例: 理系の大学生、20代の転職希望者"
                value={data.target_audience}
                onChange={(e) => updateField("target_audience", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 3 && (
            <StepContent
              title="投稿の目的は？"
              description="何のためにInstagramに投稿していますか？"
            >
              <input
                type="text"
                placeholder="例: 採用・フォロワー増加・ブランド認知"
                value={data.purpose}
                onChange={(e) => updateField("purpose", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 4 && (
            <StepContent
              title="投稿のジャンルは？"
              description="アカウントのメインジャンルを教えてください。Instagramのアルゴリズムはジャンルごとにコンテンツを分類して推薦します。"
            >
              <input
                type="text"
                placeholder="例: 製造業・工場紹介、美容、グルメ、旅行、教育"
                value={data.genre}
                onChange={(e) => updateField("genre", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 5 && (
            <StepContent
              title="現在のフォロワー数は？"
              description="フォロワー規模によって最適な戦略が変わります。"
            >
              <div className="flex flex-col gap-2">
                {followerOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateField("follower_scale", option)}
                    className={`rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                      data.follower_scale === option
                        ? "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB] font-semibold"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#2563EB]/50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </StepContent>
          )}

          {/* === 任意ステップ（6: 空欄OK） === */}
          {step === 6 && (
            <StepContent
              title="その他のリクエスト"
              description="投稿文の生成にあたって、特別なリクエストがあれば入力してください。空欄でもOKです。"
            >
              <textarea
                placeholder={"例:\n・リールが回るような文章にしてほしい\n・絵文字を多めに使ってほしい\n・CTAを必ず入れてほしい\n・フランクな口調にしてほしい"}
                value={data.custom_instructions}
                onChange={(e) =>
                  updateField("custom_instructions", e.target.value)
                }
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {/* === スキップ可能ステップ（7-9） === */}
          {step === 7 && (
            <StepContent
              title="投稿文をコピペしてください"
              description="自分の過去の投稿文や、「こんな感じにしたい」と思う他のアカウントの投稿文でもOKです。AIが文体・トーンを分析して学習します。"
            >
              <div className="flex flex-col gap-3">
                {data.past_posts.map((post, index) => (
                  <div key={index} className="relative">
                    <textarea
                      placeholder={`投稿文 ${index + 1}`}
                      value={post}
                      onChange={(e) => updatePost(index, e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none focus:border-[#2563EB]"
                    />
                    {data.past_posts.length > 5 && (
                      <button
                        onClick={() => removePost(index)}
                        className="absolute right-2 top-2 rounded p-1 text-gray-300 hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addPostField}
                  className="rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm text-gray-400 hover:border-[#2563EB]/50 hover:text-[#2563EB]"
                >
                  + 投稿文を追加
                </button>
              </div>
            </StepContent>
          )}

          {step === 8 && (
            <StepContent
              title="ハッシュタグを貼り付けてください"
              description="自分が使っているハッシュタグや、参考にしたい他のアカウントのハッシュタグでもOKです。AIが最適なハッシュタグ戦略を作成します。"
            >
              <textarea
                placeholder={"例:\n#マルヤス工業 #製造業 #理系就活 #工場見学\n#ものづくり #機械加工 #企業公式"}
                value={data.past_hashtags}
                onChange={(e) => updateField("past_hashtags", e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 9 && (
            <StepContent
              title="競合・参考アカウントを教えてください"
              description="参考にしたいアカウントやライバルのアカウント名を入力してください。AIがキーワードやトーン戦略の参考にします。"
            >
              <textarea
                placeholder={"例:\n@kawasakimotors_jp\n@toyota_jp\n@honda_jp"}
                value={data.competitors}
                onChange={(e) => updateField("competitors", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </StepContent>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => {
                    setStep((s) => s - 1);
                    setError("");
                  }}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-base font-semibold text-gray-600 hover:bg-gray-50"
                >
                  戻る
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="flex-1 rounded-xl bg-[#2563EB] py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {getButtonLabel()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepContent({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-gray-500">{description}</p>
      {children}
    </div>
  );
}
