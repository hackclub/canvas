<template>
  <nav class="relative flex justify-between items-center">
    <div class="px-8 py-6">
      <SvgLogoCompact :width="60" />
    </div>
    <div class="absolute left-1/2 -translate-x-1/2">
      <div class="flex gap-4">
        <NuxtLink
          to="/app"
          :class="route.path == '/app' ? 'font-bold' : ''"
          class="no-underline! text-lg transition-transform hover:scale-105 scale-100"
          >Canvas</NuxtLink
        >
        <NuxtLink
          to="/app/projects"
          :class="route.path.startsWith('/app/projects') ? 'font-bold' : ''"
          class="no-underline! text-lg transition-transform hover:scale-105 scale-100"
          >Projects</NuxtLink
        >
        <NuxtLink
          to="/app/me"
          :class="route.path == '/app/me' ? 'font-bold' : ''"
          class="no-underline! text-lg transition-transform hover:scale-105 scale-100"
          >{{ user?.first_name }}</NuxtLink
        >
      </div>
    </div>
    <div class="px-8">
      <div class="font-bold bg-black py-1 px-2 pe-3 text-white flex gap-1">
        <Icon name="pixelarticons:paint-bucket" :size="24" mode="svg" />
        <span class="">0</span>
      </div>
    </div>
  </nav>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { user } = useUserSession();
</script>
