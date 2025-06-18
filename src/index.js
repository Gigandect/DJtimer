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
const hintButton = document.querySelector('footer .hint');
const hintContainer = document.querySelector('.hint-cont');
const hintOverlay = document.querySelector('.hint-overlay');

// グローバル変数
let timerInterval;
let totalDuration = 0;
let startTime = 0;
let endTime = 0;
let isRunning = false;

// 棒グラフアニメーション用変数
let currentBarProgress = 0;
let targetBarProgress = 0;
let animationFrameId;

// ユーザーが手動でendTimeInputを設定したかを判定するフラグ
let isEndTimeInputManuallySet = false;


// --------------------
//  サービスワーカーの登録（PWA化）
// --------------------

// Service Workerがブラウザでサポートされているか確認
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service Workerを登録
        navigator.serviceWorker.register('/DJtimer/service-worker.js')
            .then(registration => {
                console.log('Service Worker Registered: ', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed: ', error);
            });
    });
}


// --------------------
//  Canvasのサイズ調整
// --------------------

// ウィンドウサイズに合わせてCanvasのサイズを調整し、必要に応じてグラフを再描画
function resizeCanvas() {
    timerCanvas.width = window.innerWidth;
    timerCanvas.height = window.innerHeight;
    
    // タイマー動作中は現在の進捗に合わせて再描画、停止中は0%で描画
    if (isRunning && totalDuration > 0) {
        const elapsed = Date.now() - startTime;
        targetBarProgress = elapsed / totalDuration;
        animateProgressBar();
    } else {
        targetBarProgress = 0;
        animateProgressBar();
    }
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);


// --------------------
// イベントリスナー
// --------------------

// durationInputに値があればendTimeInputを無効化
durationInput.addEventListener('input', () => {
    if (durationInput.value !== '') {
        endTimeInput.disabled = true;
        endTimeInput.value = '';
        isEndTimeInputManuallySet = false;
    } else {
        endTimeInput.disabled = false;
        setEndTimeInputToCurrentTime(); // durationInputが空になったらendTimeInputを現在時刻に設定
        isEndTimeInputManuallySet = false;
    }
});

// endTimeInputに値があればdurationInputを無効化
endTimeInput.addEventListener('input', () => {
    if (endTimeInput.value !== '') {
        durationInput.disabled = true;
        durationInput.value = '';
        isEndTimeInputManuallySet = true; // 手動設定フラグをON
    } else {
        durationInput.disabled = false;
        isEndTimeInputManuallySet = false;
    }
});

// Startボタンクリック時の処理
startButton.addEventListener('click', () => {
    // durationInputとendTimeInputの両方が空、またはendTimeInputが自動設定値の場合はエラー
    if (durationInput.value === '' && (!endTimeInput.value || !isEndTimeInputManuallySet)) {
        alert('時間か終了時間のどちらかを入力してください！');
        return;
    }

    let selectedDuration = 0;

    // durationInputからの設定処理
    if (!durationInput.disabled && durationInput.value) {
        selectedDuration = parseInt(durationInput.value, 10) * 60 * 1000;
        if (selectedDuration < 0 || selectedDuration > 999 * 60 * 1000) {
            alert('時間は0分から999分の間で入力してください！');
            return;
        }
        endTime = Date.now() + selectedDuration;
    }
    // endTimeInputからの設定処理
    else if (!endTimeInput.disabled && endTimeInput.value) {
        const [hours, minutes] = endTimeInput.value.split(':').map(Number);
        const now = new Date();
        const selectedEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

        // 選択された終了時刻が過去なら翌日に設定
        if (selectedEndTime.getTime() <= now.getTime()) {
            selectedEndTime.setDate(selectedEndTime.getDate() + 1);
            // 翌日になっても過去ならエラー
            if (selectedEndTime.getTime() <= now.getTime()) {
                alert('終了時間は現在時刻より未来の時間を選んでください！');
                return;
            }
        }
        endTime = selectedEndTime.getTime();
        selectedDuration = endTime - now.getTime();

        // 残り時間が短すぎる場合のバリデーション
        if (selectedDuration < 1000) {
            alert('終了時間は現在時刻より少し未来の時間を選んでください！');
            return;
        }
    } else {
        // ここには通常到達しない
        alert('時間か終了時間のどちらかを入力してください！');
        return;
    }

    startTime = Date.now();
    totalDuration = selectedDuration;

    // タイマー状態をlocalStorageに保存し、アプリのリロード時に復元できるようにする
    localStorage.setItem('timerStartTime', startTime);
    localStorage.setItem('timerEndTime', endTime);
    localStorage.setItem('timerTotalDuration', totalDuration);
    localStorage.setItem('timerIsRunning', 'true');

    startTimer();
    toggleDisplay('countdown');
});

// Stopボタンクリック時の処理
stopButton.addEventListener('click', () => {
    stopTimer();
    localStorage.setItem('timerIsRunning', 'false');
});

// Resetボタンクリック時の処理
resetButton.addEventListener('click', () => {
    stopTimer();
    resetTimerDisplay();
    toggleDisplay('input');
    localStorage.clear();
});

// Done!画面のBackボタンクリック時の処理
backToInputButton.addEventListener('click', () => {
    resetTimerDisplay();
    toggleDisplay('input');
    localStorage.clear();
});

// ヒントボタンクリックでヒント表示
hintButton.addEventListener('click', () => {
    hintContainer.classList.add('is-active');
    hintOverlay.classList.add('is-active');
});

// ヒントオーバーレイクリックでヒント非表示
hintOverlay.addEventListener('click', () => {
    hintContainer.classList.remove('is-active');
    hintOverlay.classList.remove('is-active');
});


