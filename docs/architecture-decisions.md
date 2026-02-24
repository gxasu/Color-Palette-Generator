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

以下の課題が特定された（詳細は Engineering Review Report E1〜E12 を参照）。

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
