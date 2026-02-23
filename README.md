# Color Scale Generator

OKLCH 色空間に基づくカラーパレットジェネレーター。
Figma Variables (DTCG JSON) へのエクスポートに対応し、デザインシステムの色定義ワークフローを効率化する。

**Live Demo**: https://gxasu.github.io/Color-Palette-Generator/

---

## 特徴

- **OKLCH 色空間** — 知覚均等な色空間で、人間の色知覚に忠実なスケールを生成
- **Alpha スケール** — 同一色の透明度バリエーション（例: white 5%〜100%）を作成
- **マルチモード** — 1つのパレットに複数モード（Default, Dark 等）を定義。Figma Variables の Mode と1対1対応
- **インタラクティブチャート** — 明度/透明度カーブをドラッグで直接編集
- **Figma 連携** — DTCG フォーマットで全モードを単一 JSON にエクスポート。Figma にそのままインポート可能
- **WCAG コントラスト比** — 各ステップの背景コントラストをリアルタイム表示（AAA / AA / A / Fail）
- **PWA** — オフライン対応。スマホのホーム画面に追加してネイティブアプリのように使用可能
- **Material Design 3** — Google の M3 デザインシステムに準拠した UI

---

## ユースケース

### 1. デザインシステムの色定義

ベースカラーを選び、ステップ数と明度カーブを調整してスケールを生成。
ステップ名（100, 200, ...）を自由に編集し、Figma Variables としてエクスポート。

### 2. ライト/ダークモード対応

1つのパレットに複数モードを追加。
Default モードでライトテーマの色を定義し、追加モードでダークテーマの色を定義。
エクスポートすると1ファイルに全モードが含まれ、Figma にインポートすれば自動で Mode が作成される。

### 3. 透明度ベースのオーバーレイスケール

Alpha パレットで白や黒の透明度スケールを作成。
例: `white-alpha` (5%, 10%, 20%, ... 100%) → Overlay や Surface Tint に使用。

### 4. アクセシビリティ検証

コントラスト比テーブルで、各ステップが WCAG 2.1 の AA / AAA 基準を満たすか即座に確認。
ライト・ダーク背景それぞれに対するコントラスト比を並列表示。

---

## 使い方

### パレットの作成

1. 左パネルの「追加」でカラーパレットを作成（ランダムなベースカラー）
2. 「Alpha」で透明度スケールを作成（デフォルト: 白）
3. 右パネルでベースカラー、カラー数、明度カーブを調整
4. 中央のチャートでステップごとの値をドラッグ編集

### モードの管理

1. 右パネル下部「モード」セクションで現在のモードを確認
2. `+` ボタンでモードを追加（現在のモードの色がコピーされる）
3. モード名をクリックして編集
4. モードタブをクリックして切り替え

### エクスポート / インポート

1. ヘッダーの「エクスポート」で DTCG JSON をダウンロード（全モード含む）
2. Figma で Local Variables → Import → JSON ファイルを選択
3. 「インポート」で既存の JSON ファイルを読み込み

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| UI コンポーネント | `@material/web` (Google 公式 M3 Web Components) |
| ビルドツール | Vite 6 |
| 色空間演算 | OKLCH 自前実装 (sRGB ↔ Linear RGB ↔ XYZ ↔ OKLAB ↔ OKLCH) |
| 状態管理 | Custom Observable Pattern (Immutable updates) |
| 永続化 | localStorage |
| PWA | Service Worker + Web App Manifest |
| デプロイ | GitHub Pages + GitHub Actions |

---

## プロジェクト構成

```
├── CLAUDE.md                       # エージェントチーム・プロトコル
├── README.md                       # このファイル
├── docs/
│   ├── design-decisions.md         # Design Decision Record (DDR)
│   ├── architecture-decisions.md   # Architecture Decision Record (ADR)
│   └── ubiquitous-language.md      # ユビキタス言語辞書
├── index.html                      # エントリーポイント
├── css/styles.css                  # M3 トークンベースのスタイル
├── js/
│   ├── app.js                      # アプリ初期化
│   ├── state.js                    # 状態管理
│   ├── ui.js                       # UI レンダリング
│   ├── color-utils.js              # OKLCH 色空間変換
│   ├── chart.js                    # インタラクティブチャート
│   └── import-export.js            # Figma JSON 入出力
├── public/                         # PWA アセット
│   ├── manifest.json
│   ├── sw.js
│   └── icon-*.{svg,png}
├── vite.config.js
└── package.json
```

---

## 開発

```bash
npm install
npm run dev       # 開発サーバー起動
npm run build     # プロダクションビルド
npm run preview   # ビルド結果のプレビュー
```

---

## ドキュメント

- [Design Decision Record](docs/design-decisions.md) — UI / UX の設計判断
- [Architecture Decision Record](docs/architecture-decisions.md) — 技術アーキテクチャの判断
- [ユビキタス言語辞書](docs/ubiquitous-language.md) — プロジェクト共通用語の定義
