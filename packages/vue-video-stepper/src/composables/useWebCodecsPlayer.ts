import { ref, computed, shallowRef } from 'vue';
import { WebCodecsDecoder } from '../utils/decoder';

export type PlayerStatus = 'idle' | 'loading' | 'seeking' | 'ready' | 'error';

export function useWebCodecsPlayer() {
  const canvasElement = ref<HTMLCanvasElement | null>(null);
  const decoderInstance = shallowRef<WebCodecsDecoder | null>(null);
  
  const status = ref<PlayerStatus>('idle'); 
  const progressText = ref<string>('');
  const currentFrameIndex = ref<number>(0);
  const maxFrames = ref<number>(0);
  const errorMsg = ref<string>('');

  const isReady = computed(() => status.value === 'ready');

  const paintFrame = async (index: number) => {
    if (!canvasElement.value || !decoderInstance.value) return;
    
    status.value = 'seeking';
    const bmp = await decoderInstance.value.getFrameAtIndex(index);
    
    const canvas = canvasElement.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
      canvas.width = bmp.width;
      canvas.height = bmp.height;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    bmp.close(); 
    
    currentFrameIndex.value = index;
    status.value = 'ready';
  };

  const loadVideo = async (file: File) => {
    status.value = 'loading';
    errorMsg.value = '';
    decoderInstance.value = new WebCodecsDecoder();
    
    try {
      const meta = await decoderInstance.value.loadFile(file, (msg) => {
        progressText.value = msg;
      });
      maxFrames.value = meta.totalFrames;
      await paintFrame(0);
    } catch (err: any) {
      status.value = 'error';
      errorMsg.value = err.message || 'Unknown error occurred';
    }
  };

  const stepForward = () => {
    if (currentFrameIndex.value < maxFrames.value) {
      paintFrame(currentFrameIndex.value + 1);
    }
  };

  const stepBackward = () => {
    if (currentFrameIndex.value > 0) {
      paintFrame(currentFrameIndex.value - 1);
    }
  };

  return {
    canvasElement, status, progressText, errorMsg, currentFrameIndex, maxFrames, isReady,
    loadVideo, stepForward, stepBackward
  };
}