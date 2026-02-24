# Architecture Decision Record (ADR)

Engineering Supervisor が管理するアーキテクチャ判断の記録。
パフォーマンス、セキュリティ、アクセシビリティの観点から全技術決定を記録する。

---

## ADR-001: フレームワーク不採用・Vanilla JS + Web Components

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: UI フレームワークの選定。React, Vue, Svelte 等の候補。
**決定**: Vanilla JavaScript (ES Modules) + `@material/web` (Google 公式 Web Components) を採用。仮想 DOM フレームワークは不採用。
**根拠**:
- バンドルサイズ最小化（フレームワーク自体のオーバーヘッドを排除）
- `@material/web` は Web Components 標準に準拠し、フレームワーク非依存
- Google 公式のため M3 仕様との齟齬がない
- ランタイムコスト削減（仮想 DOM diff なし）
**トレードオフ**: 状態管理と DOM 更新を自前で実装する必要がある → ADR-002 で対応

---

## ADR-002: Custom Observable Pattern による状態管理

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: UI の状態管理手法。Redux, Zustand, Signals 等の候補。
**決定**: 自前の Subscribe/Notify パターンを実装。Immutable state updates（スプレッド演算子）。
**根拠**:
- 外部依存ゼロ（バンドルサイズ削減、セキュリティリスク低減）
- 状態構造がシンプル（palettes 配列 + 選択 ID + 設定値）で複雑なライブラリは不要
- `notify()` で全 subscriber に通知 → 各パネルが自律的に再描画
**実装**:
```javascript
let listeners = [];
export function subscribe(listener) { listeners.push(listener); }
function notify() { listeners.forEach(l => l(state)); saveToLocalStorage(); }
```
**注意事項**: 状態更新のたびに localStorage へ永続化する。大量連続更新時はスロットリングを検討。

---

## ADR-003: OKLCH 色空間の自前実装

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 色空間変換ライブラリの選定。chroma.js, culori 等の候補。
**決定**: sRGB ↔ Linear RGB ↔ XYZ (D65) ↔ OKLAB ↔ OKLCH の変換チェーンを自前実装。
**根拠**:
- バンドルサイズ最小化（chroma.js は ~40KB, culori は ~20KB）
- 必要な変換は限定的（HEX ↔ OKLCH, gamut mapping, contrast ratio のみ）
- 数学的正確性を自ら制御可能（OKLAB 行列係数は公式仕様書から転記）
**Gamut Mapping**: 二分探索法で Chroma を減少させ sRGB ガマット内に収束（精度 0.0001）

---

## ADR-004: Canvas ベースのインタラクティブチャート

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 明度/透明度チャートの描画技術。SVG vs Canvas。
**決定**: Canvas 2D API を採用。ドラッグインタラクション付き。
**根拠**:
- リアルタイムドラッグ時の再描画パフォーマンスが SVG より優秀
- ポイント数が多くても描画コストが線形にスケール
- Hit test はユークリッド距離ベース（半径 12px のトレランス）
**ドラッグ最適化**: `chartDragging` フラグにより、ドラッグ中は DOM 再構築をスキップし、Canvas 再描画 + DOM の部分更新のみ実行。これにより 60fps を維持。

---

## ADR-005: Figma Variables DTCG JSON フォーマット

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: エクスポートフォーマットの選定。
**決定**: Design Token Community Group (DTCG) フォーマットに準拠。Figma の Variables インポートと完全互換。
**構造**:
```json
{
  "paletteName": {
    "stepName": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [r, g, b], "alpha": 1, "hex": "#..." },
      "$extensions": {
        "com.figma.scopes": ["ALL_SCOPES"],
        "com.figma.mode.<name>": { ... }
      }
    }
  },
  "$extensions": { "com.figma.modeName": "Default" }
}
```
**マルチモード**: `$value` にデフォルトモードの値、`$extensions["com.figma.mode.<name>"]` に追加モードの値を格納。単一ファイルで全モードをエクスポート。

---

