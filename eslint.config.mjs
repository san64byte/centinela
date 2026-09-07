import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    extends: [betterTailwindcss.configs.correctness],
    settings: {
      'better-tailwindcss': {
        // path ke file entry CSS yang berisi @import "tailwindcss"
        entryPoint: 'src/app/globals.css',
      },
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
