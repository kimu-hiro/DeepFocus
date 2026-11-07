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

//上の4つのタブ。
//押した後の処理はAppが持っているので、関数で受け取る
function TabBar(props) {
    //workとbreakはタイマー画面にいるときだけ選ばれている扱い
    const isWorkTabSelected = props.mode === "work" && props.view === "timer";
    const isBreakTabSelected = props.mode === "break" && props.view === "timer";
    const isDashboardTabSelected = props.view === "dashBoard";
    const isPracticeTabSelected = props.view === "practice";

    return (
        // navタグはWebページ内で他のページやページ内の主要な場所へ移動するためのタグ
        <nav className="flex border-b border-neutral-800">
            <button
                onClick={() => props.onTimerTabClick("work")}
                className={getNeonTabClassName(isWorkTabSelected, WORK_TAB_NEON)}
            >workTime</button>
            <button
                onClick={() => props.onTimerTabClick("break")}
                className={getNeonTabClassName(isBreakTabSelected, BREAK_TAB_NEON)}
            >breakTime</button>
            <button
                onClick={() => props.onViewChange("dashBoard")}
                className={getNeonTabClassName(isDashboardTabSelected, DASHBOARD_TAB_NEON)}
            >dashBoard</button>
            <button
                onClick={() => props.onViewChange("practice")}
                className={getNeonTabClassName(isPracticeTabSelected, PRACTICE_TAB_NEON)}
            >practice</button>
        </nav>
    );
}
export default TabBar;
