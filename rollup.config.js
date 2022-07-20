import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';

export default [{
  name: 'apipost-runtime',
  input: 'runtime.js',
  output: {
    name: 'apipost-runtime',
    file: 'dist/index.js',
    format: 'amd'
  },
  plugins: [
    commonjs(),
    terser(),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers'],
  }),
  ]
}]

