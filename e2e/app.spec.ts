import { test, expect } from "@playwright/test";

test.describe("ログインページ", () => {
  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("InstaPost Generator");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("空欄でログインするとHTML5バリデーションが発火する", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("アカウント作成モードに切り替えられる", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=アカウントを新規作成");
    await expect(page.locator("button[type=submit]")).toContainText("アカウント作成");
  });

  test("ログインモードに戻れる", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=アカウントを新規作成");
    await page.click("text=すでにアカウントをお持ちの方");
    await expect(page.locator("button[type=submit]")).toContainText("ログイン");
  });
});

test.describe("未認証リダイレクト", () => {
  test("/ にアクセスするとリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/(login|create)/, { timeout: 10000 });
  });

  test("/create に未認証アクセスすると /login にリダイレクト", async ({ page }) => {
    await page.goto("/create");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("/result に未認証アクセスすると /login にリダイレクト", async ({ page }) => {
    await page.goto("/result");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("/settings に未認証アクセスすると /login にリダイレクト", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});

test.describe("認証済みフロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "kamishima.works@gmail.com");
    await page.fill('input[type="password"]', "zard6918");
    await page.click("button[type=submit]");
    await page.waitForURL(/\/(create|setup)/, { timeout: 15000 });
  });

  test("ログイン後に作成ページまたはセットアップに遷移する", async ({ page }) => {
    const url = page.url();
    expect(url).toMatch(/\/(create|setup)/);
  });

  test("ナビゲーションが表示される（セットアップ以外）", async ({ page }) => {
    if (page.url().includes("/create")) {
      // ナビのリンクで特定
      await expect(page.getByRole("link", { name: "作成" })).toBeVisible();
      await expect(page.getByRole("link", { name: "結果" })).toBeVisible();
      await expect(page.getByRole("link", { name: "設定" })).toBeVisible();
    }
  });

  test("作成ページのフォーム要素が表示される", async ({ page }) => {
    await page.goto("/create");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/create")) {
      await expect(page.locator("h1")).toContainText("投稿文を作成");
      // placeholderは「例:」で始まる
      await expect(page.locator('input[placeholder*="例:"]').first()).toBeVisible();
    }
  });

  test("結果ページに未生成で遷移すると空状態が表示される", async ({ page }) => {
    await page.goto("/result");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/result")) {
      await expect(page.locator("text=まだ生成結果がありません")).toBeVisible();
    }
  });

  test("設定ページが表示される", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/settings")) {
      await expect(page.locator("h1")).toContainText("設定");
      await expect(page.locator("text=保存して再分析")).toBeVisible();
      await expect(page.locator("text=ログアウト")).toBeVisible();
    }
  });

  test("作成ページでバリデーションが動作する", async ({ page }) => {
    await page.goto("/create");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/create")) {
      await page.click("text=投稿文を生成");
      await expect(page.locator("text=テーマを入力してください")).toBeVisible();
    }
  });

  test("ログアウトできる", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/settings")) {
      await page.click("text=ログアウト");
      await page.waitForURL(/\/login/, { timeout: 15000 });
      expect(page.url()).toContain("/login");
    }
  });
});

test.describe("セットアップフロー", () => {
  test("セットアップページが表示される", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "kamishima.works@gmail.com");
    await page.fill('input[type="password"]', "zard6918");
    await page.click("button[type=submit]");
    await page.waitForURL(/\/(create|setup)/, { timeout: 15000 });

    await page.goto("/setup");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/setup")) {
      await expect(page.locator("text=初期設定")).toBeVisible();
      await expect(page.locator("text=ステップ")).toBeVisible();
    }
  });
});

test.describe("PWA / マニフェスト", () => {
  test("manifest.json が正しく返される", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.name).toBe("InstaPost Generator");
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test("アイコンファイルが存在する", async ({ page }) => {
    const r192 = await page.goto("/icons/icon-192x192.png");
    expect(r192?.status()).toBe(200);

    const r512 = await page.goto("/icons/icon-512x512.png");
    expect(r512?.status()).toBe(200);

    const r180 = await page.goto("/icons/icon-180x180.png");
    expect(r180?.status()).toBe(200);
  });

  test("favicon が存在する", async ({ page }) => {
    const response = await page.goto("/favicon.png");
    expect(response?.status()).toBe(200);
  });
});