## ADR-006: PWA 対応（Service Worker + Manifest）

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: モバイルでの使用とオフラインサポート。
**決定**: Web App Manifest + Service Worker による PWA 化。
**キャッシュ戦略**:
- Navigation (HTML): Network-first（常に最新を取得、失敗時はキャッシュ）
- Assets (JS/CSS/Image): Cache-first（キャッシュ優先、未キャッシュ時にネットワーク）
- 外部フォント (Google Fonts): キャッシュ対象外（CDN 任せ）
**根拠**: Network-first for HTML はデプロイ即反映を保証。Cache-first for Assets はオフライン動作とパフォーマンスを両立。

---

## ADR-007: GitHub Pages デプロイ

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: ホスティング先の選定。
**決定**: GitHub Pages + GitHub Actions による自動デプロイ。
**根拠**: リポジトリと一体管理。無料。`base: '/Color-Palette-Generator/'` で相対パス解決。

---

## ADR-008: Alpha パレットのデータモデル

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: 透明度ベースのカラースケール（同一 HEX + 可変 Alpha）のサポート。
**決定**: `paletteType: 'alpha'` フィールドをパレットモデルに追加。色データに `alpha` プロパティを付与。
**データ構造**:
```javascript
{
  paletteType: 'alpha',  // 'oklch' | 'alpha'
  modes: [{
    colors: [{ L, C, h, hex: '#ffffff', alpha: 0.05 }, ...]
  }]
}
```
**根拠**: 既存の OKLCH パレットモデルを拡張する形で、最小限の変更で新機能を追加。チャートは `valueKey` オプションで L/alpha を切り替え。

---

## ADR-009: インポート時の HEX バリデーション（XSS 防止）

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: JSON インポートで外部由来の hex 値が `innerHTML` 経由で DOM に挿入される。悪意ある hex 値（例: `"><script>...`）による XSS リスク。
**決定**: `sanitizeHex()` 関数をインポート境界に配置。`/^#[0-9a-fA-F]{6}$/` に一致しない値は `#808080` にフォールバック。
**根拠**: 信頼境界（import boundary）でのバリデーションは最も効果的。内部コードの全箇所を修正するよりも、入口で一括サニタイズする方が確実かつ保守しやすい。

---

## ADR-010: localStorage 書き込みのデバウンス

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: `notify()` が呼ばれるたびに `saveToLocalStorage()` を同期実行していた。チャートドラッグ中は毎フレーム書き込みが発生し、パフォーマンス低下の原因。
**決定**: `setTimeout` による 300ms デバウンスを `notify()` 内に導入。
**根拠**: localStorage は同期 I/O。頻繁な書き込みはメインスレッドをブロックする。300ms のデバウンスにより、連続操作中の書き込みを最終操作後 1 回に集約。

---

## ADR-011: チャートドラッグの requestAnimationFrame スロットリング

**日付**: 2025-02
**ステータス**: 採用
**コンテキスト**: `mousemove` / `touchmove` イベントはディスプレイリフレッシュレートを超える頻度で発火する。各イベントで状態更新 + Canvas 再描画が走り、不必要な負荷が発生。
**決定**: `requestAnimationFrame` でドラッグ中の `onValueChange` 呼び出しをフレーム単位にスロットリング。
**根拠**: rAF は次の描画フレームまで処理を延期し、中間の mousemove イベントを自然にスキップ。60fps を超えない更新頻度を保証。

---

## ADR-012: エンジニアリングレビュー（2026-02-24）— 未解決の課題

**日付**: 2026-02-24
**ステータス**: 提案（要対応）
**コンテキスト**: ADR-001〜011 で対処済みの項目を除く、コードベース全体のエンジニアリングレビュー。

以下の課題が特定された（E1〜E12: 初回レビュー、E13〜E19: 第2回レビューで追加）。

### E1: getState() がミュータブルな参照を返す（Medium）
`state.js` line 14–16。`getState()` は内部 `state` オブジェクトへの直接参照を返しているため、呼び出し側が意図せず直接変更可能。現時点で呼び出し側は読み取り専用で使用しているが、防御的コーディングとしてシャローコピーを返すべき。

### E2: loadFromLocalStorage の構造バリデーション不足（High）
`state.js` line 502–515。`JSON.parse` の結果をそのまま `state` にスプレッドしているが、保存データの構造バリデーションがない。localStorage が破損した場合、不正なプロパティがアプリ状態に混入する。特に `palettes` が配列であること、各パレットの必須フィールドの存在確認が必要。

