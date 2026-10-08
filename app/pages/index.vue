<template>
  <div class="relative min-h-screen bg-white overflow-x-hidden">
    <nav class="fixed inset-x-0 top-0 z-50 px-4">
      <div class="flex justify-between items-start">
        <SvgHackOrphtop :width="150" />
        <div class="pt-4">
          <UiButton to="/app" icon="lucide:arrow-right"
            >Start painting</UiButton
          >
        </div>
      </div>
    </nav>

    <section
      class="flex min-h-screen justify-center items-center px-4 pt-24 pb-24"
    >
      <div
        class="w-full max-w-150 flex flex-col items-center gap-2 text-center -translate-y-6"
      >
        <SvgLogoHc class="w-full max-w-90" />
        <p class="text-xl max-w-150">
          <b>build projects and paint pixels on a shared canvas.</b> the final
          result gets put up at hack club hq!
        </p>

        <div
          class="mt-6 flex items-center border-black border-4 bg-black gap-1"
        >
          <input placeholder="john@example.com" class="p-3 bg-white" />
          <UiButton to="/app" icon="lucide:arrow-right" inline
            >let's paint!</UiButton
          >
        </div>
        <p class="opacity-50">October 8th - October 22nd</p>
      </div>
    </section>

    <!-- above the next section's overlap, so it isn't covered -->
    <section class="relative z-20 -mt-70">
      <ShopMarquee />
    </section>

    <section class="relative -mt-70 z-10">
      <NuxtImg src="/img/pixelbg.svg" class="w-full" />
      <div class="bg-black text-white min-h-200 pb-24 -mt-10 w-full">
        <div class="flex justify-center">
          <div class="w-300 max-w-full px-4 space-y-10">
            <div class="grid grid-cols-2 gap-4 items-center">
              <div class="space-y-4">
                <h1 class="font-bold text-4xl">
                  One Canvas, all of Hack Club.
                </h1>
                <p class="">
                  Everyone gets one canvas.. to share. Get pixels by building
                  projects, and put your mark on the canvas! Ship your projects
                  and get the final result printed on a poster or postcard :o
                </p>
                <UiButtonSmall class="border-3 border-white" to="/app">
                  get started :D
                </UiButtonSmall>
                <div class="flex justify-end mt-10">
                  <SvgArrowsCanvasrn :width="350" />
                </div>
              </div>
              <div class="">
                <img
                  :src="snapshotUrl"
                  alt="The canvas so far"
                  width="350"
                  height="200"
                  class="w-full h-auto border-4 border-white bg-white"
                  style="image-rendering: pixelated"
                />
              </div>
            </div>

            <div class="flex justify-center mt-20">
              <div class="space-y-4 w-200 max-w-full">
                <h2 class="font-bold text-4xl">FAQ</h2>
                <div class="border-4 border-white">
                  <UiAccordion :items="faq" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const faq = [
  {
    title: "What is Canvas?",
    text: "Canvas is a Hack Club program where you build projects, get pixels and draw on one large canvas. The end result gets put up at Hack Club HQ and is available in the shop as a poster or postcard! You can get some awesome other prizes as well :D",
  },
  {
    title: "When does it run?",
    text: "October 8th to October 22nd.",
  },
  {
    title: "How do I get pixels?",
    text: "Two ways. You earn pixels as you code, tracked through Hackatime on the projects you've linked. And when you ship a project and it gets approved, you're paid for the hours you put into it, with the first 10 hours of a project paying the most.",
  },
  {
    title: "What are bonus points?",
    text: "You get bonus points for the hours on a project once it's shipped and approved. Trade them in the shop for prizes.",
  },
  {
    title: "What is Hackatime?",
    text: "Hackatime is Hack Club's free coding time tracker. It's how Canvas knows how long you've worked on a project, so you'll link your account when you sign up.",
  },
  {
    title: "What counts as a project?",
    text: "Anything software you build yourself. Link the Hackatime projects you worked on, add a demo and a link to the code, and say how you used AI. A first ship needs at least an hour of work, and shipping an update needs at least 30 minutes since your last approved ship.",
  },
  {
    title: "Who can join?",
    text: "You need to sign in with Hack Club Auth and be verified and eligible before you can ship a project. You can start building and drawing while that's being checked.",
  },
  {
    title: "Can I draw anything I want?",
    text: "Be kind: the canvas ends up on a wall at HQ. People who draw things they shouldn't can be banned from the canvas.",
  },
];

// Bound rather than written in the template, where Vite would try to import it as a file
const snapshotUrl = "/api/canvas/snapshot.png";
</script>
