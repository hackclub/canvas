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

        <form
          action="/auth/hackclub"
          method="get"
          class="mt-6 flex items-center border-black border-4 bg-black gap-1"
        >
          <input
            type="email"
            name="login_hint"
            autocomplete="email"
            placeholder="john@example.com"
            class="p-3 bg-white"
          />
          <UiButton type="submit" icon="lucide:arrow-right" inline
            >let's paint!</UiButton
          >
        </form>
        <p class="opacity-50">
          October 8th - October 22nd. For anyone age 13 to 18!
        </p>
        <p class="opacity-50">
          <NuxtLink
            :to="`https://hackclub.enterprise.slack.com/archives/${CANVAS_CHANNEL_ID}`"
            >#canvas</NuxtLink
          >
          - by emma
        </p>
      </div>
    </section>

    <!-- above the next section's overlap, so it isn't covered -->
    <section class="relative z-20 -mt-70">
      <ShopMarquee class="relative -top-30 sm:-top-20 md:-top-10 lg:top-0" />
    </section>

    <section class="relative -mt-70 z-10">
      <NuxtImg src="/img/pixelbg.svg" class="w-full" />
      <div class="bg-black text-white pb-24 -mt-10 w-full">
        <div class="flex justify-center pt-35 sm:pt-30 lg:pt-15">
          <div class="w-300 max-w-full px-4 space-y-10">
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-4 items-center"
            >
              <div class="space-y-4">
                <h1 class="font-bold text-3xl md:text-4xl">
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
                <!-- points from the text to the canvas beside it, so it only makes sense side by side -->
                <div class="hidden md:flex justify-end mt-10">
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

            <div class="mt-20 space-y-4">
              <h2 class="font-bold text-4xl">FAQ</h2>
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="item in faq"
                  :key="item.title"
                  class="border-4 border-white p-5 space-y-2"
                >
                  <h3 class="font-bold text-xl">{{ item.title }}</h3>
                  <p class="opacity-80">{{ item.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <footer
      :style="`background-image: url(/img/random-pixels-${pixelsNumber}.svg)`"
      class="bg-repeat-y bg-cover"
    >
      <div class="flex justify-center">
        <div class="w-300 max-w-full p-4 py-8 space-y-10">
          <div class="text-white">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-black p-4 space-y-3 md:max-w-100">
                <SvgHackLogo :width="100" />
                <p>
                  <b>Hack Club</b> is the world's largest nonprofit movement of
                  teenagers making cool projects.
                </p>
                <!-- prettier-ignore -->
                <div class="flex flex-col gap-1">
                  <NuxtLink to="https://hackclub.com">Hack Club <Icon name="lucide:arrow-up-right"/></NuxtLink>
                  <NuxtLink to="https://hackclub.com/privacy-and-terms">Terms & Privacy Policy <Icon name="lucide:arrow-up-right"/></NuxtLink>
                  <NuxtLink to="https://forms.hackclub.com/bounty">Fulfillment bounty <Icon name="lucide:arrow-up-right"/></NuxtLink>
                  <NuxtLink to="https://security.hackclub.com/">Security <Icon name="lucide:arrow-up-right"/></NuxtLink>
                </div>
              </div>
              <div class="flex justify-end">
                <div class="max-md:w-full">
                  <div
                    class="bg-black p-4 space-y-3 max-md:w-full md:max-w-100"
                  >
                    <p>
                      made with <3 by
                      <NuxtLink to="https://prpl.wtf">emma</NuxtLink> for hack
                      club!
                    </p>
                    <!-- prettier-ignore -->
                    <div class="flex flex-col gap-1">
                      <NuxtLink to="/app">open canvas</NuxtLink>
                      <NuxtLink :to="`https://hackclub.enterprise.slack.com/archives/${CANVAS_CHANNEL_ID}`">#canvas</NuxtLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

// Picked when the server renders the page and passed on to the browser, so a new one shows
// on every load without the browser disagreeing with the server
const pixelsNumber = useState(
  "random-pixels",
  () => Math.floor(Math.random() * 10) + 1,
);

const faq = [
  {
    title: "What is Canvas?",
    text: "Canvas is a Hack Club program where you build projects, get pixels and draw on one large canvas. The end result gets put up at Hack Club HQ and is available in the shop as a poster or postcard! You can get some awesome other prizes as well :D",
  },
  {
    title: "How do I get pixels?",
    text: "By building projects! While you're building, you get a few pixels for each hour of work. Ship your project, and get a bunch of extra pixels... AND BONUS POINTS!!",
  },
  {
    title: "What are bonus points?",
    text: "BONUS POINTS!! Use bonus points to get awesome prizes. Get bonus points by shipping projects!",
  },
  {
    title: "When does it run?",
    text: "October 8th to October 22nd.",
  },
  {
    title: "Who is eligible?",
    text: "You need to be 13-18 years old to participate.",
  },
  {
    title: "What counts as a project?",
    text: "All kinds of technical projects, as long as it's open-source!",
  },
  {
    title: "Can I build multiple projects?",
    text: "YES! Build as many projects as you want ^-^",
  },
  {
    title: "Who's running this?",
    text: "Emma!",
  },
];

// Bound rather than written in the template, where Vite would try to import it as a file
const snapshotUrl = "/api/canvas/snapshot.png";
</script>
