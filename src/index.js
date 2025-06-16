import './style.scss';

// DOM要素の取得
const durationInput = document.getElementById('durationInput');
const endTimeInput = document.getElementById('endTimeInput');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resetButton = document.getElementById('resetButton');
const inputSection = document.getElementById('inputSection');
const countdownSection = document.getElementById('countdownSection');
const doneSection = document.getElementById('doneSection');
const backToInputButton = document.getElementById('backToInputButton');
const remainingTimeDisplay = document.getElementById('remainingTime');
const elapsedTimeDisplay = document.getElementById('elapsedTime');
const timerCanvas = document.getElementById('timerCanvas');
const ctx = timerCanvas.getContext('2d');
const hintButton = document.querySelector('footer .hint'); // ヒントボタン
const hintContainer = document.querySelector('.hint-cont'); // ヒントコンテンツ
const hintOverlay = document.querySelector('.hint-overlay');

// グローバル変数
let timerInterval; // タイマーのsetIntervalIDを保持
let totalDuration = 0; // 設定されたタイマーの全体のミリ秒
let startTime = 0;     // タイマーが開始された時刻 (Unixタイムスタンプ)
let endTime = 0;       // タイマーが終了する時刻 (Unixタイムスタンプ)
let isRunning = false; // タイマーが現在動いているかどうかのフラグ

// 棒グラフのアニメーション用変数
let currentBarProgress = 0; // 現在描画されている棒グラフの進捗 (0.0～1.0)
let targetBarProgress = 0;  // 目標とする棒グラフの進捗 (0.0～1.0)
let animationFrameId;       // requestAnimationFrameのIDを保持

// ★追加：endTimeInputがユーザーによって手動で設定されたかどうかのフラグ
let isEndTimeInputManuallySet = false;

// --- サービスワーカーの登録（PWA化の基盤） ---
// ブラウザがService Workerをサポートしているか確認
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service Workerを登録
        navigator.serviceWorker.register('/DJtimer/service-worker.js') // service-worker.jsのパスを指定
            .then(registration => {
                console.log('Service Worker Registered: ', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed: ', error);
            });
    });
}

// --- Canvasのサイズ調整 ---
// ウィンドウサイズに合わせてCanvasのサイズを調整する関数
function resizeCanvas() {
    timerCanvas.width = window.innerWidth;
    timerCanvas.height = window.innerHeight;
    // サイズ変更後も現在のタイマーの進捗に合わせてグラフを再描画
    if (isRunning && totalDuration > 0) {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / totalDuration;
        targetBarProgress = progress; // 目標進捗を更新
        animateProgressBar(); // アニメーションを再開
    } else {
        // タイマーが動いていない場合は初期状態のグラフを描画
        targetBarProgress = 0; // 目標を0に設定
        animateProgressBar(); // アニメーションを再開 (0に収束させるため)
    }
}

// ウィンドウのリサイズ時とロード時にCanvasのサイズ調整関数を呼び出す
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

// --- イベントリスナーの設定 ---

// durationInput に入力があったら endTimeInput を disabled にする
durationInput.addEventListener('input', () => {
    if (durationInput.value !== '') {
        endTimeInput.disabled = true;
        endTimeInput.value = ''; // 値をクリア
        isEndTimeInputManuallySet = false; // ★追加：手動設定フラグをリセット
    } else {
        endTimeInput.disabled = false;
        // durationInputがクリアされたらendTimeInputに現在時刻を設定し、手動設定フラグをリセット
        setEndTimeInputToCurrentTime(); 
        isEndTimeInputManuallySet = false; // ★追加：手動設定フラグをリセット
    }
});

// endTimeInput に入力があったら durationInput を disabled にする
endTimeInput.addEventListener('input', () => {
    if (endTimeInput.value !== '') {
        durationInput.disabled = true;
        durationInput.value = ''; // 値をクリア
        isEndTimeInputManuallySet = true; // ★追加：手動設定フラグをONにする
    } else {
        durationInput.disabled = false;
        isEndTimeInputManuallySet = false; // ★追加：空になったら手動設定フラグをリセット
    }
});


