<template>
  <div
    class="absolute z-5 left-0 top-0 py-5 bg-white/70 backdrop-blur-2xl w-full flex justify-center"
  >
    <SvgLogo class="w-full max-w-90 px-4 mx-auto" />
  </div>
  <div
    class="flex z-10 items-center justify-center h-full absolute inset-0 px-2"
  >
    <div
      class="border-4 border-black bg-white"
      style="
        width: 550px;
        max-width: 100%;
        /*box-shadow: 0 0 100px 100px rgba(0, 0, 0, 1);*/
      "
    >
      <div>
        <slot />
      </div>
    </div>
  </div>
  <div class="z-1 absolute h-full w-full inset-0 overflow-hidden">
    <div
      class="setup-scroll absolute inset-0"
      :class="{ 'setup-scroll-paused': reduceMotion }"
    >
      <div class="setup-container h-full w-full" />
      <div class="setup-container h-full w-full" />
    </div>
  </div>
  <!--
  <div class="z-2 absolute inset-0 overflow-hidden">
    <div class="py-40" />
    <div class="pixel-overlay h-screen mt-[-40vh] w-full bg-repeat-x" />
    <div class="h-full bg-black w-full" />
  </div>
  -->

  <!-- accessibility button -->
  <div class="fixed z-20 right-5 bottom-5 motion-reduce:hidden">
    <UiButton @click="toggleReduceMotion">
      {{ reduceMotion ? "Enable" : "Disable" }} background animation
    </UiButton>
  </div>
</template>

<script setup>
const { reduceMotion, toggleReduceMotion } = useReduceMotion();

useSeoMeta({
  title: "Welcome to Canvas",
});
</script>

<style scoped>
.setup-container {
  background-image: url("/img/canvas-example-board-v2.svg");
  background-size: 100vh;
  background-position: center;
}

/* two stacked cover-sized copies, shifted up by one copy's height, so the loop is seamless */
.setup-scroll {
  animation: setup-bg-scroll 60s linear infinite;
}

@keyframes setup-bg-scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

.setup-scroll-paused {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .setup-scroll {
    animation: none;
  }
}

.pixel-overlay {
  background-image: url("/img/tiled-bg.svg");
  background-position: bottom left;
  background-size: 700px;
}
</style>
