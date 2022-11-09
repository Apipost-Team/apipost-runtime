import commonjs from 'rollup-plugin-commonjs'

export default [{
  name: 'apipost-runtime',
  input: 'runtime.js',
  output: {
    name: 'apipost-runtime',
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    commonjs(),
  ]
}]