import type { ShopItemForm } from "~/components/admin/shop/form.vue";

// What the item form starts as for a new item, matching the column defaults
export function emptyShopItemForm(): ShopItemForm {
  return {
    name: "",
    description: "",
    price: "",
    stock: "",
    showInApp: true,
    showOnLanding: false,
    showQuantity: true,
    perUserLimit: "",
    checkoutLimit: 1,
    checkoutLimitEnabled: false,
    disclaimer: "",
    silly: false,
    requirePhone: false,
  };
}

// What the admin shop routes take, from the item form
export function shopItemBody(form: ShopItemForm) {
  return {
    name: form.name,
    description: form.description,
    price: form.price === "" ? null : form.price,
    stock: form.stock === "" ? null : form.stock,
    showInApp: form.showInApp,
    showOnLanding: form.showOnLanding,
    showQuantity: form.showQuantity,
    perUserLimit: form.perUserLimit === "" ? null : form.perUserLimit,
    // Left as it was if emptied while turned off
    checkoutLimit: form.checkoutLimit === "" ? undefined : form.checkoutLimit,
    checkoutLimitEnabled: form.checkoutLimitEnabled,
    disclaimer: form.disclaimer,
    silly: form.silly,
    requirePhone: form.requirePhone,
  };
}

// e.g. "3 left" or "sold out", empty when there's no limit
export function stockLabel(stock: number | null) {
  if (stock === null) return "";
  return stock ? `${stock.toLocaleString()} left` : "sold out";
}
