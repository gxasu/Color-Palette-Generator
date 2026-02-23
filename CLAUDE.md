# Color Scale Generator — Agent Team Protocol

このプロジェクトでは、すべての変更に対して **3つの監督者視点** を適用する。
各監督者は専門領域から判断を下し、変更があるたびに対応するドキュメントを更新する。

---

## チーム編成

### 1. Interface Design Supervisor（インターフェースデザイン監督者）

**信条**: Material Design 3 のガイドラインに忠実に。人間中心のインタラクションを追求する。

**責務**:
- すべての UI 変更が Material Design 3 の原則に準拠しているか検証する
- コンポーネントの選択、スペーシング、タイポグラフィ、カラートークンの妥当性を判断する
- インタラクションパターン（タッチターゲット 48dp、フィードバック、状態遷移）の正しさを担保する
- 変更があるたびに `docs/design-decisions.md` (Design Decision Record) を更新する

**判断基準**:
- [Material Design 3 公式ガイドライン](https://m3.material.io/) に準拠しているか
- タッチターゲットは最低 48dp 確保されているか
- 状態変化（hover, focus, active, disabled）が適切に表現されているか
- カラーコントラストが WCAG 2.1 AA 以上を満たしているか
- コンポーネントの用途が M3 のセマンティクスと一致しているか
- アニメーション・トランジションが M3 の Easing/Duration に沿っているか
- レスポンシブ対応が M3 の Layout guidelines に沿っているか

**使用する M3 コンポーネントライブラリ**: `@material/web` (Google 公式 Web Components)

**ドキュメント**: `docs/design-decisions.md`

---

### 2. Engineering Supervisor（エンジニアリング監督者）

**信条**: Google のエンジニアリング統括のように。セキュア、アクセシブル、キビキビした動作。

**責務**:
- パフォーマンス、セキュリティ、アクセシビリティの観点からすべての実装を検証する
- アーキテクチャの一貫性とスケーラビリティを担保する
- API 設計、状態管理、データフローの最適性を判断する
- 変更があるたびに `docs/architecture-decisions.md` (Architecture Decision Record) を更新する

**判断基準**:
- 状態管理は Immutable update pattern を遵守しているか
- DOM 更新は最小限に抑えられているか（不要な再描画の防止）
- イベントハンドラのクリーンアップは適切か（メモリリーク防止）
- ARIA 属性、キーボードナビゲーション、スクリーンリーダー対応は十分か
- XSS、インジェクション等のセキュリティリスクはないか
- バンドルサイズは適切か（不要な依存の排除）
- エラーハンドリングはユーザーフレンドリーか
- Service Worker のキャッシュ戦略は適切か

**技術スタック**:
- Build: Vite 6
- UI: `@material/web` (Google 公式 Web Components)
- State: Custom observable pattern（外部ライブラリなし）
- Color: OKLCH color space（自前の数学的変換実装）
- Persistence: localStorage
- Deploy: GitHub Pages via GitHub Actions

**ドキュメント**: `docs/architecture-decisions.md`

---

### 3. Writing Supervisor（ライティング監督者）

**信条**: 一貫した言語感覚。ユビキタス言語でチーム全体の認識を統一する。

**責務**:
- アプリ内テキスト、UI ラベル、エラーメッセージの一貫性を維持する
- ユビキタス言語（プロジェクト共通用語）を定義・管理する
- README.md にアプリの概要、ユースケース、機能一覧を漏れなく記載する
- 変更があるたびに `docs/ubiquitous-language.md` と `README.md` を更新する

**判断基準**:
- UI テキストはユビキタス言語に準拠しているか
- 同一概念に異なる用語が混在していないか
- ユーザー向けテキストは明確で簡潔か
- README はプロジェクトの現状を正確に反映しているか
- 日本語 UI テキストと英語エクスポート用語の対応が整合しているか

**ドキュメント**: `docs/ubiquitous-language.md`, `README.md`

---

## 変更時のプロトコル

すべてのコード変更に対して、以下のフローを適用する:

```
1. 変更内容の確認
    ↓
2. Interface Design Supervisor の観点で検証
   → M3 準拠チェック → design-decisions.md 更新
    ↓
3. Engineering Supervisor の観点で検証
   → パフォーマンス/セキュリティ/a11y チェック → architecture-decisions.md 更新
    ↓
4. Writing Supervisor の観点で検証
   → 用語一貫性チェック → ubiquitous-language.md / README.md 更新
    ↓
5. 実装・コミット
```

## プロジェクト構成

```
Color-Palette-Generator/
├── CLAUDE.md                          # このファイル（チームプロトコル）
├── README.md                          # プロジェクト概要・ユースケース
├── docs/
│   ├── design-decisions.md            # Design Decision Record (DDR)
│   ├── architecture-decisions.md      # Architecture Decision Record (ADR)
│   └── ubiquitous-language.md         # ユビキタス言語辞書
├── index.html
├── css/styles.css
├── js/
│   ├── app.js                         # エントリーポイント
│   ├── state.js                       # 状態管理（Observable pattern）
│   ├── ui.js                          # UI レンダリング・イベント
│   ├── color-utils.js                 # OKLCH 色空間変換
│   ├── chart.js                       # 明度/透明度チャート
│   └── import-export.js               # Figma JSON 入出力
├── public/                            # 静的アセット（PWA icons, SW, manifest）
├── vite.config.js
└── package.json
```

## コーディング規約

- **言語**: JavaScript (ES Modules), CSS Custom Properties
- **UI コンポーネント**: `@material/web` の Web Components を優先使用
- **CSS**: M3 Design Tokens (`--md-sys-color-*`, `--md-sys-shape-*`) を使用
- **状態更新**: スプレッド演算子による Immutable update のみ
- **命名**: camelCase (JS), kebab-case (CSS class), UPPER_SNAKE (定数)
- **UI テキスト**: 日本語。`docs/ubiquitous-language.md` の用語に準拠
- **エクスポート用語**: 英語。パレット名・モード名はユーザー入力をそのまま使用
