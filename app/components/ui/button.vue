<template>
  <component
    :is="tag"
    v-bind="componentAttrs"
    class="cursor-pointer group no-underline! relative inline-flex overflow-hidden border-black bg-black px-3 py-3 font-bold text-white"
    :class="props.inline ? '' : 'border-4'"
  >
    <span
      class="absolute inset-0 translate-y-full bg-white transition-transform duration-200 ease-in-out group-hover:translate-y-0"
    />
    <span
      :class="[
        'relative z-10 flex items-center gap-1 transition-colors duration-200 ease-in-out group-hover:text-black',
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
    default: 22,
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
