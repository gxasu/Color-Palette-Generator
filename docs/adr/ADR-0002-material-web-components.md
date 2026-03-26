# ADR-0002: Material Design 3（Material Web）の採用

## メタ情報

| 項目 | 値 |
|---|---|
| 番号 | ADR-0002 |
| 起票日 | 2026-03-26 |
| 起票者 | フロントエンド開発者 |
| ステータス | 承認 |
| 関連 DDR | DDR-0002 |
| 関連 UC | — |

## コンテキスト

UI コンポーネントライブラリの選定が必要。デザインツールとしての信頼感を持たせつつ、開発効率を確保するために、統一されたデザインシステムに基づくコンポーネントが求められた。

## 検討した選択肢

### 選択肢 A: Material Web（@material/web）

- 概要: Google 公式の Material Design 3 Web Components 実装
- 使用ライブラリ / API: `@material/web` npm パッケージ
- 外部依存: npm パッケージ 1 つ（`@material/web ^2.4.1`）
- メリット: Web Components ベースでフレームワーク非依存、MD3 準拠の一貫した UI、Google 公式サポート
- デメリット: コンポーネント数が限定的、カスタマイズに CSS カスタムプロパティの知識が必要
- ブラウザ対応: モダンブラウザ全般（Web Components 対応）

### 選択肢 B: 独自 CSS のみ

- 概要: 外部 UI ライブラリを使わず CSS のみでスタイリング
- 使用ライブラリ / API: なし
- 外部依存: 依存なし
- メリット: バンドルサイズ最小、完全な制御
- デメリット: 開発コスト大、アクセシビリティの自前実装が必要
- ブラウザ対応: 全ブラウザ対応

### 選択肢 C: Shoelace（Web Components）

- 概要: コミュニティ主導の Web Components ライブラリ
- 使用ライブラリ / API: `@shoelace-style/shoelace`
- 外部依存: npm パッケージ
- メリット: 豊富なコンポーネント、高いカスタマイズ性
- デメリット: Material Design とは異なるデザイン言語、コミュニティ依存
- ブラウザ対応: モダンブラウザ全般

## 決定

**選択肢 A: Material Web** を採用。Web Components ベースのためバニラ JavaScript プロジェクトとの親和性が高く、フレームワークロックインがない。MD3 のデザイントークンシステム（CSS カスタムプロパティ）により、ライト/ダークテーマの切り替えも容易に実現できる。

## 技術的詳細

### 実装方針

- `app.js` で必要なコンポーネントを個別インポート（tree-shaking 対応）
- ボタン、アイコン、スライダー、ディバイダー等を使用
- セレクトボックスやテキスト入力等、Material Web に含まれないコンポーネントはネイティブ HTML + カスタム CSS（`.md-input`, `.md-select`）で MD3 風にスタイリング

### 使用する主要 API / ライブラリ

```
- @material/web/button (filled, filled-tonal, text, outlined)
- @material/web/iconbutton/icon-button
- @material/web/icon/icon
- @material/web/slider/slider
- @material/web/divider/divider
- Google Fonts: Roboto, Material Symbols Rounded
```

### マイグレーション戦略

該当なし（初回設計時に採用）。

## アーキテクチャ適合性

- [x] ES Modules によるモジュール分割を遵守
- [x] 状態管理（state.js）の pub-sub パターンを遵守
- [x] Vite ビルドパイプラインとの整合性
- [x] Material Web コンポーネントとの共存
- [x] LocalStorage 永続化との互換性
- [x] 既存の CSS カスタムプロパティ（MD3 トークン）体系との整合

## 影響範囲

- `js/app.js`: コンポーネントのインポート
- `index.html`: `<md-*>` カスタム要素の使用
- `css/styles.css`: MD3 デザイントークン定義、コンポーネントオーバーライド
- `package.json`: `@material/web` 依存

## パフォーマンス考慮

- 個別インポートにより未使用コンポーネントは tree-shake される
- Web Components の初期化コストは軽微（使用コンポーネント数が少ない）
- Google Fonts（Roboto, Material Symbols）は `preconnect` で最適化済み
