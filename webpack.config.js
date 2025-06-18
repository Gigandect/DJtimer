const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // ビルドモード: 'production'にすると最適化される
  // mode: 'production', 

  // エントリーポイント: ビルド開始ファイル
  entry: './src/index.js',

  // 出力設定
  output: {
    path: path.resolve(__dirname, 'dist'), // 出力先ディレクトリ
    filename: 'bundle.js',                 // JSバンドルファイル名
    clean: true,                           // 新しいビルド前に'dist'をクリーンアップ
    assetModuleFilename: '[name][ext]',    // アセットモジュールのファイル名
    // デプロイ環境に応じてpublicPathを切り替え
    publicPath: process.env.NODE_ENV === 'production' ? '/DJtimer/' : '/', 
  },

  // モジュールルール: 各種ファイルの処理方法
  module: {
    rules: [
      // JavaScript: BabelでモダンなJSを変換
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { modules: false }]],
          },
        },
      },
      // SCSS/CSS: コンパイル・バンドル・注入
      {
        test: /\.(scss|css)$/,
        use: [
          'style-loader',       // JSに変換されたCSSをHTMLに注入
          {
            loader: 'css-loader', // CSSをJSモジュールに変換
            options: {
              url: true,             // url()解決を有効に
              importLoaders: 2,      // 後続のローダーの後に実行
              sourceMap: false,
            },
          },
          'postcss-loader',     // CSS最適化
          'sass-loader',        // SCSSをCSSにコンパイル
        ],
      },
      // GIF画像: Base64としてJSバンドルに埋め込む
      {
        test: /\.gif$/i,
        type: 'asset/inline',
      },
      // その他の画像: ファイルとして出力
      {
        test: /\.(png|svg|jpg|jpeg)$/i,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      // HTML: Webpackで扱えるようにする
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
    ],
  },

  // プラグイン: ビルドプロセスで特別なタスクを実行
  plugins: [
    // HTMLファイルを生成し、バンドルされたJS/CSSを注入
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      // 生成されるHTMLの最適化設定
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        useShortDoctype: true,
      },
    }),
    // 生成されたJavaScriptをHTMLファイルに直接インライン化
    new HtmlInlineScriptPlugin({
      scriptMatchPattern: [/bundle\.js$/],
    }),
    // 指定ファイルを'dist'フォルダにコピー
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/icons/', to: 'icons/', noErrorOnMissing: true }, // アイコンフォルダ
        { from: 'manifest.webmanifest', to: './', noErrorOnMissing: true }, // マニフェストファイル
        { from: 'service-worker.js', to: './', noErrorOnMissing: true },   // Service Workerファイル
      ],
    }),
  ],

  // 開発サーバー設定: ライブリロードなど
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      watch: true,
    },
    compress: true,
    port: 8080,
    open: true,
    historyApiFallback: true, // SPA用設定
    hot: true,                // ホットモジュール置換
  },
};