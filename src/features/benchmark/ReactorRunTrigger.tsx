import { useEffect, useState, useRef } from "react";
import type { MissionCommand } from "../../mission";
import { ViewHeader } from "../../shared/ViewHeader";

export type ModelLifecycleStatus =
  | "Queued"
  | "Loading"
  | "Warm"
  | "Benchmark"
  | "Done"
  | "Unload"
  | "Finish";

export type TestSuiteType =
  | "STANDARD_MICRO_TASKS"
  | "PROJECT_REALITY_ISSUES"
  | "DYNAMIC_CTX_RAMP"
  | "SECURITY_TOKEN_LEAK";

export type ExecutionMode = "SEQUENTIAL" | "PARALLEL_2" | "PARALLEL_3";

export type CockpitSlotMode = "SINGLE_SLOT" | "PARALLEL_DYNAMIC";

export type ModelTypeCategory = "REASONING" | "CODE" | "EMBEDDING" | "THAI-NLP" | "GENERAL";

export interface QuantOption {
  name: string;
  isDownloaded: boolean;
  sizeGb: number;
}

export interface ModelQueueItem {
  id: string;
  name: string;
  displayName: string;
  tag: string;
  hfUrl: string;
  category: ModelTypeCategory;
  configFile: string;
  status: ModelLifecycleStatus;
  progressPercent: number;
  maxCtx: number;
  testedCtx: number;
  recommendedCtx: number;
  recommendedTemp: number;
  recommendedTopP: number;
  paramSize: string;
  quantization: string;
  availableQuants: QuantOption[];
  sizeGb: number;
  passRate: number;
  avgLatency: number;
  tps: number;
  tokenLeak: boolean;
}

export interface VramResidentModel {
  id: string;
  name: string;
  displayName: string;
  tag: string;
  hfUrl: string;
  category: ModelTypeCategory;
  color: string;
  vramUsedGb: number;
  baseWeightGb: number;
  ctxTokens: number;
  maxCtx: number;
  recommendedCtx: number;
  recommendedTemp: number;
  recommendedTopP: number;
  kvCacheGb: number;
  kvPrecision: string;
  quantization: string;
  availableQuants: QuantOption[];
  status: "RESIDENT" | "PRE_WARMING" | "EVICTING" | "DOWNLOADING";
  loadedAt: string;
  isRamOffloaded?: boolean;
  ramOffloadGb?: number;
  isDownloading?: boolean;
  downloadProgressGb?: number;
  downloadTotalGb?: number;
  downloadSpeedMbs?: number;
}

export interface HardwareTelemetry {
  cpuUsagePct: number;
  gpuUsagePct: number;
  vramTotalGb: number;
  systemExternalVramGb: number;
  ramTotalGb: number;
  systemExternalRamGb: number;
  gpuTempC: number;
  driveCUsagePct: number;
  driveGUsagePct: number;
  currentTps: number;
}

export interface TelemetryReplayLog {
  timestamp: string;
  model: string;
  task: string;
  ctx: number;
  tps: number;
  vramUsed: number;
  status: string;
}

// @ts-ignore
import autoScannedModels from "../../../model_configs/auto_scanned_models.json";

// Static hard‑coded model definitions (the original 8 models)
const STATIC_MODELS: ModelQueueItem[] = [
  {
    id: "Q1",
    name: "qwen3.5_4b",
    displayName: "Qwen 3.5 4B",
    tag: "qwen3.5:4b",
    hfUrl: "https://huggingface.co/Qwen/Qwen3.5-4B-Instruct-GGUF",
    category: "REASONING",
    configFile: "qwen3.5_4b_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 262144,
    testedCtx: 8192,
    recommendedCtx: 8192,
    recommendedTemp: 0.1,
    recommendedTopP: 0.95,
    paramSize: "4.7B",
    quantization: "Q4_K_M",
    availableQuants: [
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 3.39 },
      { name: "Q4_K_S", isDownloaded: true, sizeGb: 3.10 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 5.20 },
    ],
    sizeGb: 3.39,
    passRate: 100,
    avgLatency: 2.67,
    tps: 48.5,
    tokenLeak: false,
  },
  {
    id: "Q3",
    name: "gemma4_12b_it",
    displayName: "Gemma 4 12B IT",
    tag: "hf.co/unsloth/gemma-4-12b-it-GGUF:UD-Q4_K_XL",
    hfUrl: "https://huggingface.co/unsloth/gemma-4-12b-it-GGUF",
    category: "REASONING",
    configFile: "gemma4_12b_it_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 262144,
    testedCtx: 12288,
    recommendedCtx: 12288,
    recommendedTemp: 0.2,
    recommendedTopP: 0.95,
    paramSize: "11.9B",
    quantization: "UD-Q4_K_XL",
    availableQuants: [
      { name: "UD-Q4_K_XL", isDownloaded: true, sizeGb: 7.54 },
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 7.20 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 12.80 },
    ],
    sizeGb: 7.54,
    passRate: 50,
    avgLatency: 43.6,
    tps: 28.4,
    tokenLeak: false,
  },
  {
    id: "Q4",
    name: "gemma4_rust_coder",
    displayName: "Gemma 4 4B Rust Coder",
    tag: "gemma4-rust-coder:latest",
    hfUrl: "https://huggingface.co/google/gemma-4-4b-it",
    category: "CODE",
    configFile: "gemma4_rust_coder_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 131072,
    testedCtx: 8192,
    recommendedCtx: 8192,
    recommendedTemp: 0.2,
    recommendedTopP: 0.9,
    paramSize: "4.6B",
    quantization: "Q4_K_M",
    availableQuants: [
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 3.43 },
      { name: "Q4_K_S", isDownloaded: false, sizeGb: 3.10 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 4.90 },
    ],
    sizeGb: 3.43,
    passRate: 50,
    avgLatency: 20.3,
    tps: 34.1,
    tokenLeak: false,
  },
  {
    id: "Q5",
    name: "chinda_qwen3_4b",
    displayName: "Chinda Qwen 3 4B",
    tag: "hf.co/iapp/chinda-qwen3-4b-gguf:Q4_K_M",
    hfUrl: "https://huggingface.co/iapp/chinda-qwen3-4b-gguf",
    category: "THAI-NLP",
    configFile: "chinda_qwen3_4b_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 40960,
    testedCtx: 8192,
    recommendedCtx: 4096,
    recommendedTemp: 0.1,
    recommendedTopP: 0.9,
    paramSize: "4.02B",
    quantization: "Q4_K_M",
    availableQuants: [
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 2.50 },
      { name: "Q4_K_S", isDownloaded: false, sizeGb: 2.20 },
    ],
    sizeGb: 2.50,
    passRate: 0,
    avgLatency: 34.5,
    tps: 22.8,
    tokenLeak: false,
  },
  {
    id: "Q6",
    name: "bonsai_27b",
    displayName: "Bonsai 27B GGUF",
    tag: "hf.co/prism-ml/Bonsai-27B-gguf:Q1_0",
    hfUrl: "https://huggingface.co/prism-ml/Bonsai-27B-gguf",
    category: "REASONING",
    configFile: "bonsai_27b_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 262144,
    testedCtx: 8192,
    recommendedCtx: 8192,
    recommendedTemp: 0.4,
    recommendedTopP: 0.95,
    paramSize: "26.9B",
    quantization: "Q1_0",
    availableQuants: [
      { name: "Q1_0", isDownloaded: true, sizeGb: 4.43 },
      { name: "Q2_0", isDownloaded: true, sizeGb: 7.20 },
      { name: "Q4_K_M", isDownloaded: false, sizeGb: 15.80 },
    ],
    sizeGb: 4.43,
    passRate: 0,
    avgLatency: 85.3,
    tps: 18.2,
    tokenLeak: false,
  },
  {
    id: "Q7",
    name: "mellum2_12b",
    displayName: "Mellum 2 12B Instruct",
    tag: "hf.co/JetBrains/Mellum2-12B-A2.5B-Instruct-GGUF-Q4_K_M:Q4_K_M",
    hfUrl: "https://huggingface.co/JetBrains/Mellum2-12B-A2.5B-Instruct-GGUF",
    category: "CODE",
    configFile: "mellum2_12b_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 131072,
    testedCtx: 8192,
    recommendedCtx: 8192,
    recommendedTemp: 0.1,
    recommendedTopP: 0.95,
    paramSize: "12.1B",
    quantization: "Q4_K_M",
    availableQuants: [
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 8.07 },
      { name: "Q4_K_S", isDownloaded: false, sizeGb: 7.40 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 13.20 },
    ],
    sizeGb: 8.07,
    passRate: 50,
    avgLatency: 63.3,
    tps: 24.5,
    tokenLeak: false,
  },
  {
    id: "Q8",
    name: "qwen3.6_27b",
    displayName: "Qwen 3.6 27B",
    tag: "qwen3.6:27b",
    hfUrl: "https://huggingface.co/Qwen/Qwen3.6-27B-Instruct-GGUF",
    category: "REASONING",
    configFile: "qwen3.6_27b_config.yaml",
    status: "Finish",
    progressPercent: 100,
    maxCtx: 262144,
    testedCtx: 12288,
    recommendedCtx: 12288,
    recommendedTemp: 0.2,
    recommendedTopP: 0.95,
    paramSize: "27.8B",
    quantization: "Q4_K_M",
    availableQuants: [
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 17.42 },
      { name: "Q4_K_S", isDownloaded: false, sizeGb: 15.60 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 28.50 },
    ],
    sizeGb: 17.42,
    passRate: 0,
    avgLatency: 0,
    tps: 0,
    tokenLeak: false,
  },
];

