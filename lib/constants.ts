export type Category = "gravy" | "fry" | "staple";

export interface CategoryMeta {
  id: Category;
  label: string;
  short: string;
  emoji: string;
  hint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "gravy", label: "Gravy / Curry", short: "Gravy", emoji: "🍛", hint: "The saucy star" },
  { id: "fry", label: "Fry / Dry sabzi", short: "Fry", emoji: "🥘", hint: "Crisp or dry, on the side" },
  { id: "staple", label: "Rice / Chapati", short: "Staple", emoji: "🍚", hint: "To eat it all with" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const MEMBER_COLORS = [
  "#EF6A2B",
  "#2FA866",
  "#7C5CFC",
  "#E5483A",
  "#0EA5C6",
  "#D946A8",
  "#D99A0B",
  "#4F7CF0",
];

export const SEED_DISHES: Record<Category, { name: string; emoji: string }[]> = {
  gravy: [
    { name: "Dal Tadka", emoji: "🍲" },
    { name: "Paneer Butter Masala", emoji: "🧈" },
    { name: "Palak Paneer", emoji: "🥬" },
    { name: "Chana Masala", emoji: "🫘" },
    { name: "Rajma", emoji: "🫘" },
    { name: "Egg Curry", emoji: "🥚" },
    { name: "Chicken Curry", emoji: "🍗" },
    { name: "Sambar", emoji: "🍲" },
    { name: "Kadhi", emoji: "🥣" },
    { name: "Mixed Veg Curry", emoji: "🥕" },
  ],
  fry: [
    { name: "Aloo Fry", emoji: "🥔" },
    { name: "Cauliflower Fry", emoji: "🥦" },
    { name: "Bhindi Fry", emoji: "🌿" },
    { name: "Brinjal Fry", emoji: "🍆" },
    { name: "Beans Poriyal", emoji: "🫛" },
    { name: "Cabbage Stir-fry", emoji: "🥬" },
    { name: "Jeera Aloo", emoji: "🥔" },
    { name: "Capsicum Fry", emoji: "🫑" },
    { name: "Egg Bhurji", emoji: "🍳" },
    { name: "Paneer Bhurji", emoji: "🧀" },
  ],
  staple: [
    { name: "Steamed Rice", emoji: "🍚" },
    { name: "Chapati", emoji: "🫓" },
    { name: "Jeera Rice", emoji: "🍚" },
    { name: "Phulka", emoji: "🫓" },
    { name: "Paratha", emoji: "🫓" },
    { name: "Puri", emoji: "🫓" },
    { name: "Lemon Rice", emoji: "🍋" },
    { name: "Curd Rice", emoji: "🥛" },
    { name: "Pulao", emoji: "🍛" },
    { name: "Naan", emoji: "🫓" },
  ],
};

export const EMOJI_CHOICES = [
  "🍛", "🍲", "🥘", "🍚", "🫓", "🥔", "🥦", "🍆", "🫑", "🥕",
  "🧀", "🥚", "🍗", "🌶️", "🍋", "🥛", "🫘", "🥬", "🍅", "🥥",
];
