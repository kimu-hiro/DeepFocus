//「記録しますか？」のダイアログ。
//ボタンを押した後の処理はAppが持っているので、
//関数で受け取る

function ConfirmDialog(props) {
    const modeLabel =
        props.mode === "work" ? "集中" : "休憩";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded shadow-lg flex flex-col gap-3 max-w-xs text-gray-800">
                <p>
                    今までの{modeLabel}時間を記録しますか？
                </p>
                <button
                    className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                    onClick={props.onSave}
                >これまでの{modeLabel}時間を記録する</button>
                <button
                    className="px-4 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400 cursor-pointer"
                    onClick={props.onSkip}
                >これまでの{modeLabel}時間を記録しない</button>
                <button
                    className="px-4 py-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                    onClick={props.onCancel}
                >戻る</button>
            </div>
        </div>
    );
}

export default ConfirmDialog;