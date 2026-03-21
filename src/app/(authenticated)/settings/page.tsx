"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { ProfileInput } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInput>({
    account_name: "",
    target_audience: "",
    purpose: "",
    tone: "",
    fixed_hashtags: "",
    custom_instructions: "",
  });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
        tone: data.tone,
        fixed_hashtags: data.fixed_hashtags,
        custom_instructions: data.custom_instructions,
      });
    }
    setLoading(false);
  };

  const handleSave = useCallback(async () => {
    if (!profileId) return;
    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq("id", profileId);

    setSaving(false);
    setMessage(error ? "保存に失敗しました" : "設定を保存しました");
    setTimeout(() => setMessage(""), 3000);
  }, [profileId, profile]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const handleResetSetup = useCallback(() => {
    router.push("/setup");
  }, [router]);

  const updateField = useCallback(
    (field: keyof ProfileInput, value: string) => {
      setProfile((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>

      <div className="flex flex-col gap-5">
        <Field
          label="アカウント名"
          value={profile.account_name}
          onChange={(v) => updateField("account_name", v)}
          placeholder="例: マルヤス工業【公式】"
        />
        <Field
          label="ターゲット"
          value={profile.target_audience}
          onChange={(v) => updateField("target_audience", v)}
          placeholder="例: 理系の大学生"
        />
        <Field
          label="投稿の目的"
          value={profile.purpose}
          onChange={(v) => updateField("purpose", v)}
          placeholder="例: 採用・フォロワー増加"
        />
        <Field
          label="トーン・スタイル（AI分析結果）"
          value={profile.tone}
          onChange={(v) => updateField("tone", v)}
          placeholder="初期設定で自動分析されます"
          multiline
        />
        <Field
          label="ハッシュタグ戦略（AI分析結果）"
          value={profile.fixed_hashtags}
          onChange={(v) => updateField("fixed_hashtags", v)}
          placeholder="初期設定で自動分析されます"
          multiline
        />
        <Field
          label="その他の指示"
          value={profile.custom_instructions}
          onChange={(v) => updateField("custom_instructions", v)}
          placeholder="例: リールが回る文章にしてほしい"
          multiline
        />

        {message && (
          <p
            className={`text-sm ${
              message.includes("失敗") ? "text-red-500" : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#6C63FF] py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>

        <button
          onClick={handleResetSetup}
          className="rounded-xl border border-[#6C63FF] py-3 text-base font-semibold text-[#6C63FF] hover:bg-[#6C63FF]/5"
        >
          初期設定をやり直す
        </button>

        <button
          onClick={handleLogout}
          className="mt-6 rounded-xl border border-red-400 py-3 text-base font-semibold text-red-500 hover:bg-red-50"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly multiline?: boolean;
}) {
  const className =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#6C63FF]";

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-600">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={className}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </div>
  );
}