// Startボタンのクリックイベント
startButton.addEventListener('click', () => {
    // ★★★ ここを修正！ ★★★
    // durationInput が空 かつ endTimeInput が空 または endTimeInputが手動で設定されてない場合
    if (durationInput.value === '' && (!endTimeInput.value || !isEndTimeInputManuallySet)) {
        alert('時間か終了時間のどちらかを入力してね！');
        return; // 処理を中断
    }
    // ★★★ 修正ここまで ★★★

    let selectedDuration = 0; // ユーザーが設定した合計時間（ミリ秒）

    // durationInputが有効で、かつ入力されている場合
    if (!durationInput.disabled && durationInput.value) {
        selectedDuration = parseInt(durationInput.value, 10) * 60 * 1000; // 分をミリ秒に変換
        // 入力値のバリデーション (0分から999分)
        if (selectedDuration < 0 || selectedDuration > 999 * 60 * 1000) {
            alert('時間は0分から999分の間で入力してね！');
            return; // 処理を中断
        }
        endTime = Date.now() + selectedDuration; // 現在時刻に設定時間を加算して終了時刻を算出
    }
    // endTimeInputが有効で、かつ入力されている場合
    else if (!endTimeInput.disabled && endTimeInput.value) {
        const [hours, minutes] = endTimeInput.value.split(':').map(Number); // 時と分を取得
        const now = new Date(); // 現在の日付と時刻
        // ユーザーが選択した終了時刻を今日の日付で設定
        const selectedEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

        // もし選択された終了時刻が現在時刻よりも過去であれば、翌日の時刻とみなす
        if (selectedEndTime.getTime() <= now.getTime()) {
             // 翌日に設定
            selectedEndTime.setDate(selectedEndTime.getDate() + 1);
            // 翌日になっても現在時刻より過去だったらエラー
            if (selectedEndTime.getTime() <= now.getTime()) {
                alert('終了時間は現在時刻より未来の時間を選んでね！');
                return;
            }
        }
        endTime = selectedEndTime.getTime(); // 終了時刻をミリ秒で設定
        selectedDuration = endTime - now.getTime(); // 終了時刻までの残り時間を算出

        // 終了時刻までの残り時間が短すぎる場合のバリデーション（例: 1秒未満）
        if (selectedDuration < 1000) { // 最低1秒以上
            alert('終了時間は現在時刻より少し未来の時間を選んでね！');
            return; // 処理を中断
        }
    }
    // ここは通常実行されないはずだが、念のため残しておく
    else {
        alert('時間か終了時間のどちらかを入力してね！');
        return; // 処理を中断
    }

    startTime = Date.now(); // タイマー開始時刻を現在時刻に設定
    totalDuration = selectedDuration; // 全体時間を設定

    // アプリが閉じられてもタイマー状態を保持するためにlocalStorageに保存
    localStorage.setItem('timerStartTime', startTime);
    localStorage.setItem('timerEndTime', endTime);
    localStorage.setItem('timerTotalDuration', totalDuration);
    localStorage.setItem('timerIsRunning', 'true'); // タイマーが動作中であることを保存

    startTimer(); // タイマーを開始
    toggleDisplay('countdown'); // カウントダウン表示に切り替え
});

// Stopボタンのクリックイベント
stopButton.addEventListener('click', () => {
    stopTimer(); // タイマーを停止
    localStorage.setItem('timerIsRunning', 'false'); // 停止状態をlocalStorageに保存
});

// Resetボタンのクリックイベント
resetButton.addEventListener('click', () => {
    stopTimer(); // タイマーを停止
    resetTimerDisplay(); // タイマー表示をリセット
    toggleDisplay('input'); // 入力画面に戻す
    localStorage.clear(); // localStorageのタイマー情報をクリア
});

