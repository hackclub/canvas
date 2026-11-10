<template>
  <div class="min-h-screen bg-white">
    <nav class="px-4">
      <div class="flex justify-between items-start">
        <NuxtLink to="/" aria-label="Canvas home">
          <SvgHackOrphtop :width="150" />
        </NuxtLink>
        <div class="pt-4">
          <UiButton to="/" icon="lucide:arrow-left" icon-position="left"
            >Back home</UiButton
          >
        </div>
      </div>
    </nav>

    <div class="flex justify-center">
      <div class="w-300 max-w-full px-4 py-10 space-y-6">
        <div class="space-y-2">
          <h1 class="font-bold text-3xl md:text-4xl">submissions</h1>
          <p class="opacity-70">
            Every project shipped and approved during Canvas,
            {{ ships.length }} in total. Thanks to everyone who built something
            :D
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ShipCard v-for="ship in ships" :key="ship.id" :ship="ship" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import approved from "~/data/ships.json";

definePageMeta({
  layout: "blank",
});

useSeoMeta({
  title: "Submissions - Canvas",
});

// Snapshot of the approved ships when the site went static, most recently approved first
const ships = approved;
</script>
