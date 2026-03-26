# ADR-0003: Vite ビルドシステムの採用

## メタ情報

| 項目 | 値 |
|---|---|
| 番号 | ADR-0003 |
| 起票日 | 2026-03-26 |
| 起票者 | フロントエンド開発者 |
| ステータス | 承認 |
| 関連 DDR | — |
| 関連 UC | — |

## コンテキスト

ES Modules ベースの JavaScript と npm パッケージ（`@material/web`）を使用するため、モジュールバンドラー / 開発サーバーの導入が必要。開発体験（HMR）とビルド効率のバランスが求められた。

## 検討した選択肢

### 選択肢 A: Vite

- 概要: ES Modules ネイティブの高速開発サーバー + Rollup ベースのプロダクションビルド
- 使用ライブラリ / API: `vite ^6.0.0`
- 外部依存: devDependencies に 1 パッケージ
- メリット: 起動が高速、設定がシンプル、HMR が高速、ES Modules と相性が良い
- デメリット: Rollup 由来のエッジケースが稀にある
- ブラウザ対応: モダンブラウザ対象（ES Modules 対応）

### 選択肢 B: webpack

- 概要: 最も広く使われるモジュールバンドラー
- 使用ライブラリ / API: `webpack`, `webpack-cli`, `webpack-dev-server` 等
- 外部依存: 複数パッケージ + ローダー設定
- メリット: エコシステムが成熟、プラグインが豊富
- デメリット: 設定が複雑、開発サーバー起動が遅い
- ブラウザ対応: 広範囲（レガシー対応可）

### 選択肢 C: バンドラーなし（importmap）

- 概要: ブラウザネイティブの ES Modules + Import Maps で npm パッケージを解決
- 使用ライブラリ / API: なし
- 外部依存: CDN 経由
- メリット: ビルドステップ不要、最もシンプル
- デメリット: `@material/web` の CDN 配信が不安定、本番最適化が困難
- ブラウザ対応: Import Maps 対応ブラウザのみ

## 決定

**選択肢 A: Vite** を採用。最小限の設定（`vite.config.js` 8 行）で開発サーバーとプロダクションビルドの両方が得られ、`@material/web` の ES Modules インポートもそのまま動作する。

## 技術的詳細

### 実装方針

- `vite.config.js` はルートディレクトリと出力先（`dist`）の指定のみ
- `index.html` をエントリーポイントとし、`<script type="module">` で `js/app.js` を読み込み
- 開発時は `npm run dev`、ビルドは `npm run build`

### 使用する主要 API / ライブラリ

```
- vite ^6.0.0（devDependencies）
- Rollup（Vite 内蔵、プロダクションビルド用）
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

- `vite.config.js`: ビルド設定
- `package.json`: scripts（dev / build / preview）、devDependencies
- `index.html`: エントリーポイント（Vite が処理）

## パフォーマンス考慮

- 開発サーバーはネイティブ ESM で起動が瞬時
- プロダクションビルドは Rollup による tree-shaking・コード分割・ミニファイが自動適用
