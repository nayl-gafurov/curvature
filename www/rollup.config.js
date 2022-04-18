import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import typeScript from 'rollup-plugin-typescript2';
import html from '@rollup/plugin-html';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import { defaultTemplate } from "./htmlTemplate";
import copy from 'rollup-plugin-copy';

const isProduction = (process.env.BUILD !== 'development')

const option = {
    input: ['./src/index.ts'],
    output: [{
        file: 'dist/bundle.js',
        name: 'example',
        sourcemap: true,
    }],
    plugins: [
        nodeResolve(),
        commonJs(),
        typeScript({ tsconfig: "tsconfig.json", sourceMap: true }),
        html({
            title: "Viewer",
            template: defaultTemplate
        }),
        serve({ contentBase: ['dist'] }),
        isProduction && terser(),
        copy({
            targets: [
                { src: 'style.css', dest: 'dist' },
                { src: "node_modules/three/examples/js/libs/draco/", dest: 'dist' },
                { src: 'public', dest: 'dist' },
                { src: 'node_modules/curvature/curvature_bg.wasm', dest: 'dist' }
            ]
        }),
    ]
}

export default [option];
