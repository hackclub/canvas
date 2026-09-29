<template>
  <component
    :is="tag"
    v-bind="componentAttrs"
    class="no-underline! cursor-pointer group relative inline-flex overflow-hidden rounded-full border-black bg-black px-3 py-1 text-sm font-bold text-white"
    :class="props.inline ? '' : 'border-3'"
  >
    <span
      class="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 ease-in-out"
      :class="
        props.groupHover
          ? 'group-hover/button:origin-right group-hover/button:scale-x-100'
          : 'group-hover:origin-right group-hover:scale-x-100'
      "
    />
    <span
      :class="[
        'relative z-10 flex items-center gap-1 transition-colors duration-200 ease-in-out',
        props.groupHover
          ? 'group-hover/button:text-black'
          : 'group-hover:text-black',
        contentClass,
      ]"
    >
      <Icon
        v-if="icon && iconPosition === 'left'"
        :name="icon"
        :size="iconSize"
      />
      <slot>{{ label }}</slot>
      <Icon
        v-if="icon && iconPosition === 'right'"
        :name="icon"
        :size="iconSize"
      />
    </span>
  </component>
</template>

<script setup>
import { NuxtLink } from "#components";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  label: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  iconSize: {
    type: Number,
    default: 16,
  },
  iconPosition: {
    type: String,
    default: "right",
  },
  to: {
    type: [String, Object],
    default: null,
  },
  type: {
    type: String,
    default: "button",
  },
  contentClass: {
    type: String,
    default: "",
  },
  inline: {
    type: Boolean,
    default: false,
  },
  // Play the hover animation when a parent with the `group/button` class is hovered,
  // instead of only when the button itself is
  groupHover: {
    type: Boolean,
    default: false,
  },
});

const attrs = useAttrs();

const tag = computed(() => {
  if (props.to) return NuxtLink;
  return "button";
});

const componentAttrs = computed(() => {
  if (props.to) {
    return {
      ...attrs,
      to: props.to,
    };
  }

  return {
    ...attrs,
    type: props.type,
  };
});
</script>