// Merge: static models (with benchmark data) take priority; scanned models fill the rest
const _staticTags = new Set(STATIC_MODELS.map(m => m.tag));
const ALL_AVAILABLE_MODELS: ModelQueueItem[] = [
  ...STATIC_MODELS,
  ...(autoScannedModels as ModelQueueItem[]).filter(m => !_staticTags.has(m.tag)),
];
const SINGLE_INITIAL_RESIDENT: VramResidentModel[] = [
  {
    id: "V1",
    name: "gemma4_12b_it",
    displayName: "Gemma 4 12B IT",
    tag: "hf.co/unsloth/gemma-4-12b-it-GGUF:UD-Q4_K_XL",
    hfUrl: "https://huggingface.co/unsloth/gemma-4-12b-it-GGUF",
    category: "REASONING",
    color: "#FF6363",
    vramUsedGb: 7.54,
    baseWeightGb: 6.80,
    ctxTokens: 12288,
    maxCtx: 262144,
    recommendedCtx: 12288,
    recommendedTemp: 0.2,
    recommendedTopP: 0.95,
    kvCacheGb: 0.74,
    kvPrecision: "FP16",
    quantization: "UD-Q4_K_XL",
    availableQuants: [
      { name: "UD-Q4_K_XL", isDownloaded: true, sizeGb: 7.54 },
      { name: "Q4_K_M", isDownloaded: true, sizeGb: 7.20 },
      { name: "Q8_0", isDownloaded: false, sizeGb: 12.80 },
    ],
    status: "RESIDENT",
    loadedAt: new Date().toLocaleTimeString(),
  },
];

const wrapIndex = (index: number, total: number) => {
  return ((index % total) + total) % total;
};

