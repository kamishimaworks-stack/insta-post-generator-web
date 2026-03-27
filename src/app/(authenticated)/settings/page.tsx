"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { analyzeStyle, modifyPrompt } from "@/lib/api";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import type { ProfileInput } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInput>({
    account_name: "",
    target_audience: "",
    purpose: "",
    genre: "",
    follower_scale: "",
    competitors: "",
    tone: "",
    fixed_hashtags: "",
    custom_instructions: "",
  });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modifying, setModifying] = useState<"tone" | "hashtag" | null>(null);
  const [message, setMessage] = useState("");

  const [toneRequest, setToneRequest] = useState("");
  const [hashtagRequest, setHashtagRequest] = useState("");
  const [toneExpanded, setToneExpanded] = useState(false);
  const [hashtagExpanded, setHashtagExpanded] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfileId(data.id);
      setProfile({
        account_name: data.account_name,
        target_audience: data.target_audience,
        purpose: data.purpose,
        genre: data.genre ?? "",
        follower_scale: data.follower_scale ?? "",
        competitors: data.competitors ?? "",
        tone: data.tone,
        fixed_hashtags: data.fixed_hashtags,
        custom_instructions: data.custom_instructions,
      });
    }
    setLoading(false);
  };

  const handleReanalyze = useCallback(async () => {
    if (!profileId) return;
    setAnalyzing(true);
    setMessage("");

    try {
      // まず基本情報を保存
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          account_name: profile.account_name,
          target_audience: profile.target_audience,
          purpose: profile.purpose,
          genre: profile.genre,
          follower_scale: profile.follower_scale,
          competitors: profile.competitors,
          custom_instructions: profile.custom_instructions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      // 再分析（基本情報ベースで指示書を再生成）
      const analysisResult = await analyzeStyle(
        [],
        "",
        profile.account_name.trim(),
        profile.target_audience.trim(),
        profile.purpose.trim(),
        profile.genre.trim(),
        profile.follower_scale.trim(),
        profile.competitors.trim()
      );

      if (!analysisResult.success) {
        setMessage(analysisResult.error?.message ?? "再分析に失敗しました");
        setAnalyzing(false);
        return;
      }

      // 分析結果を保存
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          tone: analysisResult.data!.tone_analysis,
          fixed_hashtags: analysisResult.data!.hashtag_strategy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (updateError) {
        setMessage("保存に失敗しました");
      } else {
        setProfile((prev) => ({
          ...prev,
          tone: analysisResult.data!.tone_analysis,
          fixed_hashtags: analysisResult.data!.hashtag_strategy,
        }));
        setMessage("基本情報を保存し、指示書を再分析しました");
      }
    } catch {
      setMessage("エラーが発生しました");
    }

    setAnalyzing(false);
    setTimeout(() => setMessage(""), 5000);
  }, [profileId, profile]);

  const handleModifyPrompt = useCallback(
    async (type: "tone" | "hashtag") => {
      const request = type === "tone" ? toneRequest : hashtagRequest;
      const currentPrompt =
        type === "tone" ? profile.tone : profile.fixed_hashtags;

      if (!request.trim()) return;

      setModifying(type);
      setMessage("");

      const result = await modifyPrompt(currentPrompt, request.trim(), type);

      if (result.success && result.data) {
        setProfile((prev) => ({
          ...prev,
          [type === "tone" ? "tone" : "fixed_hashtags"]:
            result.data!.updated_prompt,
        }));
        if (type === "tone") setToneRequest("");
        else setHashtagRequest("");
        setMessage("AIが指示書を修正しました");
      } else {
        setMessage(result.error?.message ?? "修正に失敗しました");
      }

      setModifying(null);
      setTimeout(() => setMessage(""), 3000);
    },
    [toneRequest, hashtagRequest, profile.tone, profile.fixed_hashtags]
  );

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {(analyzing || modifying) && <LoadingOverlay status="analyzing" />}

      <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>

      <div className="flex flex-col gap-6">
        {/* 基本情報 */}
        <section>
          <h2 className="mb-3 text-base font-bold text-gray-700">基本情報</h2>
          <div className="flex flex-col gap-4">
            <BasicField
              label="アカウント名"
              value={profile.account_name}
              onChange={(v) =>
                setProfile((p) => ({ ...p, account_name: v }))
              }
              placeholder="例: マルヤス工業【公式】"
            />
            <BasicField
              label="ターゲット"
              value={profile.target_audience}
              onChange={(v) =>
                setProfile((p) => ({ ...p, target_audience: v }))
              }
              placeholder="例: 理系の大学生"
            />
            <BasicField
              label="投稿の目的"
              value={profile.purpose}
              onChange={(v) => setProfile((p) => ({ ...p, purpose: v }))}
              placeholder="例: 採用・フォロワー増加"
            />
            <BasicField
              label="ジャンル"
              value={profile.genre}
              onChange={(v) => setProfile((p) => ({ ...p, genre: v }))}
              placeholder="例: 製造業・工場紹介"
            />
            <BasicField
              label="フォロワー規模"
              value={profile.follower_scale}
              onChange={(v) =>
                setProfile((p) => ({ ...p, follower_scale: v }))
              }
              placeholder="例: 1,000〜5,000人"
            />
            <BasicField
              label="競合・参考アカウント"
              value={profile.competitors}
              onChange={(v) =>
                setProfile((p) => ({ ...p, competitors: v }))
              }
              placeholder="例: @kawasakimotors_jp"
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-600">
                その他の指示
              </label>
              <textarea
                value={profile.custom_instructions}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    custom_instructions: e.target.value,
                  }))
                }
                placeholder="例: リールが回る文章にしてほしい"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
              />
            </div>
            <button
              onClick={handleReanalyze}
              disabled={analyzing}
              className="rounded-xl bg-[#2563EB] py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {analyzing ? "分析中..." : "保存して再分析"}
            </button>
            <p className="text-xs text-gray-400">
              基本情報を保存し、トーン指示書とハッシュタグ戦略を再生成します
            </p>
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* トーン・スタイル */}
        <section>
          <h2 className="mb-3 text-base font-bold text-gray-700">
            トーン・スタイル（AI分析結果）
          </h2>

          <button
            onClick={() => setToneExpanded(!toneExpanded)}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            <span>現在の指示書を{toneExpanded ? "閉じる" : "表示する"}</span>
            <svg
              className={`h-4 w-4 transition-transform ${toneExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {toneExpanded && (
            <div className="mb-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {profile.tone || "まだ分析されていません"}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <textarea
              value={toneRequest}
              onChange={(e) => setToneRequest(e.target.value)}
              placeholder={"変更したいことを書いてください\n例: 絵文字をもっと減らして、フォーマルな文体にしてほしい"}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#2563EB]"
            />
            <button
              onClick={() => handleModifyPrompt("tone")}
              disabled={!toneRequest.trim() || modifying !== null}
              className="rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              AIでトーン指示書を修正
            </button>
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* ハッシュタグ戦略 */}
        <section>
          <h2 className="mb-3 text-base font-bold text-gray-700">
            ハッシュタグ＋キーワードSEO戦略（AI分析結果）
          </h2>

          <button
            onClick={() => setHashtagExpanded(!hashtagExpanded)}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            <span>現在の戦略書を{hashtagExpanded ? "閉じる" : "表示する"}</span>
            <svg
              className={`h-4 w-4 transition-transform ${hashtagExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {hashtagExpanded && (
            <div className="mb-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {profile.fixed_hashtags || "まだ分析されていません"}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <textarea
              value={hashtagRequest}
              onChange={(e) => setHashtagRequest(e.target.value)}
              placeholder={"変更したいことを書いてください\n例: #製造業 は必ず入れてほしい、地域タグは不要"}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#2563EB]"
            />
            <button
              onClick={() => handleModifyPrompt("hashtag")}
              disabled={!hashtagRequest.trim() || modifying !== null}
              className="rounded-xl bg-[#2563EB] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              AIでハッシュタグ戦略を修正
            </button>
          </div>
        </section>

        {message && (
          <p
            className={`text-sm ${
              message.includes("失敗") || message.includes("エラー")
                ? "text-red-500"
                : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        <hr className="border-gray-200" />

        <button
          onClick={handleLogout}
          className="rounded-xl border border-red-400 py-3 text-base font-semibold text-red-500 hover:bg-red-50"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

function BasicField({
  label,
  value,
  onChange,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-600">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
      />
    </div>
  );
}