// Done!画面のBACKボタンのクリックイベント
backToInputButton.addEventListener('click', () => {
    resetTimerDisplay(); // タイマー表示をリセット
    toggleDisplay('input'); // 入力画面に戻す
    localStorage.clear(); // localStorageのタイマー情報をクリア
});

// ヒントボタンのクリックイベント
hintButton.addEventListener('click', () => {
    hintContainer.classList.add('is-active'); // is-activeクラスを追加して表示
    hintOverlay.classList.add('is-active');
});

// ヒントコンテンツをタップしたら閉じる（簡易的な閉じ方）
hintOverlay.addEventListener('click', () => {
    hintContainer.classList.remove('is-active'); // is-activeクラスを削除して非表示
    hintOverlay.classList.remove('is-active'); // オーバーレイも非表示
});


// --- タイマー制御関数 ---

// タイマーを開始する
function startTimer() {
    if (isRunning) return; // すでにタイマーが動いている場合は何もしない

    isRunning = true;
    updateTimer(); // 最初の1回はすぐに表示を更新
    timerInterval = setInterval(updateTimer, 1000); // 1秒ごとにupdateTimerを呼び出す
}

// タイマーを停止する
function stopTimer() {
    clearInterval(timerInterval); // setIntervalを停止
    isRunning = false;
    cancelAnimationFrame(animationFrameId); // アニメーションフレームも停止
}

// タイマーの表示を更新するメイン関数
function updateTimer() {
    const now = Date.now(); // 現在時刻を取得
    const remaining = endTime - now; // 残り時間（ミリ秒）
    const elapsed = now - startTime; // 経過時間（ミリ秒）

    // 残り時間がゼロ以下になった場合
    if (remaining <= 0) {
        remainingTimeDisplay.textContent = '00:00:00'; // 残り時間をゼロ表示
        elapsedTimeDisplay.textContent = formatTime(totalDuration); // 経過時間を合計時間で表示
        
        targetBarProgress = 1; // 目標を100%に設定
        animateProgressBar(); // アニメーションを完了させる

        stopTimer(); // タイマーを停止
        localStorage.setItem('timerIsRunning', 'false'); // localStorageのフラグを停止に
        toggleDisplay('done'); // Done!画面に切り替え
        return; // 処理を終了
    }

    // 残り時間と経過時間を表示を更新
    remainingTimeDisplay.textContent = formatTime(remaining);
    elapsedTimeDisplay.textContent = formatTime(elapsed);

    // 棒グラフの目標進捗を更新
    targetBarProgress = elapsed / totalDuration; // 経過時間の割合 (0.0 から 1.0)
    animateProgressBar(); // アニメーションを開始/続行
}

// ミリ秒を "HH:MM:SS" 形式にフォーマットする
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000); // ミリ秒を秒に変換
    const hours = Math.floor(totalSeconds / 3600); // 時を計算
    const minutes = Math.floor((totalSeconds % 3600) / 60); // 分を計算
    const seconds = totalSeconds % 60; // 秒を計算
    // 各数値を2桁表示にしてコロンで連結
    return [hours, minutes, seconds]
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
}

// --- 棒グラフの描画関数 ---
function drawProgressBar(progress) {
    const canvasWidth = timerCanvas.width;
    const canvasHeight = timerCanvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // キャンバス全体をクリア

    const barHeight = canvasHeight * progress;

    // 色を$pink一色に設定
    ctx.fillStyle = '#E770C2'; // $pinkの色コード

    // 棒グラフを描画 (下から上に伸びる)
    ctx.fillRect(0, canvasHeight - barHeight, canvasWidth, barHeight);
}

