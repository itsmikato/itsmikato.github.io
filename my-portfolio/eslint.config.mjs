import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // images are pre-sized by scripts/optimize-images.mjs (next/image can't optimize a static export)
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
