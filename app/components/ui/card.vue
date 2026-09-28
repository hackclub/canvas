<template>
  <div class="bg-black w-full">
    <div class="w-full pixels p-8 text-white relative">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pixels {
  background: url("/img/canvas-pixels.svg") no-repeat;
  background-position: bottom right;
  background-size: 100px;
}
</style>
