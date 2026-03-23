import { computed, onUnmounted, ref, shallowRef } from "vue";
import { WebCodecsDecoder } from "../utils/decoder";

export type PlayerStatus = "idle" | "loading" | "ready" | "error";

export function useWebCodecsPlayer() {
  const canvasElement = ref<HTMLCanvasElement | null>(null);
  const decoderInstance = shallowRef<WebCodecsDecoder | null>(null);

  const status = ref<PlayerStatus>("idle");
  const progressText = ref("");
  const currentFrameIndex = ref(0);
  const totalFrames = ref(0);
  const codec = ref("");
  const errorMsg = ref("");

  const isReady = computed(() => status.value === "ready");

  const paintFrame = (index: number) => {
    const canvas = canvasElement.value;
    const decoder = decoderInstance.value;
    if (!canvas || !decoder) return;

    const bmp = decoder.getFrameAtIndex(index);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
      canvas.width = bmp.width;
      canvas.height = bmp.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    // Bitmaps are kept alive for re-use — cleaned up in destroy()

    currentFrameIndex.value = index;
  };

  const goToFrame = (index: number) => {
    if (!decoderInstance.value || totalFrames.value === 0) return;
    const clamped = Math.max(0, Math.min(index, totalFrames.value - 1));
    paintFrame(clamped);
  };

  const loadVideo = async (file: File) => {
    status.value = "loading";
    errorMsg.value = "";
    progressText.value = "";

    // Clean up previous instance
    decoderInstance.value?.destroy();
    decoderInstance.value = new WebCodecsDecoder();

    try {
      const meta = await decoderInstance.value.loadFile(file, (msg) => {
        progressText.value = msg;
      });
      totalFrames.value = meta.totalFrames;
      codec.value = meta.codec;
      paintFrame(0);
      status.value = "ready";
    } catch (err: unknown) {
      status.value = "error";
      errorMsg.value = err instanceof Error ? err.message : String(err);
    }
  };

  const stepForward = () => {
    if (currentFrameIndex.value < totalFrames.value - 1) {
      paintFrame(currentFrameIndex.value + 1);
    }
  };

  const stepBackward = () => {
    if (currentFrameIndex.value > 0) {
      paintFrame(currentFrameIndex.value - 1);
    }
  };

  const destroy = () => {
    decoderInstance.value?.destroy();
    decoderInstance.value = null;
    totalFrames.value = 0;
    currentFrameIndex.value = 0;
    codec.value = "";
    status.value = "idle";
  };

  onUnmounted(destroy);

  return {
    canvasElement,
    status,
    progressText,
    errorMsg,
    currentFrameIndex,
    totalFrames,
    codec,
    isReady,
    loadVideo,
    stepForward,
    stepBackward,
    goToFrame,
    destroy,
  };
}
