import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.join(projectRoot, '.env.local');
const localEnv = existsSync(localEnvPath) ? dotenv.parse(readFileSync(localEnvPath)) : {};
const cartoBasemapKey = process.env.CARTO_BASEMAP_API_KEY ?? localEnv.CARTO_BASEMAP_API_KEY ?? '';

export default (_env, argv) => ({
  entry: './src/main.tsx',
  output: {
    path: path.join(projectRoot, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    assetModuleFilename: 'assets/[name].[contenthash][ext]',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.app.json',
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __CARTO_BASEMAP_API_KEY__: JSON.stringify(cartoBasemapKey),
    }),
    new HtmlWebpackPlugin({ template: './index.html' }),
    new CopyWebpackPlugin({ patterns: [{ from: 'public', to: '.' }] }),
  ],
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react',
          chunks: 'all',
        },
      },
    },
  },
  devtool: argv.mode === 'production' ? false : 'eval-source-map',
  devServer: {
    host: '127.0.0.1',
    port: 5173,
    static: path.join(projectRoot, 'public'),
    historyApiFallback: true,
  },
});
