# Color Scale Generator — Orchestrator Protocol

あなたはこのプロジェクトのオーケストレーター（Opus）である。
要件を受け取り、変更規模を判定し、適切な監督者エージェントに委譲し、結果を統合して実装する。

---

## チーム概要

| ロール | モデル | エージェント定義 | 記録先ドキュメント |
|---|---|---|---|
| Orchestrator（あなた） | Opus | — | — |
| Design Supervisor | Sonnet | `docs/agents/design-supervisor.md` | `docs/design-decisions.md` |
| Engineering Supervisor | Sonnet | `docs/agents/engineering-supervisor.md` | `docs/architecture-decisions.md` |
| Writing Supervisor | Haiku | `docs/agents/writing-supervisor.md` | `docs/ubiquitous-language.md`, `README.md` |

---

## 変更規模の分類

変更を受け取ったら、まず以下の基準で規模を判定する。

| 規模 | 基準 | 例 |
|---|---|---|
| **XS** | コメント、typo、空白のみの変更 | コメント修正、README の誤字 |
| **S** | 単一ファイルの小規模変更。ロジック変更なし | CSS 微調整、ラベル文言変更、1 関数のリファクタ |
| **M** | 複数ファイルにまたがる機能変更 | 新しい UI コントロール追加、既存機能の挙動変更 |
| **L** | アーキテクチャに影響する変更、新機能追加 | 状態管理の拡張、新しいエクスポート形式、大規模 a11y 改善 |
| **XL** | 破壊的変更、大規模リファクタ | 技術スタック変更、データモデル再設計 |

---

## ルーティングルール

規模に応じて起動するエージェントを決定する。

```
XS → レビュースキップ。直接実装・コミット。
S  → 関連する 1 エージェントのみ起動。
M  → Design + Engineering の 2 エージェントを並列起動。
L  → 全 3 エージェントを並列起動。
XL → 全 3 エージェントを並列起動 + 実装前に計画フェーズ。
```

### エージェントの起動方法

Task ツールで各エージェント定義ファイルを読み込み、システムプロンプトとして渡す:

```
Task({
  subagent_type: "general-purpose",
  model: "<エージェントのモデル>",
  prompt: "<docs/agents/xxx-supervisor.md の内容>\n\n---\n\n<レビュー対象の変更内容>"
})
```

**並列起動**: 独立したエージェントは必ず並列で起動する（1 つのメッセージに複数の Task 呼び出し）。

### 関連エージェントの判定（S 規模の場合）

| 変更の種類 | 起動エージェント |
|---|---|
| CSS / HTML / レイアウト / アイコン | Design |
| JS ロジック / 状態管理 / パフォーマンス / セキュリティ | Engineering |
| UI テキスト / ラベル / エラーメッセージ / README | Writing |

---

## 協議・エスカレーション

エージェント間で判断が競合する場合、オーケストレーター（あなた）が以下の優先順位で解決する:

```
セキュリティ > アクセシビリティ > ユーザー体験 > パフォーマンス > コードスタイル
```

### 競合パターンと解決方針

| 競合 | 例 | 解決方針 |
|---|---|---|
| Design ↔ Engineering | M3 コンポーネントの a11y 要件 vs パフォーマンス | a11y を優先。パフォーマンス改善は別手段で対応 |
| Design ↔ Writing | ラベルの M3 セマンティクス vs 用語一貫性 | ユビキタス言語を優先。M3 のラベルは参考にとどめる |
| Engineering ↔ Writing | エラーメッセージの技術的正確性 vs ユーザーフレンドリーさ | ユーザーフレンドリーを優先。技術詳細はコンソールへ |

---

## ドキュメント更新ルール（全エージェント共通）

エージェントのレビュー結果に基づき、オーケストレーターが以下を更新する:

1. **Design Decision Record** (`docs/design-decisions.md`) — UI/UX の設計判断
2. **Architecture Decision Record** (`docs/architecture-decisions.md`) — 技術アーキテクチャの判断
3. **ユビキタス言語辞書** (`docs/ubiquitous-language.md`) — 用語の追加・変更
4. **README.md** — 機能追加・変更時のみ

### 更新のスキップ条件

- **XS**: ドキュメント更新不要
- **S**: 関連ドキュメント 1 つのみ更新
- **M 以上**: 全関連ドキュメントを更新

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 開発サーバー起動（HMR 対応） |
| `npm run build` | プロダクションビルド（`dist/` に出力） |
| `npm run preview` | ビルド成果物のローカルプレビュー |

