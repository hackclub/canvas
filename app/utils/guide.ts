// The interactive guide new users get after setup. Every bit of dialogue lives here so it can
// be rewritten without touching any code: change `speaker`, the `text` of any line (one per
// dialogue box) or the sprite. In any text, "<display name>" becomes the player's display name and "<project name>" the
// name of the project page they're on ("your project" anywhere else). Both show in bold.
// Text can also use **bold** and *italic*.
//
// Flow: link -> finalize -> paint -> shop -> home -> done (see app/composables/useGuide.ts)

export type GuideStep = "link" | "finalize" | "paint" | "shop" | "home";

// What pages tell the guide the player did: pressed draw, picked a color, picked a Hackatime
// project without saving yet, or took it back out
export type GuideSignal = "draw" | "color" | "linked" | "unlinked";

export interface GuideLine {
  text: string;
  // CSS selector of what to spotlight while this line is showing
  highlight?: string;
  // Whether the rest of the page is dimmed around the highlight. Turn it off for things on a
  // light background, where a white border wouldn't show up, and a pulsing black one is used.
  dim?: boolean;
  // Colour of the border around the highlight. Black for things on a light background.
  border?: "white" | "black";
  // The player has to do something to go on (press the highlighted button, ...) instead of
  // clicking anywhere to read the next line. Always true for the last line of a step.
  interact?: boolean;
  // Goes on by itself once the page reports this (see useGuide's `signal`)
  waitFor?: GuideSignal;
  // Goes back to the line before if the page reports this, e.g. they undid what got them here
  backOn?: GuideSignal;
  // Shows a skip button that jumps to this step
  skip?: GuideStep;
  // Where the dialogue box sits for this line, instead of the step's `position`
  position?: "top" | "bottom";
  // Shown instead if they had no pixels when they got to the canvas
  ifNoPixels?: { text: string; skip: GuideStep };
}

export interface GuideStepConfig {
  speaker: string;
  lines: GuideLine[];
  // Shown instead of `lines` once the canvas is closed (CANVAS_CLOSED) and nobody can draw
  ifCanvasClosed?: GuideLine[];
  // Where the dialogue box sits, so it stays out of the way of what's being highlighted
  position: "top" | "bottom";
  // Label of the button on the last line, for steps that end with a button instead of the player
  // doing something on the page
  action?: string;
}

// A spritesheet of two frames side by side: mouth closed, then mouth open
export const GUIDE_SPRITE = {
  src: "/img/orph/orph-overhang-usable-Sheet.svg",
  // One frame's size in sprite pixels, and how many screen pixels each one is drawn as
  width: 17,
  height: 20,
  scale: 4,
  // The mouth opens or shuts every this many letters while talking
  mouthEvery: 4,
  // How many rows at the bottom hang down over the top of the dialogue box (the legs)
  overhang: 4,
};

// The talking sound as the dialogue types out (see app/composables/useGuideVoice.ts)
export const GUIDE_VOICE = {
  // How high the voice is, in Hz
  pitch: 380,
  // How long each syllable lasts, in seconds
  syllable: 0.07,
  // A syllable for every this many letters
  every: 2,
  volume: 0.4,
};

export const GUIDE_STEPS: Record<GuideStep, GuideStepConfig> = {
  // On the project page, waiting for them to link a Hackatime project and save
  link: {
    speaker: "pixel orpheus",
    lines: [
      {
        text: "hi <display name>, welcome to canvas! i'm pixel orpheus and i'll guide you through the platform. *this will only take a minute!*",
      },
      {
        text: "alright first off, let's set up your project!",
      },
      {
        text: "link a hackatime project to <project name>. *if you haven't tracked any time for it yet, press skip!*",
        highlight: '[data-guide="hackatime"]',
        interact: true,
        waitFor: "linked",
        skip: "finalize",
      },
      {
        // saving moves them on to the next step
        text: "now press save!",
        highlight: '[data-guide="save"]',
        interact: true,
        backOn: "unlinked",
      },
    ],
    // the save button is at the bottom of the page, so keep the dialogue off it
    position: "top",
  },
  // Project linked (or skipped), they go and finish their project, then head to the canvas.
  // Starts on the project page, right after they've saved.
  finalize: {
    speaker: "pixel orpheus",
    lines: [
      {
        text: "these are your **estimated pixels and bonus points**. the more you code, the more you get, and you collect them when you *ship*.",
        highlight: '[data-guide="estimates"]',
      },
      {
        text: "ship an extra awesome project, **and you might get even more than shown here!**",
        highlight: '[data-guide="estimates"]',
      },
      {
        text: "that's the gist of it. finish filling out your project. once you're done, **go to the canvas**.",
        highlight: '[data-guide="canvas-link"]',
        // up by the nav, where the canvas link is
        position: "top",
        dim: false,
        interact: true,
      },
    ],
    position: "bottom",
  },
  // On the canvas, waiting for them to confirm at least 1 pixel
  paint: {
    speaker: "pixel orpheus",
    lines: [
      {
        text: "**this is the shared canvas!** after the event, the end result gets put up at **hack club hq** and sent out as *posters* & *postcards*!",
      },
      {
        text: "press **draw** to start drawing.",
        highlight: '[data-guide="draw"]',
        border: "black",
        interact: true,
        waitFor: "draw",
      },
      {
        text: "oo *colors*.. click them or use the 1-9 keys on your keyboard to change the color of your paintbrush.",
        highlight: '[data-guide="palette"]',
        border: "black",
      },
      {
        text: "click or drag on the canvas to place your pixels, then press confirm.",
        highlight: '[data-guide="confirm"]',
        dim: false,
        interact: true,
        ifNoPixels: {
          text: "click or drag on the canvas to place pixels. you've already spent your pixels though, so press skip to continue.",
          skip: "shop",
        },
      },
    ],
    ifCanvasClosed: [
      {
        text: "**this is the shared canvas!** after the event, the end result gets put up at **hack club hq** and sent out as *posters* & *postcards*!",
      },
      {
        text: "the canvas is closed now, so there's no more drawing on it. press skip to continue.",
        interact: true,
        skip: "shop",
      },
    ],
    position: "top",
  },
  // On the shop page
  shop: {
    speaker: "pixel orpheus",
    lines: [
      { text: "great first pixels! this is the *shop*." },
      {
        text: "**ship projects** to earn *bonus points* and trade them for prizes here.",
      },
      {
        text: "prizes? yeah! we're **actually** sending you free stuff. aint that crazy.",
      },
    ],
    ifCanvasClosed: [
      { text: "this is the *shop*." },
      {
        text: "**ship projects** to earn *bonus points* and trade them for prizes here.",
      },
      {
        text: "prizes? yeah! we're **actually** sending you free stuff. aint that crazy.",
      },
    ],
    position: "bottom",
    action: "next",
  },
  // Back on the home page, the last step
  home: {
    speaker: "pixel orpheus",
    lines: [
      {
        text: "and this is *home*, where you can see how much you've coded and what people have recently shipped.",
      },
      {
        text: "this is your progress towards your next pixel drop. you get these pixels while you're building your project, but you'll get a bunch more once you ship!",
        highlight: '[data-guide="coding"]',
        border: "black",
      },
      {
        text: "would you look at that, you already completed a few items on the to-do list! complete them all for a nice **50 pixel drop** :o",
        highlight: '[data-guide="todo"]',
        border: "black",
      },
      { text: "that's everything, have fun!" },
    ],
    // the to-do list is at the bottom of the page, so keep the dialogue off it
    position: "top",
    action: "confirm",
  },
};