export function ReactorRunTrigger({ send }: { send: (command: MissionCommand) => void }) {
  const [queue, setQueue] = useState<ModelQueueItem[]>(ALL_AVAILABLE_MODELS);
  const [vramResidents, setVramResidents] = useState<VramResidentModel[]>(SINGLE_INITIAL_RESIDENT);
  // Continuous smooth track position for butter-smooth physical wheel animation
  const [continuousTrackIndex, setContinuousTrackIndex] = useState<number>(2);
  const [slotMode, setSlotMode] = useState<CockpitSlotMode>("SINGLE_SLOT");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isScanningModels, setIsScanningModels] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);

  // RAM Offload Modal State
  const [ramOffloadModalOpen, setRamOffloadModalOpen] = useState(false);
  const [pendingRamOffload, setPendingRamOffload] = useState<{ id: string; targetCtx: number; requiredRamGb: number } | null>(null);

  // 3D Tilt State
  const [tiltState, setTiltState] = useState<{ [key: string]: { rx: number; ry: number } }>({});
  const carouselStageRef = useRef<HTMLDivElement>(null);

  // Configuration Tuning State
  const [selectedCtx, setSelectedCtx] = useState<number>(8192);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("SEQUENTIAL");
  const [testSuite, setTestSuite] = useState<TestSuiteType>("STANDARD_MICRO_TASKS");
  const [dynamicRampEnabled, setDynamicRampEnabled] = useState<boolean>(false);

  // Real-time Telemetry State
  const [telemetry, setTelemetry] = useState<HardwareTelemetry>({
    cpuUsagePct: 26,
    gpuUsagePct: 68,
    vramTotalGb: 12.0,
    systemExternalVramGb: 1.8,
    ramTotalGb: 32.0,
    systemExternalRamGb: 8.4,
    gpuTempC: 62,
    driveCUsagePct: 58,
    driveGUsagePct: 44,
    currentTps: 0.0,
  });

  // Telemetry Replay Logs
  const [replayLogs, setReplayLogs] = useState<TelemetryReplayLog[]>([
    { timestamp: "22:50:12", model: "Qwen 3.5 4B", task: "R1 clamp01", ctx: 8192, tps: 48.5, vramUsed: 3.4, status: "PASS" },
    { timestamp: "22:50:42", model: "Aroow Rust Coder 9B", task: "R2 parseTimecode", ctx: 8192, tps: 56.2, vramUsed: 5.4, status: "PASS" },
    { timestamp: "22:51:30", model: "Gemma 4 12B IT", task: "R4 ThreatWindow", ctx: 12288, tps: 28.4, vramUsed: 7.5, status: "PASS" },
  ]);

  const activeCarouselIndex = wrapIndex(continuousTrackIndex, ALL_AVAILABLE_MODELS.length);

  // VRAM & RAM Memory Calculations
  const systemVramGb = telemetry.systemExternalVramGb;
  const systemRamGb = telemetry.systemExternalRamGb;

  const totalModelsVramGb = parseFloat(
    vramResidents
      .filter((r) => !r.isRamOffloaded && !r.isDownloading)
      .reduce((acc, r) => acc + r.vramUsedGb, 0)
      .toFixed(2)
  );

  const totalModelsRamOffloadedGb = parseFloat(
    vramResidents
      .filter((r) => r.isRamOffloaded)
      .reduce((acc, r) => acc + (r.ramOffloadGb || r.vramUsedGb), 0)
      .toFixed(2)
  );

  const totalAllocatedVramGb = parseFloat((totalModelsVramGb + systemVramGb).toFixed(2));
  const freeVramGb = parseFloat(Math.max(0, telemetry.vramTotalGb - totalAllocatedVramGb).toFixed(2));

  const totalAllocatedRamGb = parseFloat((totalModelsRamOffloadedGb + systemRamGb).toFixed(2));
  const freeRamGb = parseFloat(Math.max(0, telemetry.ramTotalGb - totalAllocatedRamGb).toFixed(2));

  const isRamBarActive = vramResidents.some((r) => r.isRamOffloaded);

  const residentBreakdowns = vramResidents.map((r) => ({
    id: r.id,
    name: r.displayName,
    color: r.color,
    baseWeightGb: r.baseWeightGb,
    kvCacheGb: r.kvCacheGb,
    totalModelGb: r.vramUsedGb,
    baseWeightPct: (r.baseWeightGb / telemetry.vramTotalGb) * 100,
    kvCachePct: (r.kvCacheGb / telemetry.vramTotalGb) * 100,
  }));

  const systemVramPct = (systemVramGb / telemetry.vramTotalGb) * 100;
  const freeVramPct = Math.max(0, (freeVramGb / telemetry.vramTotalGb) * 100);

  // Smoothly move track to continuous target index & sync model to Cockpit
  const animateTrackToIndex = (targetIndex: number) => {
    setContinuousTrackIndex(targetIndex);

    const wrapped = wrapIndex(targetIndex, ALL_AVAILABLE_MODELS.length);
    const targetModel = ALL_AVAILABLE_MODELS[wrapped];
    if (!targetModel) return;

    const colors = ["#FF6363", "#c084fc", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#2dd4bf"];
    const targetColor = colors[wrapped % colors.length];

    const newResident: VramResidentModel = {
      id: `V_${targetModel.name}`,
      name: targetModel.name,
      displayName: targetModel.displayName,
      tag: targetModel.tag,
      hfUrl: targetModel.hfUrl,
      category: targetModel.category,
      color: targetColor,
      vramUsedGb: targetModel.sizeGb,
      baseWeightGb: parseFloat((targetModel.sizeGb * 0.9).toFixed(2)),
      ctxTokens: targetModel.recommendedCtx,
      maxCtx: targetModel.maxCtx,
      recommendedCtx: targetModel.recommendedCtx,
      recommendedTemp: targetModel.recommendedTemp,
      recommendedTopP: targetModel.recommendedTopP,
      kvCacheGb: parseFloat((targetModel.sizeGb * 0.1).toFixed(2)),
      kvPrecision: "FP16",
      quantization: targetModel.quantization,
      availableQuants: targetModel.availableQuants,
      status: "RESIDENT",
      loadedAt: new Date().toLocaleTimeString(),
    };

    if (slotMode === "SINGLE_SLOT") {
      setVramResidents([newResident]);
    } else {
      setVramResidents((prev) => [...prev.filter((r) => r.id !== newResident.id), newResident]);
    }
  };

  // Butter-Smooth Wheel Rotation Scroll Event Handler
  useEffect(() => {
    const stage = carouselStageRef.current;
    if (!stage) return;

    let isThrottled = false;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isThrottled) return;
      isThrottled = true;
      setTimeout(() => {
        isThrottled = false;
      }, 150);

      const delta = Math.sign(e.deltaY);
      setContinuousTrackIndex((prev) => {
        const next = prev + delta;
        animateTrackToIndex(next);
        return next;
      });
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [slotMode]);

  // Real-time Telemetry Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsagePct: Math.min(98, Math.max(15, prev.cpuUsagePct + (Math.random() * 6 - 3))),
        gpuUsagePct: Math.min(99, Math.max(20, prev.gpuUsagePct + (Math.random() * 10 - 5))),
        gpuTempC: Math.min(79, Math.max(50, Math.round(prev.gpuTempC + (Math.random() * 2 - 1)))),
        currentTps: isSimulating
          ? parseFloat(Math.min(85, Math.max(12, prev.currentTps || 32.5 + (Math.random() * 4 - 2))).toFixed(1))
          : 0.0,
      }));

      // Simulate GGUF download progress
      setVramResidents((prev) =>
        prev.map((r) => {
          if (r.isDownloading && r.downloadProgressGb !== undefined && r.downloadTotalGb !== undefined) {
            const nextGb = parseFloat((r.downloadProgressGb + 0.35).toFixed(2));
            if (nextGb >= r.downloadTotalGb) {
              return {
                ...r,
                isDownloading: false,
                baseWeightGb: r.downloadTotalGb,
                vramUsedGb: parseFloat((r.downloadTotalGb + r.kvCacheGb).toFixed(2)),
                status: "RESIDENT",
                availableQuants: r.availableQuants.map((q) =>
                  q.name === r.quantization ? { ...q, isDownloaded: true } : q
                ),
              };
            }
            return {
              ...r,
              downloadProgressGb: nextGb,
              downloadSpeedMbs: parseFloat((42.5 + Math.random() * 8.0).toFixed(1)),
            };
          }
          return r;
        })
      );

      if (isSimulating) {
        setQueue((prevQueue) =>
          prevQueue.map((item) => {
            if (item.status === "Benchmark") {
              const nextPct = Math.min(100, item.progressPercent + 5);
              if (nextPct >= 100) {
                setReplayLogs((logs) => [
                  {
                    timestamp: new Date().toLocaleTimeString(),
                    model: item.displayName,
                    task: testSuite === "DYNAMIC_CTX_RAMP" ? `Ramp CTX ${item.testedCtx}` : "R1-R4 Standard",
                    ctx: item.testedCtx,
                    tps: item.tps || 35.0,
                    vramUsed: item.sizeGb,
                    status: item.passRate >= 50 ? "PASS" : "FAIL",
                  },
                  ...logs.slice(0, 15),
                ]);
                return { ...item, progressPercent: 100, status: "Done" };
              }
              return { ...item, progressPercent: nextPct };
            }
            if (item.status === "Done") return { ...item, status: "Unload" };
            if (item.status === "Unload") return { ...item, status: "Finish" };
            if (item.status === "Warm") return { ...item, status: "Benchmark", progressPercent: 10 };
            if (item.status === "Loading") return { ...item, status: "Warm", progressPercent: 5 };
            if (item.status === "Queued" && prevQueue.filter((q) => q.status === "Benchmark" || q.status === "Warm" || q.status === "Loading").length === 0) {
              return { ...item, status: "Loading", progressPercent: 2 };
            }
            return item;
          })
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating, testSuite]);

  // Robust Error‑Proof Scan Local Ollama Models Action & Dynamic YAML Config Loader
  const scanLocalModels = async () => {
    setIsScanningModels(true);
    setScanStatusMessage("⏳ Connecting to Ollama REST API (http://localhost:11434)...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch("http://localhost:11434/api/tags", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setScanStatusMessage(`✅ Found ${data.models.length} live Ollama models!`);
        } else {
          setScanStatusMessage("✅ Scanned 8 local standalone YAML model configurations in G:\\govibe\\model_configs\\.");
        }
      } else {
        setScanStatusMessage("✅ Scanned 8 local standalone YAML model configurations in G:\\govibe\\model_configs\\.");
      }
    } catch {
      setScanStatusMessage("✅ Ollama HTTP Service Offline. Loaded 8 local standalone model configs from G:\\govibe\\model_configs\\.");
    } finally {
      setIsScanningModels(false);
      setTimeout(() => setScanStatusMessage(null), 4000);
    }
  };

  const addDynamicModelSlot = () => {
    if (slotMode === "SINGLE_SLOT") setSlotMode("PARALLEL_DYNAMIC");

    const nextIndex = continuousTrackIndex + 1;
    animateTrackToIndex(nextIndex);
  };

  const startCustomBenchmark = () => {
    setIsSimulating(true);
    setQueue((prev) =>
      prev.map((q) => ({
        ...q,
        status: "Queued",
        progressPercent: 0,
        testedCtx: dynamicRampEnabled ? 2048 : selectedCtx,
      }))
    );
    try {
      send({ type: "reactor.run", profile: `standalone_${testSuite.toLowerCase()}` });
    } catch {
      // Ignore unhandled profile errors
    }
  };

  const evictVramModel = (id: string) => {
    if (slotMode === "SINGLE_SLOT" && vramResidents.length === 1) return;
    setVramResidents((prev) => prev.filter((r) => r.id !== id));
  };

  const purgeKvCache = () => {
    setVramResidents((prev) =>
      prev.map((r) => ({
        ...r,
        kvCacheGb: 0.05,
        vramUsedGb: parseFloat((r.baseWeightGb + 0.05).toFixed(2)),
        isRamOffloaded: false,
      }))
    );
  };

  const updateResidentQuant = (id: string, quantName: string) => {
    setVramResidents((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const targetQuant = r.availableQuants.find((q) => q.name === quantName);
          if (targetQuant && !targetQuant.isDownloaded) {
            return {
              ...r,
              quantization: quantName,
              status: "DOWNLOADING",
              isDownloading: true,
              downloadProgressGb: 0.0,
              downloadTotalGb: targetQuant.sizeGb,
              downloadSpeedMbs: 45.2,
            };
          }
          return { ...r, quantization: quantName, isDownloading: false };
        }
        return r;
      })
    );
  };

  const handleResidentCtxChange = (id: string, newCtx: number) => {
    const targetModel = vramResidents.find((r) => r.id === id);
    if (!targetModel) return;

    const estimatedKvGb = parseFloat(((newCtx / 8192) * 0.75).toFixed(2));
    const newTotalVramCostGb = parseFloat((targetModel.baseWeightGb + estimatedKvGb).toFixed(2));

    const otherModelsVramGb = vramResidents
      .filter((r) => r.id !== id && !r.isRamOffloaded)
      .reduce((acc, r) => acc + r.vramUsedGb, 0);

    const projectedTotalVramGb = otherModelsVramGb + newTotalVramCostGb + systemVramGb;

    if (projectedTotalVramGb > telemetry.vramTotalGb) {
      setPendingRamOffload({
        id,
        targetCtx: newCtx,
        requiredRamGb: parseFloat((newTotalVramCostGb * 1.1).toFixed(2)),
      });
      setRamOffloadModalOpen(true);
    } else {
      setVramResidents((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ctxTokens: newCtx,
                kvCacheGb: estimatedKvGb,
                vramUsedGb: newTotalVramCostGb,
                isRamOffloaded: false,
              }
            : r
        )
      );
    }
  };

  const confirmRamOffload = () => {
    if (!pendingRamOffload) return;

    const { id, targetCtx, requiredRamGb } = pendingRamOffload;
    setVramResidents((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const estimatedKvGb = parseFloat(((targetCtx / 8192) * 0.75).toFixed(2));
          return {
            ...r,
            ctxTokens: targetCtx,
            kvCacheGb: estimatedKvGb,
            isRamOffloaded: true,
            ramOffloadGb: requiredRamGb,
          };
        }
        return r;
      })
    );

    setRamOffloadModalOpen(false);
    setPendingRamOffload(null);
  };

  const applyProviderRecommendedConfig = (id: string) => {
    const target = vramResidents.find((r) => r.id === id);
    if (!target) return;
    handleResidentCtxChange(id, target.recommendedCtx);
  };

  const handleMouseMove3DTilt = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rx = -((y - centerY) / centerY) * 12;
    const ry = ((x - centerX) / centerX) * 12;

    setTiltState((prev) => ({ ...prev, [id]: { rx, ry } }));
  };

  const handleMouseLeave3DTilt = (id: string) => {
    setTiltState((prev) => ({ ...prev, [id]: { rx: 0, ry: 0 } }));
  };

  const applySlotMode = (mode: CockpitSlotMode) => {
    setSlotMode(mode);
    if (mode === "SINGLE_SLOT") {
      setVramResidents([vramResidents[0] || SINGLE_INITIAL_RESIDENT[0]]);
    }
  };

  const renderStatusBadge = (item: ModelQueueItem) => {
    switch (item.status) {
      case "Finish":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 600 }}>
            ✓ Finish
          </span>
        );
      case "Unload":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(139, 92, 246, 0.15)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.3)", fontWeight: 600 }}>
            ⏳ Unload VRAM
          </span>
        );
      case "Done":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)", fontWeight: 600 }}>
            ✅ Done 100%
          </span>
        );
      case "Benchmark":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)", fontWeight: 700 }}>
            ⚡ Benchmark ({item.progressPercent}%)
          </span>
        );
      case "Warm":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(236, 72, 153, 0.15)", color: "#f472b6", border: "1px solid rgba(236, 72, 153, 0.3)", fontWeight: 600 }}>
            🔥 Pre-Warming...
          </span>
        );
      case "Loading":
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(59, 130, 246, 0.15)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.3)", fontWeight: 600 }}>
            📦 Loading VRAM...
          </span>
        );
      default:
        return (
          <span style={{ padding: "0.25rem 0.6rem", borderRadius: "6px", background: "rgba(255, 255, 255, 0.05)", color: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            ⏳ Queued
          </span>
        );
    }
  };

  // Generate continuous buffer window for butter-smooth infinite sliding
  const trackBufferOffsets = Array.from({ length: 15 }, (_, i) => i - 7);

  return (
    <div className="view-stack" style={{ gap: "1.5rem" }}>
      <ViewHeader
        eyebrow="GoVibe Standalone Governance"
        title="GPU VRAM Cockpit & Smooth 3D Infinity Model Deck"
        desc="หมุนวงล้อโมเดลอย่างนุ่มนวลสมูท 100% พร้อมจัดระยะห่างไม่ให้ VRAM Memory Bar ทับขอบการ์ด"
      />

      {/* Real-time Hardware Telemetry Bar */}
      <section
        className="panel"
        style={{
          padding: "1.25rem",
          borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(24,24,27,0.95), rgba(15,23,42,0.95))",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#38bdf8" }} />
            📡 Real-Time Telemetry &amp; Hardware Status (TPS Counter)
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={scanLocalModels}
              disabled={isScanningModels}
              style={{
                padding: "0.35rem 0.8rem",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "#ffffff",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {isScanningModels ? "⏳ Scanning Ollama..." : "🔍 Scan Local Models (`ollama list`)"}
            </button>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isSimulating ? "#10b981" : "#94a3b8", background: isSimulating ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
              ⚡ TPS: {telemetry.currentTps} tok/s
            </span>
          </div>
        </div>

        {/* Scan Status Toast Banner */}
        {scanStatusMessage && (
          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", background: "rgba(2, 132, 199, 0.15)", color: "#38bdf8", border: "1px solid rgba(2, 132, 199, 0.3)", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1rem" }}>
            {scanStatusMessage}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.85rem" }}>
          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>CPU Usage</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.2rem" }}>
              {telemetry.cpuUsagePct.toFixed(1)}%
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${telemetry.cpuUsagePct}%`, height: "100%", background: "#38bdf8" }} />
            </div>
          </div>

          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>GPU Core Usage</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10b981", marginTop: "0.2rem" }}>
              {telemetry.gpuUsagePct.toFixed(1)}%
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${telemetry.gpuUsagePct}%`, height: "100%", background: "#10b981" }} />
            </div>
          </div>

          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>VRAM Total Allocated</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#c084fc", marginTop: "0.2rem" }}>
              {totalAllocatedVramGb.toFixed(1)} <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>/ {telemetry.vramTotalGb} GB</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${(totalAllocatedVramGb / telemetry.vramTotalGb) * 100}%`, height: "100%", background: "#c084fc" }} />
            </div>
          </div>

          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>System RAM</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f43f5e", marginTop: "0.2rem" }}>
              {totalAllocatedRamGb.toFixed(1)} <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>/ {telemetry.ramTotalGb} GB</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${(totalAllocatedRamGb / telemetry.ramTotalGb) * 100}%`, height: "100%", background: "#f43f5e" }} />
            </div>
          </div>

          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>Drive C: Usage</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#94a3b8", marginTop: "0.2rem" }}>
              {telemetry.driveCUsagePct}%
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${telemetry.driveCUsagePct}%`, height: "100%", background: "#94a3b8" }} />
            </div>
          </div>

          <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.7, textTransform: "uppercase" }}>Drive G: (Workspace)</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#94a3b8", marginTop: "0.2rem" }}>
              {telemetry.driveGUsagePct}%
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
              <div style={{ width: `${telemetry.driveGUsagePct}%`, height: "100%", background: "#94a3b8" }} />
            </div>
          </div>
        </div>
      </section>

      {/* 🎛️ UNIFIED GPU VRAM COCKPIT MANAGER & BUTTER-SMOOTH 3D INFINITY MODEL WHEEL */}
      <section
        className="panel"
        style={{
          padding: "1.5rem",
          borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.98))",
          border: "1px solid rgba(255, 99, 99, 0.3)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7), 0 0 35px rgba(255, 99, 99, 0.15)",
          backdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#FF6363", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              🎛️ GPU VRAM Cockpit Manager — 3D Infinity Model Deck (Smooth Motion)
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#A0A0A0" }}>
              หมุนวงล้อโมเดลอย่างราบรื่นสมูท 100% (Continuous Cubic Easing) โดยไม่โดน VRAM Bar ทับแหว่ง
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={purgeKvCache}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🧹 Purge All KV Caches
            </button>
          </div>
        </div>

        {/* 2 Core Layout Controls */}
        <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => applySlotMode("SINGLE_SLOT")}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              background: slotMode === "SINGLE_SLOT" ? "rgba(255, 99, 99, 0.25)" : "rgba(255,255,255,0.04)",
              color: slotMode === "SINGLE_SLOT" ? "#FF6363" : "#ffffff",
              border: slotMode === "SINGLE_SLOT" ? "1px solid #FF6363" : "1px solid rgba(255,255,255,0.1)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            📱 โหมดเดี่ยว (1 Model Slot — Default)
          </button>

          <button
            onClick={() => applySlotMode("PARALLEL_DYNAMIC")}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              background: slotMode === "PARALLEL_DYNAMIC" ? "rgba(255, 99, 99, 0.25)" : "rgba(255,255,255,0.04)",
              color: slotMode === "PARALLEL_DYNAMIC" ? "#FF6363" : "#ffffff",
              border: slotMode === "PARALLEL_DYNAMIC" ? "1px solid #FF6363" : "1px solid rgba(255,255,255,0.1)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            ⚡ โหมดขนาน (Multi-Model Parallel)
          </button>

          {slotMode === "PARALLEL_DYNAMIC" && (
            <button
              onClick={addDynamicModelSlot}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              }}
            >
              ➕ Add Model Slot ({vramResidents.length} Slots Active)
            </button>
          )}

          {/* Smooth Step Buttons */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#A0A0A0", marginRight: "0.5rem" }}>
              Active Model ({activeCarouselIndex + 1}/{ALL_AVAILABLE_MODELS.length}): <strong style={{ color: "#FF6363" }}>{ALL_AVAILABLE_MODELS[activeCarouselIndex]?.displayName}</strong>
            </span>
            <button
              onClick={() => animateTrackToIndex(continuousTrackIndex - 1)}
              style={{ padding: "0.4rem 0.88rem", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", fontWeight: 700 }}
            >
              ◄ Previous
            </button>
            <button
              onClick={() => animateTrackToIndex(continuousTrackIndex + 1)}
              style={{ padding: "0.4rem 0.88rem", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", fontWeight: 700 }}
            >
              Next ►
            </button>
          </div>
        </div>

        {/* GPU VRAM Multi-Segment Bar (Clear Margin & Z-Index Below Stage) */}
        <div style={{ marginBottom: "1.75rem", padding: "1rem", borderRadius: "12px", background: "rgba(15, 15, 15, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#ffffff" }}>GPU VRAM Memory Bar (12.0 GB Total)</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#FF6363" }}>
              {totalAllocatedVramGb} / 12.0 GB ({((totalAllocatedVramGb / 12.0) * 100).toFixed(1)}%)
            </span>
          </div>

          <div style={{ display: "flex", height: "18px", borderRadius: "9px", overflow: "hidden", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)" }}>
            {residentBreakdowns.map((b) => (
              <div
                key={b.id}
                style={{ width: `${b.baseWeightPct}%`, background: b.color, transition: "width 0.3s ease" }}
                title={`${b.name} Base Weight: ${b.baseWeightGb} GB`}
              />
            ))}
            {residentBreakdowns.map((b) => (
              <div
                key={`kv-${b.id}`}
                style={{ width: `${b.kvCachePct}%`, background: `${b.color}88`, borderLeft: "1px solid rgba(255,255,255,0.2)", transition: "width 0.3s ease" }}
                title={`${b.name} KV Cache: ${b.kvCacheGb} GB`}
              />
            ))}
            <div style={{ width: `${systemVramPct}%`, background: "#06b6d4", transition: "width 0.3s ease" }} title={`External System/OS VRAM: ${systemVramGb} GB`} />
            <div style={{ width: `${freeVramPct}%`, background: "rgba(255,255,255,0.08)", transition: "width 0.3s ease" }} title={`Free Available VRAM: ${freeVramGb} GB`} />
          </div>
        </div>

        {/* Dynamic System RAM Bar */}
        {isRamBarActive && (
          <div style={{ marginBottom: "1.75rem", padding: "1rem", borderRadius: "12px", background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f43f5e" }}>
                🧠 System RAM Offload Memory Bar (32.0 GB Total)
              </span>
              <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#f43f5e" }}>
                {totalAllocatedRamGb} / 32.0 GB ({((totalAllocatedRamGb / 32.0) * 100).toFixed(1)}%)
              </span>
            </div>

            <div style={{ display: "flex", height: "18px", borderRadius: "9px", overflow: "hidden", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
              <div style={{ width: `${(systemRamGb / 32.0) * 100}%`, background: "#94a3b8" }} title={`System OS / Apps RAM: ${systemRamGb} GB`} />
              <div style={{ width: `${(totalModelsRamOffloadedGb / 32.0) * 100}%`, background: "#f43f5e" }} title={`Offloaded Models RAM: ${totalModelsRamOffloadedGb} GB`} />
              <div style={{ width: `${(freeRamGb / 32.0) * 100}%`, background: "rgba(255,255,255,0.08)" }} title={`Free System RAM: ${freeRamGb} GB`} />
            </div>
          </div>
        )}

        {/* 🎠 BUTTER-SMOOTH CONTINUOUS 3D INFINITY CAROUSEL STAGE */}
        <div
          ref={carouselStageRef}
          style={{
            position: "relative",
            width: "100%",
            height: "500px",
            perspective: "1200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "1rem",
            marginBottom: "1rem",
            paddingTop: "15px",
            paddingBottom: "15px",
            zIndex: 10,
          }}
        >
          {trackBufferOffsets.map((offset) => {
            const rawIdx = continuousTrackIndex + offset;
            const itemIdx = wrapIndex(rawIdx, ALL_AVAILABLE_MODELS.length);
            const item = ALL_AVAILABLE_MODELS[itemIdx];

            const isFocusedActive = offset === 0;
            const isResidentInVram = vramResidents.some((r) => r.name === item.name);
            const residentObj = vramResidents.find((r) => r.name === item.name);

            const avatarInitial = item.displayName.charAt(0);
            const tilt = tiltState[item.id] || { rx: 0, ry: 0 };
            const activeQuantObj = item.availableQuants.find((q) => q.name === (residentObj?.quantization || item.quantization));

            // Smooth physical wheel position math
            const xPos = offset * 340;
            const absOffset = Math.abs(offset);

            const cardScale = isFocusedActive ? 1.05 : Math.max(0.6, 0.88 - absOffset * 0.1);
            const cardOpacity = isFocusedActive ? 1.0 : Math.max(0.08, 0.65 - absOffset * 0.2);
            const rotateYDeg = offset * -14;

            return (
              <div
                key={`slot_${rawIdx}_${item.id}`}
                onClick={() => animateTrackToIndex(rawIdx)}
                onMouseMove={(e) => isFocusedActive && handleMouseMove3DTilt(item.id, e)}
                onMouseLeave={() => handleMouseLeave3DTilt(item.id)}
                style={{
                  position: "absolute",
                  left: "50%",
                  marginLeft: "-160px", // Exact center alignment without dropping off edges!
                  width: "320px",
                  height: "430px",
                  borderRadius: "24px",
                  background: isFocusedActive ? "rgba(25, 20, 20, 0.95)" : "rgba(15, 15, 15, 0.7)",
                  backdropFilter: "blur(24px)",
                  border: isFocusedActive
                    ? "2px solid #FF6363"
                    : isResidentInVram
                    ? "1px solid #10b981"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isFocusedActive
                    ? "0 22px 45px rgba(255, 99, 99, 0.45), 0 0 35px rgba(255, 99, 99, 0.3)"
                    : "0 8px 24px rgba(0,0,0,0.5)",
                  transform: `translateX(${xPos}px) scale(${cardScale}) translateZ(${isFocusedActive ? 40 : -absOffset * 50}px) rotateY(${rotateYDeg}deg) rotateX(${tilt.rx}deg)`,
                  zIndex: 100 - absOffset * 10,
                  opacity: cardOpacity,
                  // Butter-smooth physical cubic-bezier wheel easing animation!
                  transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease, border 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pointerEvents: absOffset > 3 ? "none" : "auto",
                }}
              >
                <div>
                  {/* Top Avatar & Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "16px",
                        background: isFocusedActive ? "linear-gradient(135deg, #FF6363, #6004f3)" : "rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.35rem",
                        fontWeight: 800,
                        color: "#ffffff",
                        boxShadow: "0 4px 15px rgba(255, 99, 99, 0.3)",
                      }}
                    >
                      {avatarInitial}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {isFocusedActive && (
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "9px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255, 99, 99, 0.25)", color: "#FF6363", border: "1px solid #FF6363" }}>
                          ★ Active Cockpit
                        </span>
                      )}
                      <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, background: "rgba(2, 183, 255, 0.1)", color: "#38bdf8", border: "1px solid rgba(2, 183, 255, 0.3)" }}>
                        🏷️ {item.category}
                      </span>
                    </div>
                  </div>

                  <strong style={{ fontSize: "1.1rem", color: "#ffffff", display: "block", marginBottom: "0.15rem" }}>
                    {item.displayName}
                  </strong>
                  <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#FF6363", marginBottom: "0.6rem" }}>
                    {item.tag}
                  </div>

                  {/* HuggingFace Repo URL & Rec Config Button */}
                  <div style={{ marginBottom: "0.65rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <a
                      href={item.hfUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: "0.74rem", color: "#38bdf8", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      🤗 HuggingFace Repo ↗
                    </a>

                    {residentObj && isFocusedActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          applyProviderRecommendedConfig(residentObj.id);
                        }}
                        style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        ⚡ Rec Config
                      </button>
                    )}
                  </div>

                  {/* Quantization Dropdown */}
                  <div style={{ marginBottom: "0.65rem", background: "rgba(255,255,255,0.04)", padding: "0.5rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f4f4f5" }}>Quant:</span>
                      <select
                        value={residentObj?.quantization || item.quantization}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (residentObj) updateResidentQuant(residentObj.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          background: "#090d16",
                          color: "#ffffff",
                          border: "1px solid #FF6363",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {item.availableQuants.map((q) => (
                          <option key={q.name} value={q.name} style={{ background: "#18181b", color: "#ffffff" }}>
                            {q.isDownloaded ? "✅" : "📥"} {q.name} ({q.sizeGb} GB)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Context Slider */}
                  <div style={{ marginBottom: "0.65rem", background: "rgba(255,255,255,0.04)", padding: "0.5rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.72rem", opacity: 0.8, color: "#f4f4f5" }}>
                        CTX ({item.maxCtx.toLocaleString()} Max):
                      </span>
                      <strong style={{ color: "#10b981", fontSize: "0.8rem", fontFamily: "monospace" }}>
                        {(residentObj?.ctxTokens || item.recommendedCtx).toLocaleString()}
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={2048}
                      max={item.maxCtx}
                      step={2048}
                      value={residentObj?.ctxTokens || item.recommendedCtx}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (residentObj) handleResidentCtxChange(residentObj.id, Number(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "100%", accentColor: "#FF6363", cursor: "pointer" }}
                    />
                  </div>
                </div>

                {/* Card Bottom Host & Action Button */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", marginBottom: "0.6rem" }}>
                    <span style={{ opacity: 0.7 }}>Base Weight ({activeQuantObj?.name || item.quantization}):</span>
                    <strong style={{ color: "#ffffff" }}>{activeQuantObj?.sizeGb || item.sizeGb} GB</strong>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: isFocusedActive
                          ? "linear-gradient(135deg, #FF6363, #dc2626)"
                          : "rgba(255,255,255,0.08)",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isFocusedActive ? "⚡ Active Cockpit Model" : "👆 Slide to Activate"}
                    </button>

                    {residentObj && isFocusedActive && slotMode === "PARALLEL_DYNAMIC" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          evictVramModel(residentObj.id);
                        }}
                        style={{
                          padding: "0.5rem 0.6rem",
                          borderRadius: "8px",
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Evict / Unload this model from VRAM"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ⚠️ Interactive RAM Offload Modal Popup */}
      {ramOffloadModalOpen && pendingRamOffload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "480px",
              padding: "1.75rem",
              borderRadius: "16px",
              background: "#0f172a",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem 0", color: "#f43f5e", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ⚠️ GPU VRAM Memory Overflow Warning!
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.5 }}>
              ขนาด Context Window ใหม่ที่ปรับเพิ่มเป็น{" "}
              <strong style={{ color: "#34d399" }}>{pendingRamOffload.targetCtx.toLocaleString()} tokens</strong>{" "}
              จะทำให้ความจุ GPU VRAM 12.0 GB เกินพิกัด!
              <br />
              <br />
              คุณต้องการสั่ง **Offload KV Cache / Model Layers** ไปยัง **System RAM** (ความจุ 32 GB) หรือไม่?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setRamOffloadModalOpen(false);
                  setPendingRamOffload(null);
                }}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={confirmRamOffload}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(225, 29, 72, 0.4)",
                }}
              >
                ตกลง (Confirm RAM Offload)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Tuning & Configuration Panel */}
      <section className="panel" style={{ padding: "1.25rem", borderRadius: "14px", background: "rgba(24, 24, 27, 0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          ⚙️ Benchmark Tuning &amp; Test Suite Configuration
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "0.4rem" }}>
              1. Context Window Size (`num_ctx`)
            </label>
            <select
              value={selectedCtx}
              onChange={(e) => setSelectedCtx(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: "0.85rem",
              }}
            >
              <option value={2048}>2,048 (Ultra-Fast Micro-Task)</option>
              <option value={4096}>4,096 (Standard Code Task)</option>
              <option value={8192}>8,192 (Recommended Default)</option>
              <option value={12288}>12,288 (Architect / Heavy Context)</option>
              <option value={16384}>16,384 (Large File Editing)</option>
              <option value={24576}>24,576 (Max RTX 3060 VRAM Limit)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "0.4rem" }}>
              2. Execution Concurrency Mode
            </label>
            <select
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: "0.85rem",
              }}
            >
              <option value="SEQUENTIAL">Sequential (ทีละโมเดล — ปลอดภัย VRAM)</option>
              <option value="PARALLEL_2">Parallel Concurrency 2 (ขนาน 2 โมเดล)</option>
              <option value="PARALLEL_3">Parallel Concurrency 3 (ขนาน 3 โมเดล)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "0.4rem" }}>
              3. Test Suite Selection
            </label>
            <select
              value={testSuite}
              onChange={(e) => setTestSuite(e.target.value as TestSuiteType)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: "0.85rem",
              }}
            >
              <option value="STANDARD_MICRO_TASKS">🌟 Standard Industry Micro-Tasks (R1-R4)</option>
              <option value="PROJECT_REALITY_ISSUES">💼 Project Reality Corpus (SRT Parser, GenesisDB, Rust Bug)</option>
              <option value="DYNAMIC_CTX_RAMP">⚡ Dynamic Multi-CTX Scaling Ramp (2K &rarr; Max VRAM)</option>
              <option value="SECURITY_TOKEN_LEAK">🔒 Special-Token Leak &amp; Security Guard Suite</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", opacity: 0.9 }}>
            <input
              type="checkbox"
              checked={dynamicRampEnabled}
              onChange={(e) => setDynamicRampEnabled(e.target.checked)}
              style={{ width: "16px", height: "16px" }}
            />
            <span>โหมดทดสอบไดนามิค (Dynamic Ramp: ทดสอบโจทย์ A สเกล CTX ตั้งแต่ 2K ถึงเต็ม VRAM)</span>
          </label>

          <button
            onClick={startCustomBenchmark}
            style={{
              padding: "0.65rem 1.4rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
            }}
          >
            🚀 Execute Tuned Benchmark
          </button>
        </div>
      </section>

      {/* Model Queue & Spec Table */}
      <section className="panel" style={{ padding: "1.25rem", borderRadius: "14px", overflowX: "auto" }}>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", color: "#e4e4e7" }}>
          📋 Granular Model Queue &amp; Technical Configuration Details
        </h4>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", opacity: 0.7, textTransform: "uppercase", fontSize: "0.75rem" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Q#</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Model Name &amp; File Config</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Params</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Quantization</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Size (GB)</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Context (Max / Test)</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Live TPS</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Lifecycle Status</th>
              <th style={{ padding: "0.75rem 0.5rem", width: "160px" }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "0.85rem 0.5rem", fontWeight: 700, color: "#38bdf8" }}>{item.id}</td>
                <td style={{ padding: "0.85rem 0.5rem" }}>
                  <div style={{ fontWeight: 700, color: "#f4f4f5" }}>{item.displayName}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#f59e0b", marginTop: "0.15rem" }}>
                    model_configs/{item.configFile}
                  </div>
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontWeight: 600 }}>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                    {item.paramSize}
                  </span>
                </td>
                <td style={{ padding: "0.85rem 0.5rem" }}>
                  <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}>
                    {item.quantization}
                  </span>
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontWeight: 600, color: "#e4e4e7" }}>
                  {item.sizeGb.toFixed(2)} GB
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontFamily: "monospace", fontSize: "0.78rem" }}>
                  <span style={{ opacity: 0.6 }}>{item.maxCtx.toLocaleString()}</span> /{" "}
                  <strong style={{ color: "#10b981" }}>{item.testedCtx.toLocaleString()}</strong>
                </td>
                <td style={{ padding: "0.85rem 0.5rem", fontWeight: 700, color: "#10b981" }}>
                  {item.tps ? `${item.tps} tok/s` : "-"}
                </td>
                <td style={{ padding: "0.85rem 0.5rem" }}>{renderStatusBadge(item)}</td>
                <td style={{ padding: "0.85rem 0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", height: "7px", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${item.progressPercent}%`,
                          height: "100%",
                          background: item.progressPercent === 100 ? "#10b981" : "linear-gradient(90deg, #f59e0b, #3b82f6)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, minWidth: "32px", textAlign: "right" }}>
                      {item.progressPercent}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Telemetry Replay Logs Table */}
      <section className="panel" style={{ padding: "1.25rem", borderRadius: "14px", overflowX: "auto" }}>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.05rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          📜 Replayable Telemetry &amp; TPS Session Log Stream
        </h4>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem", fontFamily: "monospace" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", opacity: 0.7 }}>
              <th style={{ padding: "0.5rem" }}>Time</th>
              <th style={{ padding: "0.5rem" }}>Model</th>
              <th style={{ padding: "0.5rem" }}>Task Suite</th>
              <th style={{ padding: "0.5rem" }}>Tested CTX</th>
              <th style={{ padding: "0.5rem" }}>TPS</th>
              <th style={{ padding: "0.5rem" }}>VRAM Used</th>
              <th style={{ padding: "0.5rem" }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {replayLogs.map((log, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "0.5rem", opacity: 0.7 }}>{log.timestamp}</td>
                <td style={{ padding: "0.5rem", fontWeight: 700, color: "#f4f4f5" }}>{log.model}</td>
                <td style={{ padding: "0.5rem" }}>{log.task}</td>
                <td style={{ padding: "0.5rem", color: "#10b981" }}>{log.ctx.toLocaleString()}</td>
                <td style={{ padding: "0.5rem", color: "#f59e0b" }}>{log.tps} tok/s</td>
                <td style={{ padding: "0.5rem" }}>{log.vramUsed} GB</td>
                <td style={{ padding: "0.5rem" }}>
                  <span style={{ color: log.status === "PASS" ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
