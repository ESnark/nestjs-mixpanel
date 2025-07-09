import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  target: 'es2022',
  minify: false,
  external: ['@nestjs/common', '@nestjs/core', 'reflect-metadata', 'rxjs'],
});