# ADR-0004: バニラ JavaScript + ES Modules の採用

## メタ情報

| 項目 | 値 |
|---|---|
| 番号 | ADR-0004 |
| 起票日 | 2026-03-26 |
| 起票者 | フロントエンド開発者 |
| ステータス | 承認 |
| 関連 DDR | — |
| 関連 UC | — |

## コンテキスト

アプリケーションのフロントエンドフレームワーク選定が必要。カラーパレットジェネレーターは単一ページのツール系アプリであり、複雑なルーティングやグローバル状態管理は不要。開発の軽量さと依存関係の最小化が重視された。

## 検討した選択肢

### 選択肢 A: バニラ JavaScript + ES Modules

- 概要: フレームワークを使わず、ES Modules で分割した純粋な JavaScript
- 使用ライブラリ / API: Web 標準 API のみ
- 外部依存: 依存なし（UI コンポーネントの `@material/web` は別途）
- メリット: バンドルサイズ最小、学習コストなし、フレームワークの EOL リスクなし、自由度が高い
- デメリット: DOM 操作を手動で管理、宣言的 UI がない
- ブラウザ対応: 全モダンブラウザ

### 選択肢 B: React

- 概要: 宣言的 UI ライブラリ
- 使用ライブラリ / API: `react`, `react-dom`
- 外部依存: npm パッケージ複数
- メリット: 宣言的 UI、仮想 DOM による効率的な再レンダリング、エコシステムが充実
- デメリット: バンドルサイズ増加（+40KB gzip）、Material Web との組み合わせに工夫が必要
- ブラウザ対応: 全モダンブラウザ

### 選択肢 C: Lit（Web Components フレームワーク）

- 概要: Google 製の軽量 Web Components ライブラリ
- 使用ライブラリ / API: `lit`
- 外部依存: npm パッケージ 1 つ
- メリット: Material Web と同じ Web Components エコシステム、軽量、リアクティブプロパティ
- デメリット: エコシステムが React/Vue に比べ小さい
- ブラウザ対応: 全モダンブラウザ

## 決定

**選択肢 A: バニラ JavaScript + ES Modules** を採用。アプリケーションの規模が小さく（JS 6 ファイル、機能が限定的）、フレームワークの追加による恩恵よりもシンプルさと軽量さを優先した。状態管理は自作の pub-sub パターン（ADR-0005）で対応し、十分な保守性を確保する。

## 技術的詳細

### 実装方針

機能ごとにモジュールを分離:
- `app.js`: エントリーポイント、初期化
- `state.js`: 状態管理（pub-sub パターン）
- `color-utils.js`: OKLCH 色空間の変換ユーティリティ
- `ui.js`: DOM 操作・イベントバインド・レンダリング
- `chart.js`: Canvas ベースの明度チャート描画
- `import-export.js`: Figma JSON のインポート/エクスポート

### 使用する主要 API / ライブラリ

```
- ES Modules (import/export)
- DOM API (document.createElement, getElementById, addEventListener 等)
- Canvas API (CanvasRenderingContext2D)
- Web Storage API (localStorage)
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

プロジェクト全体の基盤選択のため、全ファイルに影響。

## パフォーマンス考慮

- フレームワークのランタイムオーバーヘッドがゼロ
- JavaScript の総コード量は数百行程度で、バンドルサイズは `@material/web` を除けば極めて小さい
