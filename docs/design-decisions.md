# Design Decision Record (DDR)

Interface Design Supervisor が管理する設計判断の記録。
Material Design 3 ガイドラインに基づく全 UI 決定を記録する。

---

## DDR-001: カラーテーマをモノクロに統一

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: カラーパレットジェネレーターの UI 自体が色を持つと、生成されるパレットの視認を妨げる。
**決定**: M3 の Primary / Secondary / Tertiary をすべてニュートラルグレーに統一する。機能色（Error, Success, Warning）のみ維持。
**根拠**: M3 では Primary は「ブランドの識別」に使用されるが、このツールのブランドは「色の中立性」であり、モノクロが最も適切。
**トークン設計**:
- Light: `--md-sys-color-primary: #5e5e5e`（Surface: #fafafa 系）
- Dark: `--md-sys-color-primary: #c8c8c8`（Surface: #131313 系）

---

## DDR-002: ボタンコンポーネントの選定

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: ヘッダーおよびパネル内のアクションボタンのコンポーネント選定。
**決定**: `md-filled-tonal-button` を主要アクションに採用。`md-icon-button` を削除等の補助アクションに採用。
**根拠**: M3 の Button hierarchy に基づく。Filled Tonal は「重要だが最優先ではないアクション」に適し、中立テーマとの調和が良い。Filled Button はこのモノクロテーマでは目立ちすぎる。
**パディング**: 左右 16px（M3 の Medium ボタンの内部余白ガイドラインに準拠）

---

## DDR-003: コレクション名テキストフィールド

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: ヘッダー内のコレクション名入力欄のスタイル。
**決定**: M3 Outlined Text Field パターンを CSS で再現。Floating label を `input:focus + label` / `input:not(:placeholder-shown) + label` セレクタで実装。
**根拠**: `@material/web` には Text Field コンポーネントがまだ安定版に含まれていないため、CSS による再現が最も確実。M3 の Outlined Text Field のビジュアル仕様（ボーダー、ラベル遷移、フォーカスリング）に準拠。

---

## DDR-004: スウォッチカードのインタラクション

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: カラースウォッチの表示とインタラクション設計。
**決定**:
- 各スウォッチは 72px 高のカラー表示 + 下部に HEX 情報 + カラーピッカー
- ステップ名は inline 編集可能（click → text input）
- ベースカラーに `is-base` アウトライン + バッジ表示
- Hover で translateY(-2px) + elevation-2 のリフト効果
**根拠**: M3 の Card パターンに準拠。編集可能なテキストは M3 の Inline Editing パターン。リフト効果は M3 Elevation の interactive state 表現。

---

## DDR-005: モードタブのデザイン

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: パレットごとのモード（Default, Dark 等）切り替え UI。
**決定**: Chip/Pill 型のタブ（border-radius: 20px）。Active 状態は Primary 色背景。Inline 編集可能な名前入力。`+` ボタンは dashed border の円形。
**根拠**: M3 の Filter Chip のビジュアルパターンに類似。タブよりもチップの方が「追加可能なモードのコレクション」というメンタルモデルに合致。

---

## DDR-006: 明度チャートの高さとインタラクション

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 明度カーブの視覚化と直接編集。
**決定**: Canvas ベースのチャート、高さ 480px。各データポイントをドラッグして明度（またはアルファ）を直接調整可能。
**根拠**: 480px はデスクトップでの視認性とモバイルでの操作性のバランス点。Canvas はリアルタイムドラッグの描画パフォーマンスに優れる。ドラッグ中は DOM 再構築をスキップし、Canvas 再描画のみ行うことで 60fps を維持。

---

## DDR-007: Alpha パレットの市松模様背景

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 透明度を持つカラーの視覚的表現。
**決定**: CSS の `background-image` による市松模様（12px グリッド）をスウォッチ背景に使用。カラーは `rgba()` オーバーレイで表示。
**根拠**: 市松模様は透明度表現のデファクトスタンダード（Photoshop, Figma 等）。ユーザーの既存のメンタルモデルと一致する。

---

## DDR-008: ライト / ダークプレビュートグル

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: スウォッチの背景切り替え。
**決定**: Segmented Button 風のトグル（2 ボタン）。Active 状態は Primary 色。
**根拠**: M3 Segmented Button パターンに準拠。2 択のバイナリ切り替えに最適。

---

## DDR-009: カスタム入力の :focus-visible スタイル

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: `.mode-name-input`、`.swatch-step-input`、`.card-name-input` 等のインライン編集入力は `border: none; outline: none` スタイルのため、キーボードフォーカスが視認不可能。WCAG 2.4.7（Focus Visible）違反。
**決定**: `:focus-visible` 擬似クラスで `outline: 2px solid var(--md-sys-color-primary)` を各カスタム入力に個別追加。マウスフォーカスは影響なし。
**根拠**: M3 の Focus Ring ガイドラインに準拠。`:focus-visible` はキーボードナビゲーション時のみ発火し、マウスクリック時の不要なフォーカスリングを回避。

