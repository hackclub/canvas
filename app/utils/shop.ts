import type { ShopItemForm } from "~/components/admin/shop/form.vue";

// What the admin shop routes take, from the item form
export function shopItemBody(form: ShopItemForm) {
  return {
    name: form.name,
    description: form.description,
    price: form.price === "" ? null : form.price,
    stock: form.stock === "" ? null : form.stock,
    showInApp: form.showInApp,
    showOnLanding: form.showOnLanding,
  };
}

// e.g. "3 left", "sold out" or "unlimited". Purchases aren't counted yet.
export function stockLabel(stock: number | null) {
  if (stock === null) return "";
  return stock ? `${stock.toLocaleString()} left` : "sold out";
}
