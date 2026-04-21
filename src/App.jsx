import { useState, useEffect } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import beepSound from "./assets/beepSound.mp3"
import './index.css'


function App() {
  const [time, setTime] = useState(5);
  const workTimeSec = 8;
  const breakTimeSec = 5;
  //intが返る。
  const [isRunning, setIsRunning] = useState(false);
  //booleanが返る。初期値設定すること。１敗。
  const [mode, setMode] = useState("work");
  //work,breakを切り替える。
  const [view, setView] = useState("timer");
  //timer, dashboardを切り替える。
  const [isBeeping, setIsBeeping] = useState(false);
  //Beep音が鳴っているかどうかの状態管理。
  const minutesMaterial = Math.trunc(time / 60);
  const secondsMaterial = time % 60;
  const minutes = String(minutesMaterial).padStart(2, "0");
  const seconds = String(secondsMaterial).padStart(2, "0");
  const beep = new Audio(beepSound);

  const handleStart = () => {
    beep.play();
    beep.pause();
    beep.currentTime = 0;
    //上記のコードは一度ユーザー操作によって音を鳴らさせることで
    //音機能をユーザーがブラウザに承認してるよって教えるためのコード。

    setIsRunning(true);
  }
  const handlePause = () => {
    setIsRunning(false);
  }
  const handleReset = () => {
    setIsRunning(false);
    setTime(
      mode === "work" ? workTimeSec : breakTimeSec
    )
  }
  const handleBeepStop = () => {
    setIsBeeping(false);
  }






  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTime(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (time <= 0) {
      if (mode === "work") {
        setMode("break");
      }
      else {
        setMode("work");
      }
    }
  }, [time]);

  useEffect(() => {
    if (time === 0) {
      setIsRunning(true);
    }
    else {
      return;
    }
  }, [time])

  useEffect(() => {
    if (mode === "work") {
      setTime(workTimeSec)
    }
    else {
      setTime(breakTimeSec);
    }
  }, [mode]);

  useEffect(() => {
    if (!isBeeping) return;
    //バリデーション
    const id = setInterval(() => {
      beep.play();
    }, 500);

    return () => {
      clearInterval(id);
    }
  }, [isBeeping])
  //isBeepingの鳴っている時と鳴っていない時の定義

  useEffect(() => {
    if (time <= 0) {
      setIsBeeping(true);
    }
    return;
  }, [time])

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
        <button className="text-4xl" onClick={((event) => {
          event.stopPropagation();
          handleStart();
        })}>▶️</button>
        <button className="text-4xl" onClick={(() => {
          handlePause(time);
        })}>⏸️</button>
        <br />
        <br />
        <button className="text-4xl" onClick={(() => {
          handleReset();
        })}>🔁</button>
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
        <button className="text-4xl" onClick={(() => {
          setIsRunning(true);
        })} >▶️</button>
        <button className='text-4xl' onClick={(() => {
          setIsRunning(false);
        })}>⏸️</button>
        <br />
        <br />
        <button className="text-4xl" onClick={(() => {
          handleReset();
        })}>🔁</button>
      </div>
      }
    </div>
  )
}

export default App
