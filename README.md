# DJ TIMER APP

[![GitHub license](https://img.shields.io/github/license/Gigandect/DJtimer.svg)](https://github.com/Gigandect/DJtimer/blob/main/LICENSE)

---

## 概要

DJ Timer は、持ち時間か出番の終了時刻のどちらかでのカウントダウンタイマー機能を備えたプログレッシブウェブアプリ（PWA）です。
DJ プレイ中の持ち時間管理のストレス無くすことで、あなたの DJ 活動をサポートします。

[デモはこちらから](https://gigandect.github.io/DJtimer/)

---

## 主な機能

- **あと何分？が超簡単！**: 持ち時間または終了時刻を入力すれば自動で残り時間を計算しカウントダウンしてくれます。
- **残り時間を視覚的にわかりやすく**: 視覚的なプログレスバー: アニメーションで残り時間を分かりやすく表示するので、DJ プレイの流れを直感的に把握できます。

---

## インストールと起動方法

プロジェクトをローカル環境で動かすための手順を記述します。

### 必要なもの

- Node.js (LTS バージョン推奨)
- npm (Node.js に付属)

### セットアップ手順

1.  **リポジトリをクローンします。**
    ```bash
    git clone [https://github.com/Gigandect/DJtimer.git](https://github.com/Gigandect/DJtimer.git)
    ```
2.  **プロジェクトディレクトリに移動します。**
    ```bash
    cd DJtimer
    ```
3.  **依存パッケージをインストールします。**
    ```bash
    npm install
    ```
4.  **開発サーバーを起動する場合:**
    ```bash
    npm start
    ```
    （通常、ブラウザが自動的に開き、`http://localhost:8080`でアプリが表示されます。）
5.  **本番用にビルドする場合:**
    ```bash
    npm run build
    ```
    （`dist`ディレクトリに最適化されたファイルが生成されます。）
6.  **PWA としてホーム画面に追加する場合:**
    ブラウザ（Chrome や Safari など）でデモサイトを開き、共有ボタン（またはメニュー）から「ホーム画面に追加」を選択してください。オフラインでも利用可能になります。

---

## 使い方

アプリの具体的な操作方法を説明します。

1.  **タイマー設定**:
    - 「時間（分）」に希望の分数を入力するか、または「終了時刻」にカウントダウンを終了したい時刻を入力します。どちらか片方のみを入力してください。
    - 入力後、「**START**」ボタンをタップするとタイマーが開始します。
2.  **タイマー操作**:
    - カウントダウン中に「**STOP**」ボタンでタイマーを一時停止できます。
    - 「**RESET**」ボタンでタイマーをリセットし、初期設定画面に戻ります。
    - タイマーが終了した際に表示される「Done!」画面の「**Back**」ボタンも、タイマーをリセットして初期設定画面に戻る機能です。
3.  **注意点**:
    - タイマーを一時停止またはリセットした場合、設定した終了時刻と実際の時間がずれることがありますのでご注意ください。
    - タイマー終了後、再度設定を行うことで繰り返し利用できます。

---

## 使用技術

- HTML5
- CSS3 (SCSS/Sass)
- JavaScript (ES6+)
- Webpack (モジュールバンドラー)
- Service Worker (PWA)

---

## 開発者

Gigandect

- ウェブサイト: [fuckyou.tokyo](https://fuckyou.tokyo)

---

## ライセンス

このプロジェクトは[MIT License](https://github.com/Gigandect/DJtimer/blob/main/LICENSE)の元で公開されています。

---
