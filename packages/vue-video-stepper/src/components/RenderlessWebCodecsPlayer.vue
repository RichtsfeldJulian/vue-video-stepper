<script setup lang="ts">
import { useWebCodecsPlayer } from "../composables/useWebCodecsPlayer";

const {
  canvasElement,
  status,
  progressText,
  errorMsg,
  currentFrameIndex,
  maxFrames,
  isReady,
  loadVideo,
  stepForward,
  stepBackward,
} = useWebCodecsPlayer();
</script>

<template>
  <slot
    :setCanvasRef="
      (el: any) => (canvasElement = el as HTMLCanvasElement | null)
    "
    :status="status"
    :progressText="progressText"
    :errorMsg="errorMsg"
    :currentFrameIndex="currentFrameIndex"
    :maxFrames="maxFrames"
    :isReady="isReady"
    :loadVideo="loadVideo"
    :stepForward="stepForward"
    :stepBackward="stepBackward"
  ></slot>
</template>
