import { useEffect } from 'react';

function Practice() {


    //円周の長さの求め方
    const RING_RADIUS = 120;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    //practiceを開いたにタブを閉じたり更新したらダイアログボックスが出るように処理をする練習。
    const closeOrRenew = (e) => {
        e.preventDefault();
        e.returnValue = "";
    };
    useEffect(() => {
        window.addEventListener('beforeunload', closeOrRenew);
        return () => windows.removeEventListener('beforeunload', closeOrRenew);
    }, []);


    return <p>{RING_CIRCUMFERENCE}</p>;




}

export default Practice
