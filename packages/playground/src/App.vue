<script setup lang="ts">
import { RenderlessWebCodecsPlayer } from '@jrichtsfeld/vue-video-stepper';
</script>

<template>
  <RenderlessWebCodecsPlayer v-slot="{ 
    setCanvasRef, loadVideo, stepForward, stepBackward, status, currentFrameIndex 
  }">
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Typed WebCodecs Player</h1>
      
      <input 
        type="file" 
        accept="video/mp4" 
        @change="(e) => loadVideo((e.target as HTMLInputElement).files![0])" 
      />
      <p>Status: {{ status }}</p>

      <canvas :ref="setCanvasRef" style="border: 2px solid black; max-width: 600px;"></canvas>

      <div style="margin-top: 10px;">
        <button @click="stepBackward" :disabled="status !== 'ready'">Prev</button>
        <span style="margin: 0 15px;">Frame: {{ currentFrameIndex }}</span>
        <button @click="stepForward" :disabled="status !== 'ready'">Next</button>
      </div>
    </div>
  </RenderlessWebCodecsPlayer>
</template>