---

## DDR-010: タッチターゲット 48dp の徹底

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: `.swatch-picker`（カラーピッカー）の視覚サイズは 20px だが、タッチターゲットが M3 の最小 48dp に未達。
**決定**: `::after` 擬似要素による 48x48px の透明タッチエリアを追加。視覚サイズは変更なし。
**根拠**: M3 Touch Target ガイドライン（最小 48dp）に準拠。既に `.card-delete-btn`、`.mode-delete-btn`、`.mode-add-btn` で同パターンを採用済み。統一性を確保。

---

## DDR-011: 4dp グリッドへのスペーシング統一

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 一部のスペーシング値（gap: 6px, 10px、margin-top: 6px、padding: 5px 等）が M3 の 4dp グリッドに非準拠。
**決定**: 全スペーシング値を 4dp の倍数（4px, 8px, 12px, 16px...）に統一。
**影響範囲**: `.base-color-row` gap 10→8、`.card-meta` margin 6→4、`.color-info-oklch` gap 6→8 / margin 10→8、`.modes-bar` gap 6→8、`.swatch-info` padding 5→4、レスポンシブ `.color-swatches` gap 6→4 / padding 10→8。

---

## DDR-012: アクセシビリティ ARIA パターンの導入

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: パレットカード、モードタブ、背景プレビュートグルなど主要なインタラクティブ要素に ARIA ロール・属性が未設定であり、スクリーンリーダーおよびキーボードユーザーにとって操作不能だった。
**決定**:
- パレット一覧: `role="listbox"` + 各カードに `role="option"` + `aria-selected` + roving tabindex
- モードタブ: `role="tablist"` + 各タブに `role="tab"` + `aria-selected` + roving tabindex
- 背景トグル: `role="group"` + `aria-label` + `aria-pressed`
- コントラスト表: `<caption>` + `scope="col"`
- Canvas チャート: `role="img"` + `aria-label`
- カラーピッカー全箇所: `aria-label`
- `<aside>` 要素: `aria-label` でランドマーク区別
**根拠**: WCAG 2.1 AA 準拠。M3 の Accessibility ガイドラインに沿ったセマンティクス。

---

## DDR-013: キーボードナビゲーションの実装

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: パレットカード間、モードタブ間のキーボード操作（矢印キー、Enter/Space、Delete）が未実装だった。
**決定**:
- パレットカード: Arrow Up/Down で選択移動、Enter/Space で選択確定、Delete でパレット削除
- モードタブ: Arrow Left/Right でモード切り替え、Delete でモード削除
- roving tabindex パターンで Tab キーのフォーカスを1箇所に集約
- フォーカス復元: DOM 再構築後に `pendingFocusPaletteId` / `pendingFocusModeId` で自動復元
**根拠**: WCAG 2.1 SC 2.1.1（Keyboard）、M3 の Listbox / Tabs のキーボード操作パターンに準拠。

---

## DDR-014: 削除ボタンの :focus-within 表示

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `.card-delete-btn` が `:hover` でのみ表示されるため、キーボードユーザーには見えなかった。
**決定**: `.palette-card:focus-within .card-delete-btn` ルールを追加し、カード内の任意の要素にフォーカスがある場合も削除ボタンを表示する。
**根拠**: WCAG 2.1 SC 2.4.7（Focus Visible）。hover-only UI はキーボード/スクリーンリーダーユーザーをブロックする。

---

## DDR-015: インポート/エクスポートアイコンの修正

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: インポートボタンに `download` アイコン、エクスポートボタンに `upload` アイコンが設定されており、意味が逆だった。
**決定**: インポート → `upload` アイコン、エクスポート → `download` アイコンに修正。
**根拠**: M3 の Icon semantics。`download` は「保存/ダウンロード」、`upload` は「読み込み/アップロード」を意味する。

---

## DDR-016: Roboto Mono フォントの読み込み追加

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: CSS で `font-family: 'Roboto Mono', monospace` が 9 箇所以上参照されているが、Google Fonts からの読み込みリンクが未設定だった。
**決定**: `index.html` に `<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet" />` を追加。
**根拠**: 一貫したモノスペースフォント表示。HEX コード、OKLCH 値、コントラスト比のテーブルで使用。

---

## DDR-017: prefers-reduced-motion メディアクエリの追加

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: アニメーション/トランジションが多数あるが、`prefers-reduced-motion` の考慮がなかった。
**決定**: `@media (prefers-reduced-motion: reduce)` でアニメーション/トランジションを無効化。hover のリフト効果もオフに。
**根拠**: WCAG 2.3.3（Animation from Interactions）、M3 の Motion ガイドライン。前庭障害のあるユーザーへの配慮。

