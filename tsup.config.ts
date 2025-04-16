import { defineConfig } from 'tsup';

export default defineConfig({
  entryPoints: ['src/index.ts'],
  dts: true,
  clean: true,
  format: 'esm',
  splitting: true,
  sourcemap: false,
  // minify: true,
  // esbuildOptions: {
  //   target: 'es2020',
  // },
})