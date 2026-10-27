import { useState, useEffect, useRef } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import beepSound from "./assets/beepSound.mp3"
import brownNoise from "./assets/brownNoise.mp3"
import './index.css'
import Practice from './Practice.jsx'
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react"
import ConfirmDialog from './components/ConfirmDialog.jsx'
import Dashboard from './components/Dashboard.jsx'

//リセット時に「今までの集中時間を記録しますか？」
//[記録する] [記録しない] [戻る]というダイアログを出させる。
//現在は記録しないようにしている。
//モード（work⇔break）切り替え時も同じダイアログ出させる。
function App() {
  //設定時間（秒） ユーザーが設定した作業時間/休憩時間
  const [workTime, setWorkTime] = useState(25 * 60);
  const [breakTime, setBreakTime] = useState(5 * 60);

  //終了時刻（ミリ秒） 「今から何秒後に終わるか」をミリ秒で持っている
  const [endTime, setEndTime] = useState(Date.now() + workTime * 1000 + 1000);
  //booleanが返る。初期値設定すること。１敗。
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("work");
  //work,breakを切り替える。
  const [view, setView] = useState("timer");
  //timer, dashboardを切り替える。

  //Beep音が鳴っているかどうかの状態管理。
  const [isBeeping, setIsBeeping] = useState(false);
  //work/break endTimeを編集中かどうかの状態管理
  const [isEditing, setIsEditing] = useState(false);
  //入力値の状態管理、単位は秒
  const [inputValue, setInputValue] = useState("00:08");
  //ブラウンノイズの音量調整の状態管理。音量は0~1の範囲。0になったらpauseしてる
  const [brownVolume, setBrownVolume] = useState(0.2);
  //ユーザーがブラウンノイズを意図的に止めてるかの状態管理。
  const [isMute, setIsMute] = useState(false);
  //ticktackチクタクのtick。1秒ごとに更新するstateってこと。
  const [tick, setTick] = useState(0);
  //localStorageから取り出す際のデータ管理
  const [records, setRecords] = useState(
    JSON.parse(localStorage.getItem("records")) ?? []
  );
  //リセット/モード切替の確認ダイアログの状態管理。nullなら非表示。
  // { type: "reset" } または { type: "switchMode", targetMode: "work" | "break" }
  const [confirmAction, setConfirmAction] = useState(null);


  // Audioインスタンスを1つに固定して停止制御が効くようにするための箱
  // (毎回newすると音が重複し、停止制御できなくなる)。
  const brownRef = useRef(new Audio(brownNoise));
  // 前回のmodeを保持する
  // modeの変化（break→workなど）を検知するための箱
  const prevModeRef = useRef(mode);
  //初回レンダリング時のみの条件分岐(if文)を使うためのuseRef。初回にfalseにして、以降は通らないようにする。
  //初回はここで終了、Strictmodeで2回発火してしまうため、対応するため初期値は2とした。strictMode外す時は1にすること。
  const isFirstRender = useRef(1);
  //一時停止中に時間が勝手に進まないように止めた時の残り時間を入れておくための箱。
  const pausedTimeRef = useRef(null);
  //タブ閉じ時のデータを保持しておくための箱。
  const workTimeRef = useRef(workTime);
  const breakTimeRef = useRef(breakTime);
  //タブ閉じ時にstudyTimeかrestTimeどっちを保存するか判定するための箱。
  const modeRef = useRef(mode);


  //isRunningが　true => 残り時間　= 終了時刻 - 現在時刻
  //false => 停止する時に入れた時間が入る。
  const remainingTime = isRunning ? Math.max(0, Math.floor((endTime - Date.now()) / 1000)) :
    (pausedTimeRef.current ?? (mode === "work" ? workTime : breakTime));
  const beep = new Audio(beepSound);

  //useRef系だが、remainingTimeより後に書かなければバグが出るためここに書いてある。
  // タブ閉じた時のためにremainingTimeを毎秒ごとに箱に入れていく
  const remainingTimeRef = useRef(remainingTime);

  //タイマー表示の時のための変数
  const formatTime = (sec) => {
    const m = String(Math.trunc(sec / 60)).padStart(2, "0");
    const s = String(Math.trunc(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };

  //現在の経過時間をrecordsに保存する関数
  const saveTimeRecord = () => {
    const total = mode === "work" ? workTime : breakTime;
    const elapsed = total - remainingTime;
    if (elapsed <= 1) return;
    const newRecords = JSON.parse(localStorage.getItem("records")) ?? [];
    const recordDate = new Date().toLocaleDateString();
    if (mode === "work") {
      newRecords.push({ recordDate, studyTime: elapsed });
    } else {
      newRecords.push({ recordDate, restTime: elapsed });
    }
    localStorage.setItem("records", JSON.stringify(newRecords));
    setRecords(newRecords);
  }

  const handleStart = () => {
    beep.play();
    beep.pause();
    beep.currentTime = 0;
    //一時停止中に時間が勝手に進まないように止めた時の残り時間を箱に入れてる。
    setEndTime(Date.now() + remainingTime * 1000);
    //一度ユーザーの操作によって音を鳴らさせることで
    //音機能をユーザーがブラウザに対して承認してるよって教えるためのコード。
    setIsRunning(true);
  }

  const handlePause = () => {
    setIsRunning(false);
    pausedTimeRef.current = remainingTime;
    remainingTimeRef.current = remainingTime;
  }

  const handleReset = (currentMode) => {
    setIsRunning(false);
    setEndTime(
      currentMode === "work" ?
        Date.now() + workTime * 1000 :
        Date.now() + breakTime * 1000
    );
    pausedTimeRef.current = null;
    remainingTimeRef.current = null;
  }



  //保留中だったリセット/モード切替を実行する関数（内部用）
  const runPendingChange = () => {
    if (confirmAction.type === "reset") {
      handleReset(mode);
    } else if (confirmAction.type === "switchMode") {
      setMode(confirmAction.targetMode);
      setIsRunning(false);
      pausedTimeRef.current = null;
      setView("timer");
    }
    setConfirmAction(null);
  }

  //「記録する」ボタン用：保存してから実行
  const saveAndRun = () => {
    saveTimeRecord();
    runPendingChange();
  }

  //「記録しない」ボタン用：保存せず実行
  const runWithoutSaving = () => {
    runPendingChange();
  }

  const handleBeepStop = () => {
    setIsBeeping(false);
  }

  const handleMute = () => {
    setIsMute(prev => !prev)
  }

  //タブ閉じ前に「離れますか？」確認だけを出す関数（保存はまだしない）
  const handleBeforeUnload = (e) => {
    if (remainingTimeRef.current === null) return;
    if (modeRef.current === "work") {
      const studyTime = workTimeRef.current - remainingTimeRef.current;
      if (studyTime > 1) {
        //ブラウザ標準の「このページを離れますか？」確認を出す
        e.preventDefault();
        e.returnValue = "";
      }
    } else if (modeRef.current === "break") {
      const restTime = breakTimeRef.current - remainingTimeRef.current;
      if (restTime > 1) {
        //ブラウザ標準の「このページを離れますか？」確認を出す
        e.preventDefault();
        e.returnValue = "";
      }
    }
  }



  // タブを閉じる直前に実行する処理をまとめた関数
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    // クリーンアップ関数(削除しないと同じリスナーが何個も重複して使われてしまうため)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);


  //画面を更新するためのuseEffect
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);


  //時間が0になった時のモード切り替え、時間再生、勉強/休憩時間保存
  useEffect(() => {
    //タブが閉じられた時に備えてremainingTimeRef箱にstudyTime入れてる。
    remainingTimeRef.current = remainingTime;
    modeRef.current = mode;
    if (remainingTime === 0) {
      const nextMode = mode === "work" ? "break" : "work";
      setMode(nextMode);
      setIsRunning(true);
      if (nextMode === "break") {
        // ① 既存のデータを取得、?? はnullなら[]を返してという演算子。
        const newRecords = JSON.parse(
          localStorage.getItem("records")
        ) ?? [];
        // ② 新しい記録を追加
        const studyTime = workTime; // ← これが必要
        const recordDate = new Date().toLocaleDateString()
        newRecords.push(
          // recordDate: recordDate, studyTime: studyTime<=
          // 省略記法化(ショートハンドプロパティ、似てるけど分割代入とは別)
          { recordDate, studyTime }
        );
        // ③ localStorageに保存
        localStorage.setItem(
          "records", JSON.stringify(newRecords)
        );
        setRecords(newRecords);
      }
      //休憩時間の保存
      else if (nextMode === "work") {
        const newRecords = JSON.parse(localStorage.getItem("records")) ?? [];
        const restTime = breakTime;
        const recordDate = new Date().toLocaleDateString()
        newRecords.push({ recordDate, restTime });
        localStorage.setItem("records", JSON.stringify(newRecords));
        setRecords(newRecords);
      }
    }
  }, [tick]);


  //モード別の使う時間の定義。
  // レンダリング中の誤差で設定時間より1秒短く表記されるのを解決するために+1000としてる。
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current -= 1;
      return;
    }
    if (mode === "work") {
      setEndTime(Date.now() + workTime * 1000 + 1000)
    }
    else {
      setEndTime(Date.now() + breakTime * 1000 + 1000);
    }
  }, [mode]);


  //isBeepingの定義
  useEffect(() => {
    if (!isBeeping) return;
    const id = setInterval(() => {
      beep.play();
    }, 500);
    return () => {
      clearInterval(id);
    }
  }, [isBeeping])


  //modeが変わってisRunningがtrueの時のbeep音鳴らすor通知をする定義
  useEffect(() => {
    if (prevModeRef.current === "work" && mode === "break" && isRunning) {
      setIsBeeping(true);
    }
    if (prevModeRef.current === "break" && mode === "work" && isRunning) {
      setIsBeeping(true);
      if (Notification.permission === "granted") {
        new Notification("休憩時間が終わりました");
      }
    }
    //次回のレンダリング時のために、前回のmodeを箱に手動で入れ直してやってる。
    prevModeRef.current = mode;
  }, [mode, isRunning]);


  //ボリューム0かブラウンノイズボタンOFFでなく時間動いてないかbreak時にブラウンノイズポーズして、
  // そうじゃないならブラウンノイズ流してってuseEffect
  useEffect(() => {
    const brown = brownRef.current;
    brownRef.current.volume = brownVolume;
    if (isMute === true || brownVolume === 0 || !isRunning || mode !== "work") {
      brown.pause();
      brown.currentTime = 0;
      return;
      //停止 & 音源の最初に戻す処理
    }
    brown.play();
  }, [isMute, brownVolume, isRunning, mode]);


  //通知を使う許可の取得(初回のみ)
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);



  //円形プログレスバー用の計算（半径・円周・経過割合）
  const RING_RADIUS = 128;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const currentTotalTime = mode === "work" ? workTime : breakTime;
  const progressRatio = currentTotalTime > 0 ? (currentTotalTime - remainingTime) / currentTotalTime : 0;

  //work/break共通のタイマー画面。panelModeで色や使う時間を切り替える。
  const renderTimerPanel = (panelMode) => {
    const isWork = panelMode === "work";
    const title = isWork ? "workTime" : "breakTime";
    const icon = isWork ? workIcon : breakIcon;
    const subtitleText = isWork ? "Focus Study for myself" : "Focus break for myself";
    const time = isWork ? workTime : breakTime;
    const setTime = isWork ? setWorkTime : setBreakTime;
    const timeRef = isWork ? workTimeRef : breakTimeRef;

    const hex = isWork ? "#ef4444" : "#22c55e";
    const textColorClass = isWork ? "text-red-500" : "text-green-500";
    const glowStyle = isWork
      ? { filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }
      : { filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" };
    const sliderThumbClasses = isWork
      ? "[&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444] [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444]"
      : "[&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e] [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e]";

    return (
      <div>
        {/* title */}
        <h1>DeepFocus</h1>
        <h1>{title}</h1>

        {/* subtitleCard */}
        <div>
          <img className="w-16 h-16" src={icon} />
          <div>{subtitleText}</div>
        </div>

        {/*時間設定できるようにするインターフェイス*/}
        <div className="relative w-80 h-80 flex items-center justify-center mx-auto">
          <svg className="absolute inset-0 -rotate-90" width="320" height="320" viewBox="0 0 320 320">
            <circle cx="160" cy="160" r={RING_RADIUS} fill="none" stroke="#3f3f46" strokeWidth="10" />
            <circle
              cx="160" cy="160" r={RING_RADIUS}
              fill="none"
              stroke={hex}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressRatio)}
              style={glowStyle}
            />
          </svg>
          {isEditing ? (
            <input
              className="z-10 text-4xl text-center w-28"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => {
                const [m, s] = inputValue.split(":").map(Number);
                const msTotal = (m || 0) * 60 + (s || 0)
                setTime(msTotal);
                setEndTime(Date.now() + msTotal * 1000);
                setIsEditing(false);
                timeRef.current = msTotal;
              }}
            />
          ) : (
            <span className="z-10 text-5xl font-bold" onClick={() => {
              setIsRunning(false);
              setInputValue(formatTime(remainingTime));
              setIsEditing(true);
            }}>
              {String(Math.trunc(remainingTime / 60)).padStart(2, "0")}:
              {String(Math.trunc(remainingTime % 60)).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* 再生ボタンと一時停止ボタンとリセットボタン */}
        <div className="flex items-center justify-center gap-6 mt-2">
          {!isRunning ?
            <button className={`${textColorClass} cursor-pointer`} onClick={((event) => {
              event.stopPropagation();
              handleStart();
            })}>
              <Play size={40} style={glowStyle} />
            </button> :

            <button className={`${textColorClass} cursor-pointer`} onClick={(() => {
              handlePause();
            })}>
              <Pause size={40} style={glowStyle} />
            </button>
          }

          <button className={`${textColorClass} cursor-pointer`} onClick={(() => {
            const elapsed = time - remainingTime;
            if (elapsed <= 1) {
              handleReset(panelMode);
            } else {
              setConfirmAction({ type: "reset" });
            }
          })}>
            <Square size={36} style={glowStyle} />
          </button>

          {/*/ブラウンノイズボリューム調整アイコン justifyは横、itemsは縦 */}
          {/* group-hover:が必要なのは変化するものだけ */}
          <div className="group flex items-center gap-2">
            {/* 音アイコン */}
            <button
              onClick={handleMute}
              className={`${textColorClass} cursor-pointer`}>
              {isMute ?
                <VolumeX size={36} style={glowStyle} /> :
                <Volume2 size={36} style={glowStyle} />
              }
            </button>
            {/* ブラウンノイズのボリューム調整のスライダー */}
            <input
              className={`w-0 opacity-0
              group-hover:opacity-100
              group-hover:w-28
              transition-all duration-800
              appearance-none cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
              [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
              [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none
              ${sliderThumbClasses}`}
              style={{ background: `linear-gradient(to right, ${hex} ${brownVolume * 100}%, #3f3f46 ${brownVolume * 100}%)` }}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brownVolume}
              onChange={(e) => setBrownVolume(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    );
  };


  //ここからタブのための機能⬇
  // それぞれのネオンタブの色の指定
  const WORK_TAB_NEON = "border-red-500 shadow-[0_6px_10px_-4px_#ef4444] [text-shadow:0_0_6px_#ef4444,0_0_12px_#ef4444]";
  const BREAK_TAB_NEON = "border-green-500 shadow-[0_6px_10px_-4px_#22c55e] [text-shadow:0_0_6px_#22c55e,0_0_12px_#22c55e]";
  const DASHBOARD_TAB_NEON = "border-blue-500 shadow-[0_6px_10px_-4px_#3b82f6] [text-shadow:0_0_6px_#3b82f6,0_0_12px_#3b82f6]";
  const PRACTICE_TAB_NEON = "border-yellow-500 shadow-[0_6px_10px_-4px_#eab308] [text-shadow:0_0_6px_#eab308,0_0_12px_#eab308]";

  //上記4つのタブで同じ見た目を使い回すため、クラス名づくりを1か所にまとめる
  const getNeonTabClassName = (isSelected, neonClassName) => {
    const baseClassName = "w-1/4 py-3 border-b-2 font-bold cursor-pointer transition-all duration-300";
    if (isSelected) return `${baseClassName} border-transparent bg-neutral-800 text-neutral-500`;
    return `${baseClassName} ${neonClassName}`;
  };
  //タブが選ばれているか。workとbreakはタイマー画面にいるときだけ選ばれている扱い
  const isWorkTabSelected = mode === "work" && view === "timer";
  const isBreakTabSelected = mode === "break" && view === "timer";
  const isDashboardTabSelected = view === "dashBoard";
  const isPracticeTabSelected = view === "practice";
  //ここまでタブのための機能⬆


  return (
    <div className="background min-h-screen bg-neutral-950 text-white" onClick={() => { handleBeepStop() }}>
      {/* navタグはWebページ内で他のページやページ内の主要な場所へ移動するためのタグ */}
      <nav className='flex border-b border-neutral-800'>
        <button onClick={() => {
          if (mode !== "work") {
            const elapsed = breakTime - remainingTime;
            if (elapsed <= 1) {
              setMode("work");
              setIsRunning(false);
              pausedTimeRef.current = null;
            } else {
              setConfirmAction({ type: "switchMode", targetMode: "work" });
            }
          }
          setView("timer");
        }}
          className={getNeonTabClassName(isWorkTabSelected, WORK_TAB_NEON)}
        >workTime</button>
        <button onClick={() => {
          if (mode !== "break") {
            const elapsed = workTime - remainingTime;
            if (elapsed <= 1) {
              setMode("break");
              setIsRunning(false);
              pausedTimeRef.current = null;
            } else {
              setConfirmAction({ type: "switchMode", targetMode: "break" });
            }
          }
          setView("timer")
        }}
          className={getNeonTabClassName(isBreakTabSelected, BREAK_TAB_NEON)}
        >breakTime</button>

        <button onClick={() => {
          setView("dashBoard");
        }}

          className={getNeonTabClassName(isDashboardTabSelected, DASHBOARD_TAB_NEON)}
        >dashBoard</button>

        <button onClick={() => {
          setView("practice");
        }}
          className={getNeonTabClassName(isPracticeTabSelected, PRACTICE_TAB_NEON)}
        >practice</button>

      </nav>

      {
        view === "timer" && (
          <>
            {mode === "work" && renderTimerPanel("work")}
            {mode === "break" && renderTimerPanel("break")}
          </>
        )
      }

      {view === "practice" && <div className="p-6"><Practice /></div>}
      {confirmAction && (
        <ConfirmDialog
          mode={mode}
          onSave={saveAndRun}
          onSkip={runWithoutSaving}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {view === "dashBoard" &&
        <Dashboard records={records} />
      }

    </div >


  )
}
export default App
