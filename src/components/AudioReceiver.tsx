import {useEffect, useRef, useState} from "react";

// システム設定
const CONFIG = {
  BASE_FREQ: 17000, // 基本周波数
  FREQ_RANGE: 2000, // 周波数範囲
  NUM_CHANNELS: 32, // チャンネル数
  SIGNAL_DURATION: 1.0, // 信号長（秒）
  SAMPLE_RATE: 44100, // サンプリングレート
  FFT_SIZE: 1024, // FFT サイズ
  DETECTION_THRESHOLD: 0.3, // 検出閾値
  SMOOTHING: 0.8, // スムージング係数
};

interface AudioReceiverProps {
  onEffectDetected: (effectId: number) => void;
  availableEffects: number; // 利用可能なエフェクトの数を追加
}

// WebKitAudioContextの型定義
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function AudioReceiver({
  onEffectDetected,
  availableEffects,
}: AudioReceiverProps) {
  const [isReceiving, setIsReceiving] = useState(false);
  const [detectedFrequency, setDetectedFrequency] = useState<number>(0);
  const [signalStrength, setSignalStrength] = useState<number>(0);
  const [status, setStatus] = useState<string>("待機中");
  const [lastDetectedChannel, setLastDetectedChannel] = useState<number>(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastDetectedEffectRef = useRef<number>(-1);
  const effectCooldownRef = useRef<boolean>(false);

  // マイクアクセス要求
  const requestMicrophoneAccess = async () => {
    try {
      setStatus("マイクアクセスを要求中...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: CONFIG.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // AudioContextの作成
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: CONFIG.SAMPLE_RATE,
      });

      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      // フィルターの設定
      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = "highpass";
      // パラメータの設定
      const filter = filterRef.current;
      filter.Q.value = 1;
      filter.frequency.value = 10000;
      filter.gain.value = 40;

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = CONFIG.FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = CONFIG.SMOOTHING;

      microphoneRef.current.connect(filterRef.current);
      filterRef.current.connect(analyserRef.current);

      setStatus("マイクアクセス許可完了 - 受信準備完了");
      return true;
    } catch (error) {
      console.error("マイクアクセスエラー:", error);
      setStatus("マイクアクセスに失敗しました");
      return false;
    }
  };

  // 周波数計算
  const getFrequencyForChannel = (channel: number) => {
    const step = CONFIG.FREQ_RANGE / CONFIG.NUM_CHANNELS;
    return CONFIG.BASE_FREQ + channel * step;
  };

  // 検出ループ開始
  const startDetectionLoop = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    detectionIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let maxIntensity = 0;
      let detectedChannel = -1;
      let detectedFrequency = 0;

      // 各チャンネルの強度をチェック
      for (let channel = 0; channel < CONFIG.NUM_CHANNELS; channel++) {
        const frequency = getFrequencyForChannel(channel);
        const binIndex = Math.round(
          (frequency * CONFIG.FFT_SIZE) / CONFIG.SAMPLE_RATE
        );

        if (binIndex < bufferLength) {
          let intensity = 0;
          const range = 2;
          for (let i = -range; i <= range; i++) {
            const idx = binIndex + i;
            if (idx >= 0 && idx < bufferLength) {
              intensity += dataArray[idx];
            }
          }
          intensity = intensity / (range * 2 + 1) / 255.0;

          if (
            intensity > CONFIG.DETECTION_THRESHOLD &&
            intensity > maxIntensity
          ) {
            maxIntensity = intensity;
            detectedChannel = channel;
            detectedFrequency = frequency;
          }
        }
      }

      // UI更新
      setDetectedFrequency(detectedFrequency);
      setSignalStrength(maxIntensity * 100);

      // エフェクト検出処理
      if (detectedChannel !== -1 && !effectCooldownRef.current) {
        setLastDetectedChannel(detectedChannel);

        // 利用可能なエフェクトの範囲内かチェック
        if (detectedChannel < availableEffects) {
          onEffectDetected(detectedChannel);
          lastDetectedEffectRef.current = detectedChannel;
          setStatus(`🎧 エフェクト ${detectedChannel + 1} を検出`);
        } else {
          setStatus(
            `⚠️ 未対応の信号 (チャンネル ${detectedChannel + 1}) を検出`
          );
        }

        // クールダウン設定
        effectCooldownRef.current = true;
        setTimeout(() => {
          effectCooldownRef.current = false;
        }, 500);
      }
    }, 50);
  };

  // 受信開始
  const startReceiving = async () => {
    if (!audioContextRef.current) {
      const success = await requestMicrophoneAccess();
      if (!success) return;
    }

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    startDetectionLoop();
    setIsReceiving(true);
    setStatus("🎧 音波信号を受信中...");
  };

  // 受信停止
  const stopReceiving = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsReceiving(false);
    effectCooldownRef.current = false;
    lastDetectedEffectRef.current = -1;
    setStatus("受信を停止しました");
    setDetectedFrequency(0);
    setSignalStrength(0);
    setLastDetectedChannel(-1);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopReceiving();
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: "20px",
        borderRadius: "10px",
        color: "white",
        textAlign: "center",
        zIndex: 1000,
      }}
    >
      <div style={{marginBottom: "10px"}}>ステータス: {status}</div>
      <div style={{marginBottom: "10px"}}>
        検出周波数:{" "}
        {detectedFrequency > 0 ? `${detectedFrequency.toFixed(1)}Hz` : "---"}
      </div>
      <div style={{marginBottom: "10px"}}>
        信号強度: {Math.round(signalStrength)}%
      </div>
      <div style={{marginBottom: "10px"}}>
        検出チャンネル:{" "}
        {lastDetectedChannel >= 0 ? lastDetectedChannel + 1 : "---"}
      </div>
      <div
        style={{
          width: "200px",
          height: "10px",
          backgroundColor: "#333",
          borderRadius: "5px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: `${signalStrength}%`,
            height: "100%",
            backgroundColor: "#4CAF50",
            borderRadius: "5px",
            transition: "width 0.1s ease-in-out",
          }}
        />
      </div>
      <button
        onClick={isReceiving ? stopReceiving : startReceiving}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          backgroundColor: isReceiving ? "#f44336" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isReceiving ? "停止" : "開始"}
      </button>
    </div>
  );
}
