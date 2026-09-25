<template>
  <svg
    :width="props.width"
    :height="props.height"
    viewBox="0 0 132 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clip-path="url(#clip0_30_2)">
      <path
        d="M93.3184 70H34.9944C30.1557 70 25.6194 69.0926 21.3855 67.2778C17.1516 65.463 13.4361 62.9568 10.2391 59.7593C7.04209 56.5617 4.53631 52.8457 2.72179 48.6111C0.907263 44.3765 0 39.8395 0 35C0 30.1605 0.907263 25.6235 2.72179 21.3889C4.53631 17.1543 7.04209 13.4383 10.2391 10.2407C13.4361 7.04321 17.1516 4.53704 21.3855 2.72222C25.6194 0.907406 30.1557 0 34.9944 0H93.3184V70Z"
        fill="black"
      />
      <rect x="97" width="35" height="35" fill="#FF6464" />
    </g>
    <defs>
      <clipPath id="clip0_30_2">
        <rect width="132" height="70" fill="white" />
      </clipPath>
    </defs>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps({
  width: {
    type: Number,
    default: undefined,
  },
  height: {
    type: Number,
    default: undefined,
  },
});
</script>