// --------------------
// タイマー制御関数
// --------------------

// タイマーを開始
function startTimer() {
    if (isRunning) return;

    isRunning = true;
    updateTimer(); // 即時更新
    timerInterval = setInterval(updateTimer, 1000); // 1秒ごとに更新
}

// タイマーを停止
function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    cancelAnimationFrame(animationFrameId); // 棒グラフアニメーションも停止
}

// タイマーの表示を更新するメインロジック
function updateTimer() {
    const now = Date.now();
    const remaining = endTime - now;
    const elapsed = now - startTime;

    if (remaining <= 0) {
        remainingTimeDisplay.textContent = '00:00:00';
        elapsedTimeDisplay.textContent = formatTime(totalDuration);
        
        targetBarProgress = 1; // 棒グラフを100%にする
        animateProgressBar();

        stopTimer();
        localStorage.setItem('timerIsRunning', 'false');
        toggleDisplay('done'); // 完了画面へ
        return;
    }

    remainingTimeDisplay.textContent = formatTime(remaining);
    elapsedTimeDisplay.textContent = formatTime(elapsed);

    targetBarProgress = elapsed / totalDuration; // 棒グラフの目標進捗を計算
    animateProgressBar(); // 棒グラフアニメーション更新
}

// ミリ秒を "HH:MM:SS" 形式にフォーマット
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
}


// --------------------
// 棒グラフの描画とアニメーション
// --------------------

// 棒グラフを描画
function drawProgressBar(progress) {
    const canvasWidth = timerCanvas.width;
    const canvasHeight = timerCanvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // キャンバスクリア

    const barHeight = canvasHeight * progress;
    ctx.fillStyle = '#E770C2'; // $pinkの色
    ctx.fillRect(0, canvasHeight - barHeight, canvasWidth, barHeight); // 下から上に伸びるグラフ
}

// 棒グラフをスムーズにアニメーション
function animateProgressBar() {
    // 目標値に十分近づいたらアニメーション停止
    if (Math.abs(targetBarProgress - currentBarProgress) < 0.0001) {
        drawProgressBar(targetBarProgress);
        cancelAnimationFrame(animationFrameId);
        return;
    }

    // 目標値に向かって少しずつ進捗を更新
    currentBarProgress += (targetBarProgress - currentBarProgress) * 0.05; // 0.05はアニメーション速度
    drawProgressBar(currentBarProgress);
    animationFrameId = requestAnimationFrame(animateProgressBar);
}


// --------------------
// ヘルパー関数
// --------------------

// endTimeInputに現在時刻を設定
function setEndTimeInputToCurrentTime() {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    endTimeInput.value = `${currentHours}:${currentMinutes}`;
}


// --------------------
// 画面表示制御
// --------------------

// 画面の表示モードを切り替える
function toggleDisplay(mode) {
    inputSection.classList.remove('is-active-section');
    countdownSection.classList.remove('is-active-section');
    doneSection.classList.remove('is-active-section');
    hintContainer.classList.remove('is-active'); // ヒントも非表示

    if (mode === 'input') {
        inputSection.classList.add('is-active-section');
        durationInput.disabled = false;
        endTimeInput.disabled = false;
        setEndTimeInputToCurrentTime(); // 入力画面ではendTimeInputを現在時刻で初期化
        isEndTimeInputManuallySet = false;
        durationInput.value = ''; // durationInputはクリア
        resetProgressBarAnimation(); // 棒グラフをリセット
    } else if (mode === 'countdown') {
        countdownSection.classList.add('is-active-section');
    } else if (mode === 'done') {
        doneSection.classList.add('is-active-section');
    }
}

// タイマー表示と棒グラフアニメーションをリセット
function resetTimerDisplay() {
    remainingTimeDisplay.textContent = '00:00:00';
    elapsedTimeDisplay.textContent = '00:00:00';
    durationInput.value = '';
    resetProgressBarAnimation();
}

// 棒グラフのアニメーションを初期状態（0%）にリセットするヘルパー関数
function resetProgressBarAnimation() {
    currentBarProgress = 0;
    targetBarProgress = 0;
    animateProgressBar();
}


// --------------------
// アプリ起動時の初期化
// --------------------

// ページロード時にlocalStorageを確認し、タイマー状態を復元
window.addEventListener('load', () => {
    const storedStartTime = localStorage.getItem('timerStartTime');
    const storedEndTime = localStorage.getItem('timerEndTime');
    const storedTotalDuration = localStorage.getItem('timerTotalDuration');
    const storedIsRunning = localStorage.getItem('timerIsRunning');

    if (storedStartTime && storedEndTime && storedTotalDuration && storedIsRunning === 'true') {
        startTime = parseInt(storedStartTime, 10);
        endTime = parseInt(storedEndTime, 10);
        totalDuration = parseInt(storedTotalDuration, 10);

        // 既にタイマーが終了していた場合
        if (Date.now() >= endTime) {
            resetTimerDisplay();
            toggleDisplay('done');
            localStorage.clear();
        } else {
            // タイマーを再開
            toggleDisplay('countdown');
            startTimer();
            // 現在の経過時間に基づいて棒グラフの進捗を設定
            const elapsed = Date.now() - startTime;
            currentBarProgress = elapsed / totalDuration;
            targetBarProgress = currentBarProgress; // アニメーションが途切れないように目標も現在値に
            animateProgressBar();
        }
    } else {
        // 初回アクセスまたはタイマーが停止中の場合
        toggleDisplay('input');
        resetProgressBarAnimation();
    }
});