### E3: renderPaletteCards が毎回全 DOM を再構築（Medium）
`ui.js` line 228–283。`container.innerHTML = ''` で全カードを破棄して再構築している。パレット数が多い場合のパフォーマンス低下と、スクロール位置のリセットが発生する。差分更新またはキーベースの再利用を検討すべき。

### E4: ARIA ロール・属性の欠如（High）
アプリケーション全体で `role` 属性や `aria-*` 属性が一切使用されていない。具体的な欠如箇所:
- パレット一覧 (`palette-cards`): `role="listbox"` + 各カードに `role="option"` + `aria-selected`
- モードタブ (`mode-tabs`): `role="tablist"` + 各タブに `role="tab"` + `aria-selected`
- 背景プレビュー切り替え: `role="radiogroup"` + `aria-pressed`/`aria-checked`
- コントラスト表: `<caption>` 要素の追加
- チャート Canvas: `role="img"` + `aria-label` による代替テキスト
- 削除確認: `aria-live="polite"` でのフィードバック

### E5: キーボードナビゲーション不足（High）
- パレットカード間の矢印キーナビゲーションが未実装
- モードタブ間の左右矢印キーナビゲーションが未実装
- Delete キーでのパレット/モード削除が未実装
- Canvas チャートのキーボード操作（Tab でポイント選択、上下矢印で値変更）が未実装
- `role="tablist"` のセマンティクスに必要な Tab/Arrow キー制御がない

