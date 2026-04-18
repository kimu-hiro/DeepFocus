import { useState, useEffect } from 'react'
import workIcon from "./assets/workIcon.png"
import breakIcon from "./assets/breakIcon.png"
import './index.css'


function App() {
  const [time, setTime] = useState(5);
  const workTimeSec = 5;
  const breakTimeSec = 5;
  //intが返る。
  const [isRunning, setIsRunning] = useState(false);
  //booleanが返る。初期値設定すること。１敗。
  const [mode, setMode] = useState("work");
  //work,breakを切り替える。
  const [view, setView] = useState("timer");
  //timer, dashboardを切り替える。
  const minutesMaterial = Math.trunc(time / 60);
  const secondsMaterial = time % 60;
  const minutes = String(minutesMaterial).padStart(2, "0");
  const seconds = String(secondsMaterial).padStart(2, "0");


  const handleStart = () => {
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
        setIsRunning(false);
        setMode("break");
      }
      else {
        setIsRunning(true);
        setMode("work");
      }
    }
  }, [time]);

  useEffect(() => {
    if (mode === "work") {
      setTime(workTimeSec)
    }
    else {
      setTime(breakTimeSec);
      setIsRunning(true)
    }
  }, [mode]);


  return (
    <>
      <button onClick={() => { setMode("work") }}
        className="mode === work ? bg-red-500"
      >workTime</button>
      <button onClick={() => { setMode("break") }}>breakTime</button>
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
        <button className="text-4xl" onClick={(() => {
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
    </>
  )
}

export default App
