import { useState } from 'react'
import workIcon from "../assets/workIcon.png"
import breakIcon from "../assets/breakIcon.png"
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react"

//円形プログレスバーの半径と円周
const RING_RADIUS = 128;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

//タイマー表示の時のための変数
const formatTime = (sec) => {
    const m = String(Math.trunc(sec / 60)).padStart(2, "0");
    const s = String(Math.trunc(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
};

//work/break共通のタイマー画面。
//props.modeで色や文字を切り替える。
function TimerPanel(props) {
    //時間を打ち直している間だけ使うので、Appではなくここで持つ
    //work/break endTimeを編集中かどうかの状態管理
    const [isEditing, setIsEditing] = useState(false);
    //入力値の状態管理、単位は秒
    const [inputValue, setInputValue] = useState("00:08");

    const isWork = props.mode === "work";
    const title = isWork ? "workTime" : "breakTime";
    const icon = isWork ? workIcon : breakIcon;
    const subtitleText = isWork ? "Focus Study for myself" : "Focus break for myself";

    const hex = isWork ? "#ef4444" : "#22c55e";
    const textColorClass = isWork ? "text-red-500" : "text-green-500";
    const glowStyle = isWork
        ? { filter: "drop-shadow(0 0 4px #ef4444) drop-shadow(0 0 10px #ef4444)" }
        : { filter: "drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e)" };
    const sliderThumbClasses = isWork
        ? "[&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444] [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#ef4444,0_0_10px_#ef4444]"
        : "[&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e] [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:shadow-[0_0_6px_#22c55e,0_0_10px_#22c55e]";

    //円形プログレスバー用の経過割合
    const progressRatio = props.totalTime > 0 ? (props.totalTime - props.remainingTime) / props.totalTime : 0;

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
                            props.onTimeSet(msTotal);
                            setIsEditing(false);
                        }}
                    />
                ) : (
                    <span className="z-10 text-5xl font-bold" onClick={() => {
                        props.onEditStart();
                        setInputValue(formatTime(props.remainingTime));
                        setIsEditing(true);
                    }}>
                        {String(Math.trunc(props.remainingTime / 60)).padStart(2, "0")}:
                        {String(Math.trunc(props.remainingTime % 60)).padStart(2, "0")}
                    </span>
                )}
            </div>

            {/* 再生ボタンと一時停止ボタンとリセットボタン */}
            <div className="flex items-center justify-center gap-6 mt-2">
                {!props.isRunning ?
                    <button className={`${textColorClass} cursor-pointer`} onClick={((event) => {
                        event.stopPropagation();
                        props.onStart();
                    })}>
                        <Play size={40} style={glowStyle} />
                    </button> :

                    <button className={`${textColorClass} cursor-pointer`} onClick={(() => {
                        props.onPause();
                    })}>
                        <Pause size={40} style={glowStyle} />
                    </button>
                }

                <button className={`${textColorClass} cursor-pointer`} onClick={props.onResetClick}>
                    <Square size={36} style={glowStyle} />
                </button>

                {/*/ブラウンノイズボリューム調整アイコン justifyは横、itemsは縦 */}
                {/* group-hover:が必要なのは変化するものだけ */}
                <div className="group flex items-center gap-2">
                    {/* 音アイコン */}
                    <button
                        onClick={props.onMuteToggle}
                        className={`${textColorClass} cursor-pointer`}>
                        {props.isMute ?
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
                        style={{ background: `linear-gradient(to right, ${hex} ${props.brownVolume * 100}%, #3f3f46 ${props.brownVolume * 100}%)` }}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={props.brownVolume}
                        onChange={(e) => props.onBrownVolumeChange(Number(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
}
export default TimerPanel
