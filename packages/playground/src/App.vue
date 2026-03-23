<script setup lang="ts">
import { RenderlessWebCodecsPlayer } from "@jrichtsfeld/vue-video-stepper";
import { ref } from "vue";

const goFrameInput = ref(0);
</script>

<template>
  <RenderlessWebCodecsPlayer
    v-slot="{
      setCanvasRef,
      loadVideo,
      stepForward,
      stepBackward,
      goToFrame,
      status,
      progressText,
      errorMsg,
      currentFrameIndex,
      totalFrames,
      codec,
    }"
  >
    <div style="padding: 20px; font-family: sans-serif">
      <h1>Vue Video Stepper</h1>

      <input
        type="file"
        accept="video/mp4"
        @change="
          (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) loadVideo(file);
          }
        "
      />

      <p v-if="status === 'loading'">{{ progressText }}</p>
      <p v-if="status === 'error'" style="color: red">{{ errorMsg }}</p>
      <p v-if="status === 'ready'">
        Codec: {{ codec }} &mdash; {{ totalFrames }} frames
      </p>

      <canvas
        :ref="setCanvasRef"
        style="
          border: 2px solid #ccc;
          max-width: 80vw;
          display: block;
          margin-top: 12px;
        "
      />

      <div
        style="margin-top: 10px; display: flex; gap: 8px; align-items: center"
      >
        <button
          @click="stepBackward"
          :disabled="status !== 'ready' || currentFrameIndex <= 0"
        >
          &#9664; Prev
        </button>
        <span
          >Frame: {{ currentFrameIndex }} /
          {{ Math.max(0, totalFrames - 1) }}</span
        >
        <button
          @click="stepForward"
          :disabled="status !== 'ready' || currentFrameIndex >= totalFrames - 1"
        >
          Next &#9654;
        </button>

        <input
          v-model.number="goFrameInput"
          type="number"
          min="0"
          :max="Math.max(0, totalFrames - 1)"
          style="width: 80px; margin-left: 16px"
        />
        <button @click="goToFrame(goFrameInput)" :disabled="status !== 'ready'">
          Go
        </button>
      </div>
    </div>
  </RenderlessWebCodecsPlayer>
</template>
