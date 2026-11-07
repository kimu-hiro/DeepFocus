import { useState, useEffect, useRef } from 'react'
import beepSound from "./assets/beepSound.mp3"
import brownNoise from "./assets/brownNoise.mp3"
import './index.css'
import Practice from './Practice.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import Dashboard from './components/Dashboard.jsx'
import TabBar from './components/TabBar.jsx'
import TimerPanel from './components/TimerPanel.jsx'

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
  const [pendingAction, setPendingAction] = useState(null);


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
  const runPendingAction = () => {
    if (pendingAction.type === "reset") {
      handleReset(mode);
    } else if (pendingAction.type === "switchMode") {
      setMode(pendingAction.targetMode);
      setIsRunning(false);
      pausedTimeRef.current = null;
      setView("timer");
    }
    setPendingAction(null);
  }

  //「記録する」ボタン用：保存してから実行
  const saveAndRun = () => {
    saveTimeRecord();
    runPendingAction();
  }

  //「記録しない」ボタン用：保存せず実行
  const runWithoutSaving = () => {
    runPendingAction();
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



  //今のモードの設定時間（タブ・リセット・円形プログレスバーで使う）
  const currentTotalTime = mode === "work" ? workTime : breakTime;
  //タブでwork/breakを切り替える。
  //途中まで進んでいたら、記録するか確認を出す
  const handleTabClick = (targetMode) => {
    setView("timer");
    if (mode === targetMode) return;
    const elapsed = currentTotalTime - remainingTime;
    if (elapsed > 1) {
      setPendingAction({
        type: "switchMode",
        targetMode: targetMode,
      });
      return;
    }
    setMode(targetMode);
    setIsRunning(false);
    pausedTimeRef.current = null;
  };

  //リセットボタン。
  //途中まで進んでいたら、記録するか確認を出す
  const handleResetClick = () => {
    const elapsed = currentTotalTime - remainingTime;
    if (elapsed > 1) {
      setPendingAction({ type: "reset" });
      return;
    }
    handleReset(mode);
  };

  //タイマーの数字を打ち直したときに、設定時間を変える
  const handleTimeSet = (newTotalSeconds) => {
    if (mode === "work") {
      setWorkTime(newTotalSeconds);
      workTimeRef.current = newTotalSeconds;
    } else {
      setBreakTime(newTotalSeconds);
      breakTimeRef.current = newTotalSeconds;
    }
    setEndTime(Date.now() + newTotalSeconds * 1000);
  };


  return (
    <div className="background min-h-screen bg-neutral-950 text-white" onClick={() => { handleBeepStop() }}>
      <TabBar
        mode={mode}
        view={view}
        onTimerTabClick={handleTabClick}
        onViewChange={setView}
      />

      {view === "timer" && (
        <TimerPanel
          mode={mode}
          remainingTime={remainingTime}
          totalTime={currentTotalTime}
          isRunning={isRunning}
          onStart={handleStart}
          onPause={handlePause}
          onResetClick={handleResetClick}
          onEditStart={() => setIsRunning(false)}
          onTimeSet={handleTimeSet}
          isMute={isMute}
          onMuteToggle={handleMute}
          brownVolume={brownVolume}
          onBrownVolumeChange={setBrownVolume}
        />
      )}

      {view === "practice" && <div className="p-6"><Practice /></div>}
      {pendingAction && (
        <ConfirmDialog
          mode={mode}
          onSave={saveAndRun}
          onSkip={runWithoutSaving}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {view === "dashBoard" &&
        <Dashboard records={records} />
      }

    </div >


  )
}
export default App
