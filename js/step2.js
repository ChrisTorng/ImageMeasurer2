import { state } from './globals.js';
import { showStep } from './common.js';
import { setupStep3 } from './step3.js';

export function setupStep2() {
    const canvas = document.getElementById("photoCanvas");
    const ctx = canvas.getContext("2d");

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.7;
    state.scaleFactor = Math.min(
        maxWidth / state.originalImage.width,
        maxHeight / state.originalImage.height,
        1
    );
    canvas.width = state.originalImage.width * state.scaleFactor;
    canvas.height = state.originalImage.height * state.scaleFactor;

    state.points = [
        { x: canvas.width * 0.25, y: canvas.height * 0.25 },
        { x: canvas.width * 0.75, y: canvas.height * 0.25 },
        { x: canvas.width * 0.75, y: canvas.height * 0.75 },
        { x: canvas.width * 0.25, y: canvas.height * 0.75 },
    ];

    function drawQuadrilateral() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(state.originalImage, 0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(state.points[0].x, state.points[0].y);
        for (let i = 1; i < state.points.length; i++) {
            ctx.lineTo(state.points[i].x, state.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();
        state.points.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        });
    }

    drawQuadrilateral();
    setupEventListeners(canvas, drawQuadrilateral);
    setupButtons();
}

function setupEventListeners(canvas, drawQuadrilateral) {
    canvas.addEventListener("mousedown", function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        state.points.forEach((point, index) => {
            const dx = mouseX - point.x;
            const dy = mouseY - point.y;
            if (Math.sqrt(dx * dx + dy * dy) < 10) {
                state.selectedPoint = index;
            }
        });
    });

    canvas.addEventListener("mousemove", function (e) {
        if (state.selectedPoint !== null) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            state.points[state.selectedPoint].x = mouseX;
            state.points[state.selectedPoint].y = mouseY;
            drawQuadrilateral();
        }
    });

    canvas.addEventListener("mouseup", function () {
        state.selectedPoint = null;
    });
}

function setupButtons() {
    document
        .getElementById("exportStep2")
        .addEventListener("click", function () {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.originalImage.width;
            tempCanvas.height = state.originalImage.height;
            const tempCtx = tempCanvas.getContext("2d");

            tempCtx.drawImage(state.originalImage, 0, 0);

            const originalSizePoints = state.points.map(point => ({
                x: point.x / state.scaleFactor,
                y: point.y / state.scaleFactor
            }));

            tempCtx.beginPath();
            tempCtx.moveTo(originalSizePoints[0].x, originalSizePoints[0].y);
            for (let i = 1; i < originalSizePoints.length; i++) {
                tempCtx.lineTo(originalSizePoints[i].x, originalSizePoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.strokeStyle = "red";
            tempCtx.lineWidth = 2;
            tempCtx.stroke();

            originalSizePoints.forEach((point) => {
                tempCtx.beginPath();
                tempCtx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                tempCtx.fillStyle = "red";
                tempCtx.fill();
            });

            const dataURL = tempCanvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataURL;
            link.download = `${state.originalFileName}_step2.png`;
            link.click();
        });

    document
        .getElementById("nextStep")
        .addEventListener("click", function () {
            console.log("Proceeding to step 3");
            setupStep3();
            showStep(3);
        });
}
