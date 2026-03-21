"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { analyzeStyle } from "@/lib/api";
import { validatePastPosts } from "@/lib/validation";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type SetupData = {
  account_name: string;
  target_audience: string;
  purpose: string;
  past_posts: string[];
  past_hashtags: string;
  custom_instructions: string;
  skipped_posts: boolean;
  skipped_hashtags: boolean;
};

const TOTAL_STEPS = 6;

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SetupData>({
    account_name: "",
    target_audience: "",
    purpose: "",
    past_posts: ["", "", "", "", ""],
    past_hashtags: "",
    custom_instructions: "",
    skipped_posts: false,
    skipped_hashtags: false,
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
        return true; // スキップ可能
      case 5:
        return true; // スキップ可能
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleSkip = useCallback(() => {
    if (step === 4) {
      setData((prev) => ({ ...prev, skipped_posts: true }));
    } else if (step === 5) {
      setData((prev) => ({ ...prev, skipped_hashtags: true }));
    }
    setStep((s) => s + 1);
    setError("");
  }, [step]);

  const handleNext = useCallback(async () => {
    setError("");

    if (step < TOTAL_STEPS) {
      if (step === 4) {
        const nonEmpty = data.past_posts.filter((p) => p.trim().length > 0);
        if (nonEmpty.length === 0) {
          setData((prev) => ({ ...prev, skipped_posts: true }));
        } else {
          setData((prev) => ({ ...prev, skipped_posts: false }));
        }
      }
      if (step === 5) {
        if (data.past_hashtags.trim().length === 0) {
          setData((prev) => ({ ...prev, skipped_hashtags: true }));
        } else {
          setData((prev) => ({ ...prev, skipped_hashtags: false }));
        }
      }
      setStep((s) => s + 1);
      return;
    }

    // Final step — analyze and save
    setLoading(true);

    try {
      const hasPosts = !data.skipped_posts &&
        data.past_posts.filter((p) => p.trim().length > 0).length >= 5;
      const hasHashtags = !data.skipped_hashtags &&
        data.past_hashtags.trim().length > 0;

      const analysisResult = await analyzeStyle(
        hasPosts ? data.past_posts : [],
        hasHashtags ? data.past_hashtags : "",
        data.account_name.trim(),
        data.target_audience.trim(),
        data.purpose.trim()
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      {loading && <LoadingOverlay status="analyzing" />}

      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">初期設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            ステップ {step} / {TOTAL_STEPS}
          </p>
          <div className="mx-auto mt-3 flex max-w-xs gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-[#6C63FF]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#6C63FF]"
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#6C63FF]"
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#6C63FF]"
                autoFocus
              />
            </StepContent>
          )}

          {step === 4 && (
            <StepContent
              title="投稿文をコピペしてください"
              description="自分の過去の投稿文や、「こんな感じにしたい」と思う他のアカウントの投稿文でもOKです。AIが文体・トーンを分析して学習します。まだ参考にしたい投稿がない場合はスキップできます。"
            >
              <div className="flex flex-col gap-3">
                {data.past_posts.map((post, index) => (
                  <div key={index} className="relative">
                    <textarea
                      placeholder={`投稿文 ${index + 1}`}
                      value={post}
                      onChange={(e) => updatePost(index, e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none focus:border-[#6C63FF]"
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
                  className="rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm text-gray-400 hover:border-[#6C63FF]/50 hover:text-[#6C63FF]"
                >
                  + 投稿文を追加
                </button>
              </div>
            </StepContent>
          )}

          {step === 5 && (
            <StepContent
              title="ハッシュタグを貼り付けてください"
              description="自分が使っているハッシュタグや、参考にしたい他のアカウントのハッシュタグでもOKです。AIが最適なハッシュタグ戦略を作成します。参考にしたいハッシュタグがない場合はスキップできます。"
            >
              <textarea
                placeholder={"例:\n#マルヤス工業 #製造業 #理系就活 #工場見学\n#ものづくり #機械加工 #企業公式"}
                value={data.past_hashtags}
                onChange={(e) => updateField("past_hashtags", e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#6C63FF]"
                autoFocus
              />
            </StepContent>
          )}

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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#6C63FF]"
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
                className="flex-1 rounded-xl bg-[#6C63FF] py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {step === TOTAL_STEPS
                  ? "AIで分析して設定完了"
                  : "次へ"}
              </button>
            </div>

            {(step === 4 || step === 5) && (
              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-[#6C63FF]"
              >
                スキップ（AIが最適なものを提案します）
              </button>
            )}
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
