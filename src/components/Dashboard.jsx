
function Dashboard(props) {

    const records = props.records;

    //総学習時間・総休憩時間の集計（recordsから毎回計算する値なのでstateにはしない）
    const totalStudyTime = records
        .filter((record) => record.studyTime !== undefined)
        .reduce((sum, record) => sum + record.studyTime, 0);
    const totalRestTime = records
        .filter((record) => record.restTime !== undefined)
        .reduce((sum, record) => sum + record.restTime, 0);
    return (
        <div className="p-6">
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
        </div>
    );
}
export default Dashboard;