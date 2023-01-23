import typescript from '@rollup/plugin-typescript';

const commonOptions = {
    plugins: [typescript()],
};

/** @type {import('rollup').RollupOptions[]} */
export default [
    {
        ...commonOptions,
        input: 'src/index.ts',
        output: {
            file: 'dist/index.js',
            format: 'es',
            sourcemap: true,
        },
    },
    {
        ...commonOptions,
        input: 'src/router.ts',
        output: {
            file: 'dist/router.js',
            format: 'es',
            sourcemap: true,
        },
    },
    {
        ...commonOptions,
        input: 'src/counter.ts',
        output: {
            file: 'dist/counter.js',
            format: 'es',
            sourcemap: true,
        },
    },
    {
        ...commonOptions,
        input: 'src/service-worker.ts',
        output: {
            file: 'dist/service-worker.js',
            format: 'es',
            sourcemap: true,
        },
    },
];
