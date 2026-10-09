import { GUIDE_VOICE } from "~/utils/guide";

// Rough mouth shapes, as the two frequencies (formants) that make a vowel sound like itself
const VOWELS: Record<string, [number, number]> = {
  a: [800, 1200],
  e: [450, 2200],
  i: [300, 2700],
  o: [500, 900],
  u: [350, 800],
};
const VOWEL_KEYS = Object.keys(VOWELS);

let audio: AudioContext | undefined;

// Animal Crossing style babble: every few letters gets a short synthesized syllable, pitched
// and shaped by the letter, so the same text always sounds the same. Muting is remembered.
export function useGuideVoice() {
  const muted = useState("guide-muted", () => false);

  onMounted(() => {
    muted.value = localStorage.getItem("guide-muted") === "true";
  });

  function toggleMuted() {
    muted.value = !muted.value;
    localStorage.setItem("guide-muted", String(muted.value));
  }

  function speak(char: string) {
    if (muted.value) return;
    const letter = char.toLowerCase();
    if (!/[a-z]/.test(letter)) return;

    // Browsers only allow sound after the user has clicked something, which they will have
    // by the time any dialogue shows up
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();

    const code = letter.charCodeAt(0) - 97;
    const [f1, f2] =
      VOWELS[letter] ?? VOWELS[VOWEL_KEYS[code % VOWEL_KEYS.length]!]!;
    const now = audio.currentTime;
    const length = GUIDE_VOICE.syllable;

    // The voice: a buzzy tone that wobbles up or down a little per letter
    const osc = audio.createOscillator();
    osc.type = "square";
    const pitch = GUIDE_VOICE.pitch * 2 ** (((code % 7) - 3) / 24);
    osc.frequency.setValueAtTime(pitch * 1.06, now);
    osc.frequency.exponentialRampToValueAtTime(pitch, now + length);

    // Shaped into a vowel by letting only its two formants through
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(GUIDE_VOICE.volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    gain.connect(audio.destination);

    for (const frequency of [f1, f2]) {
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = 6;
      osc.connect(filter).connect(gain);
    }

    osc.start(now);
    osc.stop(now + length);
  }

  return { muted, toggleMuted, speak };
}