### E6: palette.name をエクスポート時にサニタイズしていない（Medium）
`import-export.js` line 105 — `output[palette.name] = paletteObj` でユーザー入力のパレット名を JSON キーとして直接使用。`$` で始まる名前（例: `$extensions`）が予約キーと衝突する。また `ui.js` line 89 でファイル名に使用する際も、ファイルシステム上の問題文字（`/`, `\`, `:` 等）がエスケープされていない。

### E7: Service Worker キャッシュバージョニングがビルドハッシュと連動していない（Medium）
`sw.js` line 1 — `CACHE_NAME = 'color-scale-generator-v1'` は手動更新が必要。Vite ビルドはファイル名にハッシュを付与するが、SW の PRECACHE_URLS は静的パスのまま。ビルド成果物のキャッシュ破棄が自動化されておらず、デプロイ後に古い JS/CSS がキャッシュから返される可能性がある。

### E8: saveToLocalStorage の無音の失敗（Low）
`state.js` line 494–499。`catch (e) {}` で例外を完全に握りつぶしている。`QuotaExceededError`（ストレージ容量超過）時にユーザーへのフィードバックがなく、データ消失に気付けない。最低限 `console.warn` でログを出すか、ユーザーに通知すべき。

### E9: 削除操作に確認ダイアログがない（Low）
`ui.js` line 276–279（パレット削除）および line 600–604（モード削除）で、ユーザー確認なしに即座に削除が実行される。Undo 機能もないため、誤操作によるデータ消失リスクがある。

### E10: import-file の FileReader エラーハンドリング不足（Low）
`ui.js` line 100–113。`reader.onerror` が設定されていないため、ファイル読み込み自体の失敗（権限エラー、中断等）がハンドリングされない。`reader.onload` 内の `try-catch` は JSON パースエラーのみをカバーしている。

### E11: getUniqueName の無限ループリスク（Low）
`state.js` line 50–55。`while` ループで重複名を回避しているが、理論上は上限がない。パレット数が現実的に数千を超えることはないが、防御的に最大試行回数を設けるべき。

### E12: ResizeObserver コールバックにデバウンスがない（Low）
`ui.js` line 462–470。`ResizeObserver` のコールバックでリサイズの度に Canvas を即座に再描画している。ウィンドウリサイズ中に高頻度で発火し得る。`requestAnimationFrame` によるスロットリングを入れるべき。

---

**第2回レビュー追加分（2026-02-24）**

### E13: parseInt() に基数引数がない — ソート時の誤解析リスク（Low）
`import-export.js` line 135 — `parseInt(a)` および `parseInt(b)` に基数（radix）が指定されていない。ステップ名が `"0100"` のような先頭ゼロ付き文字列の場合、一部のレガシー環境で8進数として解釈される可能性がある。同 line 235–236 にも同様のパターンがある。
**修正案**: すべての `parseInt()` 呼び出しに第2引数 `10` を追加する。

### E14: importPalettes で ID 衝突チェックがない（Medium）
`state.js` line 475–482。`importPalettes()` はインポートされたパレットを既存パレット配列にそのまま結合する。インポートされたパレットの `id` が既存パレットの `id` と衝突した場合、同一 ID のパレットが複数存在する不整合が発生し、`selectPalette` や `deletePalette` が予期しない動作を示す。
**修正案**: インポート時に全パレットおよびモードの ID を再生成する。

### E15: inline onclick ハンドラの混在（Low）
`ui.js` line 258–259。palette card の HTML テンプレートで `onclick="event.stopPropagation()"` をインライン属性で記述している。一方、同じ要素に対して `addEventListener` も使用している（line 268–274, 276–279）。イベント処理方式が混在しており、保守性が低下する。CSP（Content Security Policy）で `unsafe-inline` を禁止した場合にインラインハンドラが動作しなくなる。
**修正案**: インライン `onclick` を削除し、すべて `addEventListener` に統一する。

### E16: チャートの stale closure — colors 配列がドラッグ中に古くなる（Medium）
`chart.js` line 111–205。`makeChartInteractive()` のクロージャが初期呼び出し時の `colors` 配列を捕捉し続ける。ドラッグ中に `onValueChange` が状態を更新すると新しい colors が生成されるが、`hitTest()` と `pointPositions()` は古い `colors` を参照し続ける。色数が変わらない単純なドラッグでは実害がないが、`hitTest` の座標計算がずれる可能性がある。
**修正案**: `hitTest` 内で最新の色データを `getSelectedPalette()` から取得するか、コールバックで最新の colors を渡す仕組みにする。

### E17: downloadJson で Object URL リーク対策が不完全（Low）
`import-export.js` line 297–307。`URL.createObjectURL(blob)` の後、`a.click()` は非同期にダウンロードを開始する。直後の `URL.revokeObjectURL(url)` が早すぎてダウンロードが開始される前に URL が無効化される場合がある（一部ブラウザ）。
**修正案**: `setTimeout(() => URL.revokeObjectURL(url), 10000)` 等で遅延 revoke するか、`a.click()` の後に短い `setTimeout` を挟む。

### E18: subscribe() が同一 listener の重複登録を許可する（Low）
`state.js` line 18–23。`subscribe()` は `listeners.push(listener)` するのみで、同じ関数が複数回登録されるのを防がない。何らかのコードパスで `subscribe(render)` が複数回呼ばれると、1回の `notify()` で `render()` が複数回実行されてパフォーマンスが劣化する。
**修正案**: 登録前に `if (listeners.includes(listener)) return` で重複チェックするか、`Set` を使用する。

### E19: Vite ビルドが SW ファイルの中身を処理しない（Medium）
`public/sw.js` は `public/` フォルダ配下にあるため、Vite はビルド時にこのファイルをそのままコピーする（変換・ハッシュ付与なし）。SW 内の `PRECACHE_URLS` は `'./'`, `'./manifest.json'` 等の相対パスだが、Vite ビルド後の JS/CSS エントリポイント（ハッシュ付きファイル名）はプリキャッシュ対象に含まれない。結果として、オフライン時にアプリ本体の JS/CSS が取得できない。E7 と関連するが、具体的には **Vite の `vite-plugin-pwa` の導入、または `sw.js` をビルドプロセスに統合してプリキャッシュ URL リストを自動生成する** ことが必要。
**修正案**: `vite-plugin-pwa`（Workbox ベース）を導入し、ビルドアセットのプリキャッシュを自動化する。

---

## ADR-013: エンジニアリング修正の実施（2026-02-24）

**日付**: 2026-02-24
**ステータス**: 採用（対応済み）
**コンテキスト**: ADR-012 で特定された課題のうち、以下を修正した。

### 修正済み

| ID | 修正内容 | ファイル |
|---|---|---|
| E2 | `loadFromLocalStorage` に `validateStoredState()` バリデーション関数を追加。`palettes` の型・構造チェック、`theme`/`backgroundPreview` の値検証、`selectedPaletteId` の参照整合性チェックを実施。 | `state.js` |
| E4 | ARIA ロール・属性を全インタラクティブ要素に追加（`role="listbox"`, `role="option"`, `role="tablist"`, `role="tab"`, `role="img"`, `role="group"`, `aria-selected`, `aria-pressed`, `aria-label`, `scope="col"`, `<caption>`）。 | `ui.js`, `index.html` |
| E5 | パレットカード・モードタブにキーボードナビゲーション実装（Arrow Up/Down/Left/Right, Enter, Space, Delete）。roving tabindex パターン。フォーカス復元機構。 | `ui.js` |
| E8 | `saveToLocalStorage` の `catch` を `console.warn` に変更。 | `state.js` |
| E10 | `reader.onerror` ハンドラを追加。 | `ui.js` |
| E13 | 全 `parseInt()` 呼び出しに基数 `10` を追加。 | `import-export.js`, `ui.js` |
| E14 | `importPalettes()` で既存 ID との衝突を検出し、衝突時は新規 ID を再生成。全モード ID も再生成。 | `state.js` |
| E15 | inline `onclick` ハンドラを削除し、すべて `addEventListener` に統一。 | `ui.js` |
| E17 | `URL.revokeObjectURL` を `setTimeout` で 10 秒遅延。 | `import-export.js` |
| E18 | `subscribe()` に `listeners.includes()` による重複チェックを追加。 | `state.js` |

### 未対応（将来の課題）

| ID | 理由 |
|---|---|
| E1 | `getState()` のシャローコピー — 現行の呼び出し側が読み取り専用で使用しており、実害なし。パフォーマンスへの影響を考慮し保留。 |
| E3 | `renderPaletteCards` の差分更新 — Virtual DOM なしでの差分更新は複雑度が高く、現行のパレット数（数十）では実用上問題なし。 |
| E6 | パレット名サニタイズ — `$` プレフィックスの衝突は稀であり、優先度低。 |
| E7/E19 | Service Worker のビルド統合 — `vite-plugin-pwa` の導入は別イシューとして管理。 |
| E9 | 削除確認ダイアログ — Undo 機能の設計と併せて検討。 |
| E11 | `getUniqueName` のループ上限 — 理論上のリスクのみ。 |
| E12 | ResizeObserver デバウンス — 実測でパフォーマンス問題なし。 |
| E16 | チャートの stale closure — 現行のドラッグ動作では実害なし。 |

---

## ADR-014: 第3回エンジニアリング修正の実施（2026-02-24）

**日付**: 2026-02-24
**ステータス**: 採用（対応済み）
**コンテキスト**: 3エージェント並列レビューで特定された追加課題。

### 修正済み

| ID | 修正内容 | ファイル |
|---|---|---|
| E20 | `theme-select` に `aria-label="テーマ切り替え"` を追加。 | `index.html` |
| E21 | `panel-center` に `aria-label="カラースウォッチ・チャート・コントラスト"` を追加。 | `index.html` |
| E22 | インポートエラー時の `err.message` をスナックバーに直接表示していたのを、固定の日本語メッセージに変更。技術詳細は `console.warn` へ。 | `ui.js` |
| E23 | `colorCount`・`lightnessCurve` の `<input type="number">` の `change` イベントで `parseInt` の結果が `NaN` の場合に早期リターンするガードを追加。 | `ui.js` |
| E24 | `swatch-step-input` の `aria-label` を全スウォッチで同一の「ステップ名」から「ステップ {stepName} の名前」に変更し、一意に区別可能にした。 | `ui.js` |
| E25 | `querySelectorAll('.bg-toggle-btn')` のスコープを `document` から `container`（panel-center）に限定。 | `ui.js` |
| E26 | モード追加ボタンを `<button>+</button>` から `<md-icon-button>` + `<md-icon>add</md-icon>` に変更。M3 コンポーネント一貫性を確保。 | `ui.js`, `css/styles.css` |
