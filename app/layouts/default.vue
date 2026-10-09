<template>
  <nav class="flex justify-between p-8">
    <SvgLogo :width="300" />
  </nav>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Canvas",
});
</script>
