<script setup lang="ts">
import { useWebCodecsPlayer } from "../composables/useWebCodecsPlayer";

const {
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
    :totalFrames="totalFrames"
    :codec="codec"
    :isReady="isReady"
    :loadVideo="loadVideo"
    :stepForward="stepForward"
    :stepBackward="stepBackward"
    :goToFrame="goToFrame"
    :destroy="destroy"
  ></slot>
</template>
