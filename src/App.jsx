import { useState, useEffect, useRef } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import beepSound from "./assets/beepSound.mp3"
import brownNoise from "./assets/brownNoise.mp3"
import './index.css'


function App() {
  //設定時間（秒） ユーザーが設定した作業時間/休憩時間
  const [workTime, setWorkTime] = useState(25 * 60);
  const [breakTime, setBreakTime] = useState(10 * 60);

  //終了時刻（ミリ秒） 「今から何秒後に終わるか」をミリ秒で持っている
  const [endTime, setEndTime] = useState(Date.now() + workTime * 1000 + 1000);
  //booleanが返る。初期値設定すること。１敗。
  const [isRunning, setIsRunning] = useState(false);
  //work,breakを切り替える。
  const [mode, setMode] = useState("work");
  //timer, dashboardを切り替える。
  const [view, setView] = useState("timer");
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
  console.log("remainingTimeRef初期値:", remainingTimeRef.current);

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
  }

  const handleBeepStop = () => {
    setIsBeeping(false);
  }

  const handleMute = () => {
    setIsMute(prev => !prev)
  }

  //タブ閉じ前にデータを取得、追加、保存する関数
  const handleBeforeUnload = () => {
    console.log("handleBeforeUnload発火!!");
    localStorage.setItem("test", "発火した！"); // ← 追加
    const studyTime = workTimeRef.current - remainingTimeRef.current;
    if (mode === "work" && studyTime > 0) {
      // ① 既存のデータを取得、?? はnullなら[]を返してという演算子。
      const records = JSON.parse(
        localStorage.getItem("records")
      ) ?? [];
      // ② 新しい記録を追加
      const recordDate = new Date().toLocaleDateString()
      records.push(
        // recordDate: recordDate, studyTime: studyTime<=
        // 省略記法化(ショートハンドプロパティ、似てるけど分割代入とは別)
        { recordDate, studyTime }
      );
      // ③ localStorageに保存
      localStorage.setItem(
        "records", JSON.stringify(records)
      );
    }
    remainingTimeRef.current = remainingTime;
  };


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


  //時間が0になった時のモード切り替え、時間再生、勉強時間保存
  useEffect(() => {
    //タブが閉じられた時に備えてremainingTimeRef箱にstudyTime入れてる。
    remainingTimeRef.current = remainingTime;
    if (remainingTime === 0) {
      const nextMode = mode === "work" ? "break" : "work";
      setMode(nextMode);
      setIsRunning(true);
      if (nextMode === "break") {
        // ① 既存のデータを取得、?? はnullなら[]を返してという演算子。
        const records = JSON.parse(
          localStorage.getItem("records")
        ) ?? [];
        // ② 新しい記録を追加
        const studyTime = workTime; // ← これが必要
        const recordDate = new Date().toLocaleDateString()
        records.push(
          // recordDate: recordDate, studyTime: studyTime<=
          // 省略記法化(ショートハンドプロパティ、似てるけど分割代入とは別)
          { recordDate, studyTime }
        );
        // ③ localStorageに保存
        localStorage.setItem(
          "records", JSON.stringify(records)
        );
      }
    }
    else {
      return;
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




  return (
    <div className="background" onClick={() => { handleBeepStop() }}>
      <button onClick={() => {
        setMode("work");
        setIsRunning(false);
        pausedTimeRef.current = null;
      }}
        className={mode === "work" ? "bg-gray-200" : "bg-red-500"}
      >workTime</button>
      <button onClick={() => {
        setMode("break");
        setIsRunning(false);
        pausedTimeRef.current = null;
      }}
        className={mode === "break" ? "bg-gray-200" : "bg-green-500"}
      >breakTime</button>

      <button onClick={() => {
        setView("dashBoard")
      }}
        className={view === "time" ? "bg-blue-500" : "bg-gray-200"}
      >dashBoard</button>
      {mode === "work" && <div>
        {/* title */}
        <h1>PomodoroTimer</h1>


        <h1>workTime</h1>

        {/* subtitleCard */}
        <div>
          <img className="w-16 h-16" src={workIcon} />
          <div>Focus Study for myself</div>
        </div>

        {/*workMode中ユーザーが時間設定できるようにするインターフェイス*/}
        {isEditing ? (
          <input
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
          <span onClick={() => {
            setIsRunning(false);
            setInputValue(formatTime(remainingTime));
            setIsEditing(true);
          }}>
            {String(Math.trunc(remainingTime / 60)).padStart(2, "0")}:
            {String(Math.trunc(remainingTime % 60)).padStart(2, "0")}
          </span>
        )}

        {/* 再生ボタンと一時停止ボタン */}
        {!isRunning ?
          <button className="text-xl" onClick={((event) => {
            event.stopPropagation();
            handleStart();
          })}>再生</button> :

          <button className="text-xl" onClick={(() => {
            handlePause(remainingTime);
          })}>一時停止</button>
        }

        <br />
        <button className="text-xl" onClick={(() => {
          handleReset("work");
        })}>リセット</button>

        {/*/ブラウンノイズボリューム調整アイコン justifyは横、itemsは縦 */}
        <div className="group flex items-center gap-2">
          {/* 音アイコン */}
          <button
            onClick={handleMute}
            className="cursor-pointer">
            {isMute ? "🔇" : "🔊"}
          </button>
          {/* ブラウンノイズのボリューム調整のスライダー */}
          <input
            className="w-0 opacity-0
            group-hover:opacity-100 
            group-hover:w-24
            // group-hover:が必要なのは変化するものだけ
            transition-all duration-300"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={brownVolume}
            onChange={(e) => setBrownVolume(Number(e.target.value))}
          />
        </div>
      </div>

      }{
        mode === "break" && <div>
          {/* ここにbreak時の画面を描く */}
          <h1>pomodoroTimer</h1>
          <h1>breakTime</h1>
          <div>
            <img className="w-16 h-16" src={breakIcon} />
            <div>Focus break for myself</div>
          </div>

          {/*breakMode中ユーザーが時間設定できるようにするインターフェイス*/}
          {isEditing ? (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => {
                const [m, s] = inputValue.split(":").map(Number);
                const msTotal = (m || 0) * 60 + (s || 0)
                setBreakTime(msTotal);
                setEndTime(Date.now() + msTotal * 1000);
                setIsEditing(false);
              }}
            />
          ) : (
            <span onClick={() => {
              setIsRunning(false);
              setInputValue(formatTime(remainingTime));
              setIsEditing(true);
            }}>
              {String(Math.trunc(remainingTime / 60)).padStart(2, "0")}:
              {String(Math.trunc(remainingTime % 60)).padStart(2, "0")}
            </span>
          )}

          {/* 再生ボタンと一時停止ボタン */}
          {!isRunning ?
            <button className="text-xl" onClick={((event) => {
              event.stopPropagation();
              handleStart();
            })}>再生</button> :

            <button className="text-xl" onClick={(() => {
              handlePause(remainingTime);
            })}>一時停止</button>
          }

          <br />
          <button className="text-xl" onClick={(() => {
            handleReset("break");
          })}>リセット</button>


          {/* ブラウンノイズのボリューム調整のスライダー */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={brownVolume}
            onChange={(e) => setBrownVolume(Number(e.target.value))}
          />
        </div>
      }
    </div >
  )
}
export default App