---

## DDR-018: M3 Snackbar によるフィードバック

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `alert()` によるブロッキングダイアログがインポートエラー時に使用されていた。
**決定**: CSS ベースの M3 Snackbar コンポーネントを実装。`role="status"` + `aria-live="polite"` でスクリーンリーダーにも通知。エラー時は `error-container` 色、成功時は `inverse-surface` 色。4秒後に自動消去。
**根拠**: M3 Snackbar ガイドライン。非ブロッキング通知はユーザーの作業を中断しない。

---

## DDR-019: disabled 状態の実装

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: パレットが 0 件の場合でもエクスポートボタンがアクティブだった。
**決定**: `state.palettes.length === 0` の場合、エクスポートボタンに `disabled` 属性を設定。
**根拠**: M3 の Button States ガイドライン。操作不能な状態を明示的に示す。

---

## DDR-020: visually-hidden ユーティリティクラス

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: コントラスト表の `<caption>` をスクリーンリーダーにのみ公開したい。
**決定**: `.visually-hidden` CSS クラスを追加。`position: absolute; clip: rect(0,0,0,0); width: 1px; height: 1px` パターン。
**根拠**: WCAG 2.1 テクニック C7。視覚的に非表示だがスクリーンリーダーには読み上げられるテキストの標準パターン。

---

## DDR-021: .info-label コントラスト比の修正

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `.info-label` の色が `--md-sys-color-outline`（#787878）でライト背景（#fafafa）に対するコントラスト比が約 3.6:1 で WCAG 2.1 AA（4.5:1）を満たさなかった。
**決定**: `--md-sys-color-on-surface-variant`（#474747）に変更。ライト背景に対するコントラスト比 ≈ 7.5:1。
**根拠**: WCAG 1.4.3 Contrast (Minimum) AA 準拠。M3 の on-surface-variant トークンは補助テキストの正しいセマンティクスカラー。

---

## DDR-022: .swatch-hex フォントサイズの拡大

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `.swatch-hex` の `font-size: 0.625rem`（≈ 8.75px）は可読性が低く、M3 の最小テキストサイズガイドラインを下回る。
**決定**: `font-size: 0.6875rem`（≈ 9.63px）に拡大。
**根拠**: M3 の Label Small タイプスケール（11px）には届かないが、スウォッチの限られたスペース内での可読性とレイアウトのバランスを考慮した妥協点。

---

## DDR-023: transition:all の詳細プロパティへの置き換え

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `.palette-card` と `.mode-tab` で `transition: all 200ms` が使用されていた。`all` は意図しないプロパティ（width, height, outline 等）のアニメーションを引き起こし、パフォーマンスに影響する。
**決定**: `transition: background, border-color, box-shadow` に限定。
**根拠**: M3 Motion ガイドラインでは意図したプロパティのみにトランジションを適用すべきとされる。

---

## DDR-024: レスポンシブ panel-left の max-height 改善

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: `max-height: 220px` はビューポートサイズによっては適切でなかった。
**決定**: `max-height: 30vh` に変更。ビューポート高さの 30% を使用。
**根拠**: M3 Layout ガイドライン。固定値よりもビューポート相対値の方がレスポンシブ対応として適切。

---

## DDR-025: モード追加ボタンの md-icon-button 化

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: モード追加ボタンが `<button>+</button>` のプレーン HTML 要素で、他の M3 コンポーネント（`md-icon-button`）と一貫性がなかった。
**決定**: `<md-icon-button>` + `<md-icon>add</md-icon>` に変更。
**根拠**: M3 コンポーネントの一貫性。既存の削除ボタン（`.card-delete-btn`）は `md-icon-button` を使用しており、統一する。

---

## DDR-026: select.md-select の :focus-visible 追加

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: テーマ切り替え `<select>` のキーボードフォーカスが CSS の `select:focus-visible { outline: none }` で無効化されていた。
**決定**: `select.md-select:focus-visible` に `outline: 2px solid var(--md-sys-color-primary)` を追加。
**根拠**: WCAG 2.4.7 Focus Visible。すべてのインタラクティブ要素にキーボードフォーカスインジケーターが必要。

---

## DDR-027: Snackbar の min-height 48dp 追加

**日付**: 2026-02-24
**ステータス**: 採用
**コンテキスト**: Snackbar の高さが内容量に依存しており、M3 の最小タッチターゲットサイズ 48dp を満たさないケースがあった。
**決定**: `min-height: 48px; display: flex; align-items: center` を追加。
**根拠**: M3 Snackbar ガイドライン。最小高さを確保し、テキストの垂直中央揃えを保証。
