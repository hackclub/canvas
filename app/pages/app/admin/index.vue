<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">admin</h1>
        <p class="mt-3">hi {{ user?.first_name }}, you're an admin :D</p>
      </UiCard>

      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="section in sections"
          :key="section.to"
          :to="section.to"
          class="no-underline! block border-4 border-black p-5 hover:bg-black hover:text-white transition-colors"
        >
          <h2 class="flex items-center gap-2 font-bold text-xl">
            <Icon :name="section.icon" /> {{ section.label }}
          </h2>
          <p class="mt-1 opacity-70">{{ section.description }}</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { user } = useUserSession();

const sections = [
  {
    to: "/app/admin/users",
    label: "users",
    icon: "lucide:users",
    description: "Everyone who's signed in to Canvas",
  },
  {
    to: "/app/admin/projects",
    label: "projects",
    icon: "lucide:folder",
    description: "Every project, from every user",
  },
  {
    to: "/app/admin/ships",
    label: "review queue",
    icon: "lucide:rocket",
    description: "Shipped projects waiting to be approved or rejected",
  },
  {
    to: "/app/admin/shop",
    label: "shop",
    icon: "lucide:shopping-bag",
    description: "What people can buy with their bonus points",
  },
  {
    to: "/app/admin/audit",
    label: "audit log",
    icon: "lucide:scroll-text",
    description: "Pixel and bonus point transactions, and admin actions",
  },
];
</script>
