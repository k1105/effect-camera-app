import {useEffect, useRef} from "react";

// システム設定
const CONFIG = {
  BASE_FREQ: 18000, // 基本周波数
  FREQ_RANGE: 1000, // 周波数範囲
  NUM_CHANNELS: 16, // チャンネル数
  SIGNAL_DURATION: 1.0, // 信号長（秒）
  SAMPLE_RATE: 44100, // サンプリングレート
  FFT_SIZE: 1024, // FFT サイズ
  DETECTION_THRESHOLD: 0.2, // 検出閾値
  SMOOTHING: 0.8, // スムージング係数
};

interface AudioReceiverProps {
  onEffectDetected: (effectId: number) => void;
  availableEffects: number; // 利用可能なエフェクトの数を追加
  onNoSignalDetected?: () => void; // 信号が検出されていない状態を通知
  permissionsGranted?: boolean; // 権限が許可されているかどうか
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
  onNoSignalDetected,
  permissionsGranted = false,
}: AudioReceiverProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastDetectedEffectRef = useRef<number>(-1);
  const effectCooldownRef = useRef<boolean>(false);
  const noSignalTimerRef = useRef<number | null>(null);
  const lastSignalTimeRef = useRef<number>(Date.now());

  // マイクアクセス要求
  const requestMicrophoneAccess = async () => {
    try {
      console.log("AudioReceiver: マイクアクセス要求中...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: CONFIG.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      console.log("AudioReceiver: マイクアクセス成功");

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

      console.log("AudioReceiver: 音声処理パイプライン構築完了");
      return true;
    } catch (error) {
      console.error("マイクアクセスエラー:", error);
      return false;
    }
  };

  // 周波数計算
  const getFrequencyForChannel = (channel: number) => {
    const step = CONFIG.FREQ_RANGE / CONFIG.NUM_CHANNELS;
    return CONFIG.BASE_FREQ + (CONFIG.NUM_CHANNELS - channel) * step;
  };

  // 検出ループ開始
  const startDetectionLoop = () => {
    if (!analyserRef.current) {
      console.log("AudioReceiver: analyserがnullです");
      return;
    }

    console.log("AudioReceiver: 検出ループ開始");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    detectionIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      let maxIntensity = 0;
      let detectedChannel = -1;
      let overallMaxIntensity = 0;

      // 全体的な音声レベルをチェック
      for (let i = 0; i < bufferLength; i++) {
        const intensity = dataArray[i] / 255.0;
        if (intensity > overallMaxIntensity) {
          overallMaxIntensity = intensity;
        }
      }

      // 音声レベルが一定以上の場合のみログを出力（デバッグ用）
      if (overallMaxIntensity > 0.01) {
        // console.log(
        //   `AudioReceiver: 全体的な音声レベル: ${overallMaxIntensity.toFixed(3)}`
        // );
      }

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
          }
        }
      }

      // エフェクト検出処理
      if (detectedChannel !== -1 && !effectCooldownRef.current) {
        console.log(
          `AudioReceiver: チャンネル ${detectedChannel} を検出 (強度: ${maxIntensity.toFixed(
            3
          )})`
        );

        // 信号を検出した時刻を更新
        lastSignalTimeRef.current = Date.now();

        // 利用可能なエフェクトの範囲内かチェック
        if (detectedChannel < availableEffects) {
          console.log(`AudioReceiver: エフェクト ${detectedChannel} を実行`);
          onEffectDetected(detectedChannel);
          lastDetectedEffectRef.current = detectedChannel;
        } else {
          console.log(
            `AudioReceiver: 未対応のチャンネル ${detectedChannel} (利用可能: ${availableEffects})`
          );
        }

        // クールダウン設定
        effectCooldownRef.current = true;
        setTimeout(() => {
          effectCooldownRef.current = false;
        }, 500);
      }

      // 信号が検出されていない状態のチェック
      const timeSinceLastSignal = Date.now() - lastSignalTimeRef.current;
      if (timeSinceLastSignal > 2000 && onNoSignalDetected) {
        // 2秒間信号がない場合
        // 既存のタイマーをクリア
        if (noSignalTimerRef.current) {
          clearTimeout(noSignalTimerRef.current);
        }

        // 新しいタイマーを設定（連続呼び出しを防ぐため）
        noSignalTimerRef.current = window.setTimeout(() => {
          onNoSignalDetected();
        }, 100);
      }
    }, 50);
  };

  // 受信開始
  const startReceiving = async () => {
    console.log("AudioReceiver: startReceiving開始");

    if (!audioContextRef.current) {
      console.log(
        "AudioReceiver: AudioContextが存在しないため、マイクアクセスを要求"
      );
      const success = await requestMicrophoneAccess();
      if (!success) {
        console.log("AudioReceiver: マイクアクセスに失敗");
        return;
      }
    }

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === "suspended") {
      console.log("AudioReceiver: AudioContextを再開");
      await audioContext.resume();
    }

    console.log("AudioReceiver: 検出ループを開始");
    startDetectionLoop();
  };

  // 受信停止
  const stopReceiving = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (noSignalTimerRef.current) {
      clearTimeout(noSignalTimerRef.current);
      noSignalTimerRef.current = null;
    }

    effectCooldownRef.current = false;
    lastDetectedEffectRef.current = -1;
  };

  // 自動的に受信を開始
  useEffect(() => {
    console.log("AudioReceiver: 受信開始");

    // 権限が許可されている場合のみ受信開始
    if (!permissionsGranted) {
      console.log(
        "AudioReceiver: 権限が許可されていないため、受信を開始しません"
      );
      return;
    }

    const timer = setTimeout(() => {
      startReceiving();
    }, 100);
    // 少し遅延させてから受信開始

    // クリーンアップ
    return () => {
      console.log("AudioReceiver: クリーンアップ");
      clearTimeout(timer);
      stopReceiving();
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [permissionsGranted]);

  return null; // UIを表示しない
}
