import { useState, useEffect, useRef } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import beepSound from "./assets/beepSound.mp3"
import brownNoise from "./assets/brownNoise.mp3"
import './index.css'
import Practice from './Practice.jsx'
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react"
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
  const minutesMaterial = Math.trunc(remainingTime / 60);
  const secondsMaterial = remainingTime % 60;
  const minutes = String(minutesMaterial).padStart(2, "0");
  const seconds = String(secondsMaterial).padStart(2, "0");
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
    // ブラウザに「タブを閉じる直前にhandleBeforeUnloadを実行して」と登録する
    window.addEventListener('beforeunload', handleBeforeUnload);
    // useEffectが再実行される直前に古いリスナーを削除する(クリーンアップ関数)
    // 削除しないと同じリスナーが何個も重複して使われてしまうため
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // これらが変わるたびにremainingTimeRefを箱に入れ直す。


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
    else { }
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
        new Notification("休憩時間がが終わりました");
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


  //総学習時間・総休憩時間の集計（recordsから毎回計算する値なのでstateにはしない）
  const totalStudyTime = records
    .filter((record) => record.studyTime !== undefined)
    .reduce((sum, record) => sum + record.studyTime, 0);
  const totalRestTime = records
    .filter((record) => record.restTime !== undefined)
    .reduce((sum, record) => sum + record.restTime, 0);

  //円形プログレスバー用の計算（半径・円周・経過割合）
  const RING_RADIUS = 128;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const currentTotalTime = mode === "work" ? workTime : breakTime;
  const progressRatio = currentTotalTime > 0 ? (currentTotalTime - remainingTime) / currentTotalTime : 0;


  return (
    <div className="background min-h-screen bg-neutral-950 text-white" onClick={() => { handleBeepStop() }}>

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
        className={mode === "work" && view === "timer" ? "bg-gray-700" : "bg-red-500"}
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
        className={mode === "break" && view === "timer" ? "bg-gray-700" : "bg-green-500"}
      >breakTime</button>

      <button onClick={() => {
        setView("dashBoard");
      }}

        className={view === "dashBoard" ? "bg-gray-700" : "bg-blue-500"}
      >dashBoard</button>

      <button onClick={() => {
        setView("practice");
      }}
        className={view === "practice" ? "bg-gray-700" : "bg-yellow-500"}
      >practice</button>

      {view === "timer" && (
        <>
          {mode === "work" && <div>
            {/* title */}
            <h1>DeepFocus</h1>


            <h1>workTime</h1>

            {/* subtitleCard */}
            <div>
              <img className="w-16 h-16" src={workIcon} />
              <div>Focus Study for myself</div>
            </div>

            {/*workMode中ユーザーが時間設定できるようにするインターフェイス*/}
            <div className="relative w-80 h-80 flex items-center justify-center mx-auto">
              <svg className="absolute inset-0 -rotate-90" width="320" height="320" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r={RING_RADIUS} fill="none" stroke="#3f3f46" strokeWidth="10" />
                <circle
                  cx="160" cy="160" r={RING_RADIUS}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressRatio)}
                  style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }}
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
                    setWorkTime(msTotal);
                    setEndTime(Date.now() + msTotal * 1000);
                    setIsEditing(false);
                    workTimeRef.current = msTotal;
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
                <button className="text-red-500 cursor-pointer" onClick={((event) => {
                  event.stopPropagation();
                  handleStart();
                })}>
                  <Play size={40} style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }} />
                </button> :

                <button className="text-red-500 cursor-pointer" onClick={(() => {
                  handlePause(remainingTime);
                })}>
                  <Pause size={40} style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }} />
                </button>
              }

              <button className="text-red-500 cursor-pointer" onClick={(() => {
                const elapsed = workTime - remainingTime;
                if (elapsed <= 1) {
                  handleReset("work");
                } else {
                  setConfirmAction({ type: "reset" });
                }
              })}>
                <Square size={36} style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }} />
              </button>

              {/*/ブラウンノイズボリューム調整アイコン justifyは横、itemsは縦 */}
              {/* group-hover:が必要なのは変化するものだけ */}
              <div className="group flex items-center gap-2">
                {/* 音アイコン */}
                <button
                  onClick={handleMute}
                  className="text-red-500 cursor-pointer">
                  {isMute ?
                    <VolumeX size={36} style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }} /> :
                    <Volume2 size={36} style={{ filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }} />
                  }
                </button>
                {/* ブラウンノイズのボリューム調整のスライダー */}
                <input
                  className="w-0 opacity-0
                  group-hover:opacity-100
                  group-hover:w-28
                  transition-all duration-800
                  appearance-none cursor-pointer
                  [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444]
                  [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
                  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444]"
                  style={{ background: `linear-gradient(to right, #ef4444 ${brownVolume * 100}%, #3f3f46 ${brownVolume * 100}%)` }}
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

          }{
            mode === "break" && <div>
              {/* ここにbreak時の画面を描く */}
              <h1>DeepFocus</h1>
              <h1>breakTime</h1>
              <div>
                <img className="w-16 h-16" src={breakIcon} />
                <div>Focus break for myself</div>
              </div>

              {/*breakMode中ユーザーが時間設定できるようにするインターフェイス*/}
              <div className="relative w-80 h-80 flex items-center justify-center mx-auto">
                <svg className="absolute inset-0 -rotate-90" width="320" height="320" viewBox="0 0 320 320">
                  <circle cx="160" cy="160" r={RING_RADIUS} fill="none" stroke="#3f3f46" strokeWidth="10" />
                  <circle
                    cx="160" cy="160" r={RING_RADIUS}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressRatio)}
                    style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }}
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
                      setBreakTime(msTotal);
                      setEndTime(Date.now() + msTotal * 1000);
                      setIsEditing(false);
                      breakTimeRef.current = msTotal;
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
                  <button className="text-green-500 cursor-pointer" onClick={((event) => {
                    event.stopPropagation();
                    handleStart();
                  })}>
                    <Play size={40} style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }} />
                  </button> :

                  <button className="text-green-500 cursor-pointer" onClick={(() => {
                    handlePause();
                  })}>
                    <Pause size={40} style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }} />
                  </button>
                }

                <button className="text-green-500 cursor-pointer" onClick={(() => {
                  const elapsed = breakTime - remainingTime;
                  if (elapsed <= 1) {
                    handleReset("break");
                  } else {
                    setConfirmAction({ type: "reset" });
                  }
                })}>
                  <Square size={36} style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }} />
                </button>

                {/*/ブラウンノイズボリューム調整アイコン justifyは横、itemsは縦 */}
                {/* group-hover:が必要なのは変化するものだけ */}
                <div className="group flex items-center gap-2">
                  {/* 音アイコン */}
                  <button
                    onClick={handleMute}
                    className="text-green-500 cursor-pointer">
                    {isMute ?
                      <VolumeX size={36} style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }} /> :
                      <Volume2 size={36} style={{ filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" }} />
                    }
                  </button>
                  {/* ブラウンノイズのボリューム調整のスライダー */}
                  <input
                    className="w-0 opacity-0
            group-hover:opacity-100
            group-hover:w-28
            transition-all duration-800
            appearance-none cursor-pointer
            [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e]
            [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
            [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e]"
                    style={{ background: `linear-gradient(to right, #22c55e ${brownVolume * 100}%, #3f3f46 ${brownVolume * 100}%)` }}
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
          }
        </>
      )}
      {view === "dashBoard" && <div className="p-6">
        <h2 className="text-xl font-bold mb-4">ダッシュボード</h2>
        <div className="flex gap-12">
          <div>
            <h3 className="font-bold mb-2">学習時間</h3>
            <p className="mb-3">
              総学習時間 : {Math.floor(totalStudyTime / 3600)}時間{Math.floor((totalStudyTime % 3600) / 60)}分{totalStudyTime % 60}秒
            </p>
            <div className="space-y-1">
              {records
                .filter((record) => record.studyTime !== undefined)
                // recordsはstate本体なので直接reverseすると壊れる。
                // sliceでコピーを作ってから、コピーの方をreverseしてる。
                // records自体は追加された順（古い→新しい）に並んでるので、
                // 逆順にするだけで新しい記録が上に来る。
                .slice()
                .reverse()
                .map((record, index) => (
                  <div key={index}>
                    {record.recordDate} : {Math.floor(record.studyTime / 60)}分{Math.floor(record.studyTime % 60)}秒
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">休憩時間</h3>
            <p className="mb-3">
              総休憩時間 : {Math.floor(totalRestTime / 3600)}時間{Math.floor((totalRestTime % 3600) / 60)}分{totalRestTime % 60}秒
            </p>
            <div className="space-y-1">
              {records
                .filter((record) => record.restTime !== undefined)
                // 学習時間側と同じ理由でコピーしてからreverseしてる。
                .slice()
                .reverse()
                .map((record, index) => (
                  <div key={index}>
                    {record.recordDate} : {Math.floor(record.restTime / 60)}分{Math.floor(record.restTime % 60)}秒
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>}
      {view === "practice" && <div className="p-6"><Practice /></div>}

      {
        confirmAction && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded shadow-lg flex flex-col gap-3 max-w-xs text-gray-800">
              <p>
                今までの{mode === "work" ? "集中" : "休憩"}時間を記録しますか？
              </p>
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                onClick={saveAndRun}
              >これまでの{mode === "work" ? "集中" : "休憩"}時間を記録する</button>
              <button
                className="px-4 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400 cursor-pointer"
                onClick={runWithoutSaving}
              >これまでの{mode === "work" ? "集中" : "休憩"}時間を記録しない</button>
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                onClick={() => setConfirmAction(null)}
              >戻る</button>
            </div>
          </div>
        )
      }
    </div >


  )
}
export default App
