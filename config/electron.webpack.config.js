const lodash = require('lodash');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const externals = require('../package.json');

function srcPaths(src) {
  return path.join(__dirname, src);
}

const isEnvProduction = process.env.NODE_ENV === 'production';
const isEnvDevelopment = process.env.NODE_ENV === 'development';

// #region Common settings
const commonConfig = {
  devtool: isEnvDevelopment ? 'inline-source-map' : false,
  mode: isEnvProduction ? 'production' : 'development',
  output: {path: srcPaths('../build')},
  node: {__dirname: false, __filename: false},
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
    modules: [path.join(__dirname, '../src/ui'), 'node_modules']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.(scss|css)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|png|svg|ico|icns)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
    ],
  },
};
const rendererConfig = lodash.cloneDeep(commonConfig);
rendererConfig.entry = [
  'core-js',
  'regenerator-runtime/runtime',
  srcPaths('../src/ui/index.tsx')
];
rendererConfig.target = 'electron-renderer';
rendererConfig.node = {
  __dirname: false,
  __filename: false,
};
rendererConfig.output.filename = 'renderer.bundle.js';
rendererConfig.plugins = [
  new HtmlWebpackPlugin({
    inject: 'body',
    filename: srcPaths('../build/index.html'),
    template: srcPaths('../public/index.html'),
  }),
];
rendererConfig.externals = externals;

module.exports = [rendererConfig];
