// Ambient module declaration so TypeScript stops complaining about
// `import "./globals.css"` in app/layout.tsx. Tailwind v4 still uses
// plain `.css` files and there's no built-in type for them.
declare module "*.css";