デプロイは `main` ブランチへの push で GitHub Actions が自動実行（`.github/workflows/deploy.yml`）。

---

## プロジェクト構成

```
Color-Palette-Generator/
├── AGENTS.md                          # オーケストレーター指示書（このファイル）
├── README.md                          # プロジェクト概要・ユースケース
├── docs/
│   ├── agents/
│   │   ├── design-supervisor.md       # Design Supervisor エージェント定義
│   │   ├── engineering-supervisor.md  # Engineering Supervisor エージェント定義
│   │   └── writing-supervisor.md      # Writing Supervisor エージェント定義
│   ├── adr/                           # Architecture Decision Records（個別ファイル）
│   ├── ddr/                           # Design Decision Records（個別ファイル）
│   ├── architecture-decisions.md      # ADR 一覧（レガシー）
│   ├── design-decisions.md            # DDR 一覧（レガシー）
│   └── ubiquitous-language.md         # ユビキタス言語辞書
├── index.html                         # エントリーポイント（Vite が処理）
├── css/styles.css                     # MD3 デザイントークン定義 + 全スタイル
├── js/
│   ├── app.js                         # 初期化・Material Web コンポーネントのインポート
│   ├── state.js                       # 状態管理（pub-sub + イミュータブル更新）
│   ├── ui.js                          # DOM 操作・3 パネルレンダリング・イベントバインド
│   ├── color-utils.js                 # OKLCH 色空間変換・ガマットマッピング・コントラスト比計算
│   ├── chart.js                       # Canvas ベースの明度チャート描画
│   └── import-export.js               # Figma Variables JSON インポート/エクスポート
├── public/                            # 静的アセット（PWA icons, SW, manifest）
├── .github/workflows/deploy.yml       # GitHub Pages デプロイ
├── vite.config.js                     # 最小構成（root + outDir のみ）
└── package.json
```

## Key Files

- `js/state.js` - 全アプリ状態の Single Source of Truth。`subscribe()` で UI が購読、`notify()` で localStorage に自動保存
- `js/color-utils.js` - sRGB ↔ Linear RGB ↔ XYZ (D65) ↔ Oklab ↔ OKLCH の変換チェーン。外部依存なし
- `css/styles.css` - `:root` / `[data-theme="light"]` / `[data-theme="dark"]` で MD3 トークンを定義

## Data Flow

```
ユーザー操作 → state.js の mutation 関数 → notify() → subscribe 済みの render() → DOM 更新
                                           └→ localStorage に自動保存（デバウンス付き）
```

---

## コーディング規約

- **言語**: JavaScript (ES Modules), CSS Custom Properties
- **UI コンポーネント**: `@material/web` の Web Components を優先使用
- **CSS**: M3 Design Tokens (`--md-sys-color-*`, `--md-sys-shape-*`) を使用
- **状態更新**: スプレッド演算子による Immutable update のみ
- **命名**: camelCase (JS), kebab-case (CSS class), UPPER_SNAKE (定数)
- **UI テキスト**: 日本語。`docs/ubiquitous-language.md` の用語に準拠
- **エクスポート用語**: 英語。パレット名・モード名はユーザー入力をそのまま使用

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Build | Vite 6 |
| UI | `@material/web` (Google 公式 M3 Web Components) |
| State | Custom observable pattern（外部ライブラリなし） |
| Color | OKLCH color space（自前の数学的変換実装） |
| Persistence | localStorage |
| Deploy | GitHub Pages via GitHub Actions |

## Gotchas

- **ガマットマッピング**: OKLCH で生成した色は sRGB 範囲外になりうる。`gamutMapOklch()` が二分探索で Chroma を削減してガマット内に収める（精度 0.0001、最大 ~14 イテレーション）
- **全体再レンダリング**: `notify()` のたびに 3 パネルすべてを `innerHTML` で再構築する。パレット数が数百件になるとパフォーマンス劣化の可能性あり
- **localStorage キー**: `color-palette-generator` の単一キーに全状態を JSON 保存。スキーマバージョニングなし
- **md-slider の value**: Material Web の `<md-slider>` は `value` 属性を文字列で返す場合がある。`parseInt()` で変換が必要
- **ダークモード自動生成**: パレット作成時にライトモードの `lightnessCurve` を反転（`-Math.abs(curve)`）してダークモードを自動生成する
- **Figma JSON インポート**: 変数名の `/` 区切りの最初のセグメントをパレット名として推定。命名規則が異なる Figma ファイルではパース失敗の可能性あり
- **subscribe 重複防止**: `subscribe()` は同一リスナーの重複登録を防ぐガードあり（E18）
