# DDR-0002: Material Design 3 テーマシステムの採用

## メタ情報

| 項目 | 値 |
|---|---|
| 番号 | DDR-0002 |
| 起票日 | 2026-03-26 |
| 起票者 | UI デザイナー |
| ステータス | 承認 |
| 関連 UC | — |

## コンテキスト

アプリケーション全体のビジュアルデザインの基盤となるテーマシステムの選定が必要。カラーパレットを扱うツールであるため、アプリ自体の UI カラーがユーザーの作成するパレットと視覚的に干渉しないこと、またライト/ダーク両テーマへの対応が求められた。

## 検討した選択肢

### 選択肢 A: Material Design 3 カラートークン + CSS カスタムプロパティ

- 概要: MD3 の Design Token 体系（Primary, Secondary, Tertiary, Surface 等）を CSS カスタムプロパティで定義し、`[data-theme]` 属性でライト/ダークを切り替え
- デザインガイドライン根拠: Material Design 3 Color System、Dynamic Color
- メリット: 体系的なカラーシステム、ライト/ダーク切り替えが `data-theme` 属性の変更のみ、Material Web コンポーネントとトークンを共有可能
- デメリット: トークン数が多い（約 40 色）、初期設計にカラー生成ツール（Material Theme Builder 等）が必要

### 選択肢 B: 独自のシンプルなテーマ変数

- 概要: `--bg`, `--text`, `--accent` 等の最小限の変数でテーマを構築
- デザインガイドライン根拠: 独自
- メリット: シンプル、変数が少なく管理しやすい
- デメリット: Material Web コンポーネントとの整合が取れない、体系的でない

### 選択肢 C: Tailwind CSS のテーマシステム

- 概要: Tailwind のカラーパレットとユーティリティクラスを使用
- デザインガイドライン根拠: Tailwind CSS 独自のデザインシステム
- メリット: ユーティリティファーストで高速開発、ダークモード対応あり
- デメリット: Material Web コンポーネントとの統合が不自然、ビルドパイプラインに追加設定が必要
- ブラウザ対応: 全ブラウザ対応

## 決定

**選択肢 A: Material Design 3 カラートークン + CSS カスタムプロパティ** を採用。Material Web コンポーネント（ADR-0002）とトークンを共有することで一貫した UI を実現し、ライト/ダーク/システム連動の 3 モードを `data-theme` 属性の切り替えだけで実装できる。パープル系のプライマリカラー（`#5b57d6`）を採用し、ユーザーの作成するパレットとの視覚的干渉を最小化した。

## デザインガイドライン適合性

- [x] Material Design 3 カラーシステム
- [x] Material Design 3 タイポグラフィ
- [x] Material Design 3 コンポーネント仕様
- [ ] レイアウト / レスポンシブデザイン
- [x] アクセシビリティ（WCAG 2.1 準拠）
- [x] ダークモード対応
- [ ] インタラクション / フィードバック
- [ ] 国際化（日本語 UI）

## 影響範囲

- `css/styles.css`: `:root` / `[data-theme="light"]` / `[data-theme="dark"]` のトークン定義全体
- `index.html`: `<html data-theme="light">` 属性
- `js/ui.js`: `applyTheme()` でテーマ切り替え、`prefers-color-scheme` メディアクエリ連動
- `js/state.js`: `theme` 状態（`'light'` / `'dark'` / `'system'`）の管理
- `js/chart.js`: Canvas 描画時にテーマカラーを CSS 変数から取得

## ビジュアル・インタラクション補足

- プライマリカラー: `#5b57d6`（ライト）/ `#c9bfff`（ダーク）
- Surface 階層: 5 段階（lowest → low → default → high → highest）で奥行きを表現
- Elevation: 3 段階の box-shadow でカードやボタンの浮き上がりを表現
- テーマ切り替えはヘッダーの `<select>` で即時反映
- `prefers-color-scheme` メディアクエリにより「システム」選択時は OS 設定に追従
