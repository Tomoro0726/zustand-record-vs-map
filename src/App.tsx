import { useState, useRef } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

// ⚠️ 重要: ImmerでMapを使用するために必須
enableMapSet();

// ==========================================
// 1. 型定義
// ==========================================
type Point = { id: string; x: number; y: number; color: string };

interface StoreState<T> {
	points: T;
	insertAll: (keys: string[]) => number;
	updateAll: (keys: string[]) => number;
	iterateAll: () => number;
	deleteAll: (keys: string[]) => number;
}

// ==========================================
// 2. Zustandストアの作成
// ==========================================

// 🟢 Record版ストア
const useRecordStore = create<StoreState<Record<string, Point>>>()(
	immer((set, get) => ({
		points: {},
		insertAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					state.points[keys[i]] = {
						id: keys[i],
						x: 100,
						y: 200,
						color: "blue",
					};
				}
			});
			return performance.now() - start;
		},
		updateAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					const p = state.points[keys[i]];
					if (p) p.x += 1;
				}
			});
			return performance.now() - start;
		},
		iterateAll: () => {
			const start = performance.now();
			let sum = 0;
			const points = get().points; // get()で現在の状態を取得(Immerの外)
			const values = Object.values(points);
			for (let i = 0; i < values.length; i++) {
				sum += values[i].x;
			}
			return performance.now() - start;
		},
		deleteAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					delete state.points[keys[i]];
				}
			});
			return performance.now() - start;
		},
	})),
);

// 🟡 Map版ストア
const useMapStore = create<StoreState<Map<string, Point>>>()(
	immer((set, get) => ({
		points: new Map(),
		insertAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					state.points.set(keys[i], {
						id: keys[i],
						x: 100,
						y: 200,
						color: "blue",
					});
				}
			});
			return performance.now() - start;
		},
		updateAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					const p = state.points.get(keys[i]);
					if (p) p.x += 1;
				}
			});
			return performance.now() - start;
		},
		iterateAll: () => {
			const start = performance.now();
			let sum = 0;
			const points = get().points;
			for (const p of points.values()) {
				sum += p.x;
			}
			return performance.now() - start;
		},
		deleteAll: (keys) => {
			const start = performance.now();
			set((state) => {
				for (let i = 0; i < keys.length; i++) {
					state.points.delete(keys[i]);
				}
			});
			return performance.now() - start;
		},
	})),
);

// ==========================================
// 3. UIコンポーネント
// ==========================================
export default function App() {
	const [itemCount, setItemCount] = useState(10000);
	const [isRunning, setIsRunning] = useState(false);
	const [results, setResults] = useState<{
		record: Record<string, string>;
		map: Record<string, string>;
	} | null>(null);

	const keysRef = useRef<string[]>([]);
	const recordStore = useRecordStore();
	const mapStore = useMapStore();

	const runBenchmark = async () => {
		setIsRunning(true);
		setResults(null);

		// 描画を更新するために少し待つ
		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			// 1. キーの事前生成 (計測対象外)
			keysRef.current = Array.from({ length: itemCount }, () =>
				crypto.randomUUID(),
			);
			const keys = keysRef.current;

			// 2. Record版の計測
			const rInsert = recordStore.insertAll(keys);
			const rUpdate = recordStore.updateAll(keys);
			const rIterate = recordStore.iterateAll();
			const rDelete = recordStore.deleteAll(keys);

			// 3. Map版の計測
			const mInsert = mapStore.insertAll(keys);
			const mUpdate = mapStore.updateAll(keys);
			const mIterate = mapStore.iterateAll();
			const mDelete = mapStore.deleteAll(keys);

			// 4. 結果保存
			setResults({
				record: {
					insert: rInsert.toFixed(2),
					update: rUpdate.toFixed(2),
					iterate: rIterate.toFixed(2),
					delete: rDelete.toFixed(2),
				},
				map: {
					insert: mInsert.toFixed(2),
					update: mUpdate.toFixed(2),
					iterate: mIterate.toFixed(2),
					delete: mDelete.toFixed(2),
				},
			});
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<div
			style={{
				fontFamily: "sans-serif",
				maxWidth: "600px",
				margin: "40px auto",
				padding: "20px",
				border: "1px solid #ccc",
				borderRadius: "8px",
			}}
		>
			<h2>Zustand + Immer: Record vs Map ベンチマーク</h2>

			<div style={{ marginBottom: "20px" }}>
				<label>
					<strong>データ件数: </strong>
					<select
						value={itemCount}
						onChange={(e) => setItemCount(Number(e.target.value))}
						disabled={isRunning}
					>
						<option value={1000}>1,000 件</option>
						<option value={10000}>10,000 件</option>
						<option value={50000}>50,000 件</option>
						<option value={100000}>100,000 件</option>
					</select>
				</label>
			</div>

			{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
			<button
				onClick={runBenchmark}
				disabled={isRunning}
				style={{
					padding: "10px 20px",
					fontSize: "16px",
					cursor: isRunning ? "wait" : "pointer",
					backgroundColor: "#007bff",
					color: "white",
					border: "none",
					borderRadius: "4px",
				}}
			>
				{isRunning ? "計測中..." : "ベンチマークを実行"}
			</button>

			{results && (
				<table
					style={{
						width: "100%",
						marginTop: "30px",
						borderCollapse: "collapse",
						textAlign: "right",
					}}
				>
					<thead>
						<tr style={{ backgroundColor: "#f8f9fa" }}>
							<th style={thStyle}>操作 ({itemCount.toLocaleString()}件)</th>
							<th style={thStyle}>Record (ms)</th>
							<th style={thStyle}>Map (ms)</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td style={tdStyle}>追加 (Insert)</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.record.insert,
										results.map.insert,
									),
								}}
							>
								{results.record.insert}
							</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.map.insert,
										results.record.insert,
									),
								}}
							>
								{results.map.insert}
							</td>
						</tr>
						<tr>
							<td style={tdStyle}>更新 (Update)</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.record.update,
										results.map.update,
									),
								}}
							>
								{results.record.update}
							</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.map.update,
										results.record.update,
									),
								}}
							>
								{results.map.update}
							</td>
						</tr>
						<tr>
							<td style={tdStyle}>反復 (Iterate) ※</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.record.iterate,
										results.map.iterate,
									),
								}}
							>
								{results.record.iterate}
							</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.map.iterate,
										results.record.iterate,
									),
								}}
							>
								{results.map.iterate}
							</td>
						</tr>
						<tr>
							<td style={tdStyle}>削除 (Delete)</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.record.delete,
										results.map.delete,
									),
								}}
							>
								{results.record.delete}
							</td>
							<td
								style={{
									...tdStyle,
									...getHighlightStyle(
										results.map.delete,
										results.record.delete,
									),
								}}
							>
								{results.map.delete}
							</td>
						</tr>
					</tbody>
				</table>
			)}
			<p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
				※ 反復処理のみ <code>set</code> (ImmerのProxy)
				を経由しない純粋な読み取り速度です。
			</p>
		</div>
	);
}

// スタイルヘルパー
const thStyle = { padding: "10px", borderBottom: "2px solid #ddd" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #ddd" };
const getHighlightStyle = (val1: string, val2: string) =>
	Number(val1) < Number(val2) ? { color: "green", fontWeight: "bold" } : {};
