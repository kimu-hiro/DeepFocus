import { useState, useEffect, useRef } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import beepSound from "./assets/beepSound.mp3"
import brownNoise from "./assets/brownNoise.mp3"
import './index.css'


function App() {

  const exWorkTimeSec = 10;
  const exBreakTimeSec = 5;
  const workTimeSec = 2500;
  const breakTimeSec = 300;

  //intが返る。
  const [time, setTime] = useState(exWorkTimeSec);
  //booleanが返る。初期値設定すること。１敗。
  const [isRunning, setIsRunning] = useState(false);
  //work,breakを切り替える。
  const [mode, setMode] = useState("work");
  //timer, dashboardを切り替える。
  const [view, setView] = useState("timer");
  //Beep音が鳴っているかどうかの状態管理。
  const [isBeeping, setIsBeeping] = useState(false);
  //ブラウンノイズが流れるかどうかの状態管理。
  const [isNoiseEnabled, setIsNoiseEnabled] = useState(true);


  const minutesMaterial = Math.trunc(time / 60);
  const secondsMaterial = time % 60;
  const minutes = String(minutesMaterial).padStart(2, "0");
  const seconds = String(secondsMaterial).padStart(2, "0");
  const beep = new Audio(beepSound);
  const brownRef = useRef(new Audio(brownNoise));
  const prevModeRef = useRef(mode);


  const handleStart = () => {
    beep.play();
    beep.pause();
    beep.currentTime = 0;
    //一度ユーザーの操作によって音を鳴らさせることで
    //音機能をユーザーがブラウザに対して承認してるよって教えるためのコード。
    setIsRunning(true);
    setIsNoiseEnabled(true);
  }
  const handlePause = () => {
    setIsRunning(false);
    setIsNoiseEnabled(false);
  }
  const handleReset = () => {
    setIsRunning(false);
    setTime(
      mode === "work" ? exWorkTimeSec : exBreakTimeSec
    )
  }
  const handleBeepStop = () => {
    setIsBeeping(false);
  }
  const handleNoise = () => {
    setIsNoiseEnabled(prev => !prev);
  }





  //再生中の時間定義
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTime(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  //時間が0になった時のモード定義
  useEffect(() => {
    if (time <= 0) {
      const nextMode = mode === "work" ? "break" : "work";
      setMode(nextMode);
    }
  }, [time]);

  //時間が0になった時の再生定義
  useEffect(() => {
    if (time === 0) {
      setIsRunning(true);
    }
    else {
      return;
    }
  }, [time])


  //モード別の使う時間の定義
  useEffect(() => {
    if (mode === "work") {
      setTime(exWorkTimeSec);
    }
    else {
      setTime(exBreakTimeSec);
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


  //modeが変わってTimeが0になった時のbeep音鳴らすor通知をする定義
  useEffect(() => {

    if (prevModeRef.current == "work" && mode == "break" && time <= 0) {
      setIsBeeping(true);
    }
    if (prevModeRef.current == "break" && mode == "work" && time <= 0) {
      if (Notification.permission === "granted") {
        new Notification("休憩時間がが終わりました");
      }
    }
    //次回のレンダリング時のために、前回のmodeを箱に手動で入れ直してやってる。
    prevModeRef.current = mode;
  }, [mode]);


  //ブラウンノイズボタンOFFでなく、時間動いてなくて、break時の定義
  useEffect(() => {
    const brown = brownRef.current;
    if (!isNoiseEnabled || !isRunning || mode !== "work") {
      brown.pause();
      brown.currentTime = 0;
      return;
      //停止 & 音源の最初に戻す処理
    }
    brown.play();
  }, [isNoiseEnabled, isRunning, mode]);


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
      }}
        className={mode === "work" ? "bg-gray-200" : "bg-red-500"}
      >workTime</button>
      <button onClick={() => {
        setMode("break");
        setIsRunning(false);
      }}
        className={mode === "break" ? "bg-gray-200" : "bg-green-500"}
      >breakTime</button>
      <button onClick={() => { setView("dashBoard") }}>dashBoard</button>
      {mode === "work" && <div>
        {/* title */}
        <h1>PomodoroTimer</h1>
        <h1>workTime</h1>
        {/* subtitleCard */}
        <div>
          <img className="w-16 h-16" src={workIcon} />
          <div>Focus Study for myself</div>
        </div>

        {/*timer*/}
        {minutes}:{seconds}
        <button className="text-xl" onClick={((event) => {
          event.stopPropagation();
          handleStart();
        })}>再生</button>
        <button className="text-xl" onClick={(() => {
          handlePause(time);
        })}>一時停止</button>
        <br />
        <br />
        <button className="text-xl" onClick={(() => {
          handleReset();
        })}>停止</button>
        <button className="text-xl" onClick={handleNoise}>{
          isNoiseEnabled ? "noiseOff" : "noiseOn"
        }</button>

      </div>}
      {mode === "break" && <div>
        {/* ここにbreak時の画面を描く */}
        <h1>pomodoroTimer</h1>
        <h1>breakTime</h1>
        <div>
          <img className="w-16 h-16" src={breakIcon} />
          <div>Focus break for myself</div>
        </div>
        {minutes}:{seconds}
        <button className="text-xl" onClick={(() => {
          setIsRunning(true);
        })} >再生</button>
        <button className='text-xl' onClick={(() => {
          setIsRunning(false);
        })}>一時停止</button>
        <br />
        <br />
        <button className="text-xl" onClick={(() => {
          handleReset();
        })}>停止</button>
        <button className="text-xl" onClick={handleNoise}>{isNoiseEnabled ? "noiseOff" : "noiseOn"}</button>
      </div>
      }
    </div>
  )
}

export default App
