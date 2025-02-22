import * as globals from './globals.js';

export async function onOpenCvReady() {
    window.cv = await window.cv;
}

export function showStep(step) {
    console.log(`Switching to step ${step}`);
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(`step${step}-info`).classList.add('active');
    document.getElementById(`step${step}-canvas`).classList.add('active');
    document.getElementById(`step${step}-buttons`).classList.add('active');
}