// 棒グラフをアニメーションさせる関数
function animateProgressBar() {
    if (Math.abs(targetBarProgress - currentBarProgress) < 0.0001) { // 誤差の閾値をさらに小さく
        drawProgressBar(targetBarProgress); // 確実に目標値で描画
        cancelAnimationFrame(animationFrameId); // アニメーションを停止
        return;
    }

    currentBarProgress += (targetBarProgress - currentBarProgress) * 0.05; // 0.05はアニメーション速度調整

    drawProgressBar(currentBarProgress);

    animationFrameId = requestAnimationFrame(animateProgressBar);
}

// endTimeInputに現在時刻を設定するヘルパー関数
function setEndTimeInputToCurrentTime() {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    endTimeInput.value = `${currentHours}:${currentMinutes}`;
    // ★追加：ここでvalueを設定したので、手動設定フラグはfalseのまま
}


// --- 画面表示の切り替え ---
function toggleDisplay(mode) {
    // 全てのセクションからis-active-sectionクラスを削除
    inputSection.classList.remove('is-active-section');
    countdownSection.classList.remove('is-active-section');
    doneSection.classList.remove('is-active-section');
    hintContainer.classList.remove('is-active'); // ヒントコンテンツも非表示にする

    // 指定されたモードのセクションにis-active-sectionクラスを追加
    if (mode === 'input') {
        inputSection.classList.add('is-active-section');
        // 入力画面に戻る際にinputのdisabled状態をリセット
        durationInput.disabled = false;
        endTimeInput.disabled = false;

        // endTimeInputのvalueを現在時刻に設定（プレースホルダー的な役割）
        setEndTimeInputToCurrentTime();
        isEndTimeInputManuallySet = false; // ★追加：初期値なので手動設定フラグはfalse

        // durationInputのvalueもクリア
        durationInput.value = '';

        // 入力画面に戻ったら棒グラフのアニメーションをリセット
        currentBarProgress = 0;
        targetBarProgress = 0;
        animateProgressBar(); // 0に収束させるアニメーションを開始
    } else if (mode === 'countdown') {
        countdownSection.classList.add('is-active-section');
    } else if (mode === 'done') {
        doneSection.classList.add('is-active-section');
    }
}

// --- タイマー表示のリセット ---
function resetTimerDisplay() {
    remainingTimeDisplay.textContent = '00:00:00';
    elapsedTimeDisplay.textContent = '00:00:00';
    durationInput.value = ''; // durationInputをクリア
    // endTimeInputはtoggleDisplay('input')でリセットされるのでここでは特に操作しない

    // リセット時もアニメーションを0に設定
    currentBarProgress = 0;
    targetBarProgress = 0;
    animateProgressBar(); // 0に収束させるアニメーションを開始
}

// --- アプリ起動時の初期処理 ---
// ページロード時にlocalStorageを確認してタイマーを再開する
window.addEventListener('load', () => {
    const storedStartTime = localStorage.getItem('timerStartTime');
    const storedEndTime = localStorage.getItem('timerEndTime');
    const storedTotalDuration = localStorage.getItem('timerTotalDuration');
    const storedIsRunning = localStorage.getItem('timerIsRunning');

    if (storedStartTime && storedEndTime && storedTotalDuration && storedIsRunning === 'true') {
        startTime = parseInt(storedStartTime, 10);
        endTime = parseInt(storedEndTime, 10);
        totalDuration = parseInt(storedTotalDuration, 10);

        if (Date.now() >= endTime) {
            resetTimerDisplay();
            toggleDisplay('done');
            localStorage.clear();
        } else {
            toggleDisplay('countdown');
            startTimer();
            const elapsed = Date.now() - startTime;
            currentBarProgress = elapsed / totalDuration;
            targetBarProgress = currentBarProgress;
            animateProgressBar();
        }
    } else {
        toggleDisplay('input');
        // `input` モードになったときに `setEndTimeInputToCurrentTime()` が呼ばれ、
        // `isEndTimeInputManuallySet` が `false` に設定されるので、ここでの追加処理は不要。
        currentBarProgress = 0;
        targetBarProgress = 0;
        animateProgressBar();
    }
});