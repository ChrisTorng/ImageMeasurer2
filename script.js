let originalImage = null;
let points = [];
let selectedPoint = null;
let originalFileName = "";
let scaleFactor = 1;

async function onOpenCvReady() {
    window.cv = await window.cv;
}

function showStep(step) {
    console.log(`Switching to step ${step}`);
    document.getElementById("step1").classList.remove("active");
    document.getElementById("step2").classList.remove("active");
    document.getElementById("step3").classList.remove("active");
    document.getElementById(`step${step}`).classList.add("active");
}

function handleFileUpload(file) {
    originalFileName = file.name.split(".").slice(0, -1).join(".");
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            originalImage = img;
            setupStep2();
            showStep(2);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', function () {
    const uploadArea = document.getElementById("uploadArea");
    uploadArea.addEventListener("click", function () {
        document.getElementById("uploadPhoto").click();
    });
    uploadArea.addEventListener("dragover", function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = "#007BFF";
    });
    uploadArea.addEventListener("drop", function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = "#ccc";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            handleFileUpload(file);
        }
    });
    document
        .getElementById("uploadPhoto")
        .addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        });
});

function setupStep2() {
    const canvas = document.getElementById("photoCanvas");
    const ctx = canvas.getContext("2d");

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.7;
    scaleFactor = Math.min(
        maxWidth / originalImage.width,
        maxHeight / originalImage.height,
        1
    );
    canvas.width = originalImage.width * scaleFactor;
    canvas.height = originalImage.height * scaleFactor;

    points = [
        { x: canvas.width * 0.25, y: canvas.height * 0.25 },
        { x: canvas.width * 0.75, y: canvas.height * 0.25 },
        { x: canvas.width * 0.75, y: canvas.height * 0.75 },
        { x: canvas.width * 0.25, y: canvas.height * 0.75 },
    ];

    function drawQuadrilateral() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();
        points.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        });
    }

    drawQuadrilateral();

    canvas.addEventListener("mousedown", function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        points.forEach((point, index) => {
            const dx = mouseX - point.x;
            const dy = mouseY - point.y;
            if (Math.sqrt(dx * dx + dy * dy) < 10) {
                selectedPoint = index;
            }
        });
    });

    canvas.addEventListener("mousemove", function (e) {
        if (selectedPoint !== null) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            points[selectedPoint].x = mouseX;
            points[selectedPoint].y = mouseY;
            drawQuadrilateral();
        }
    });

    canvas.addEventListener("mouseup", function () {
        selectedPoint = null;
    });

    document
        .getElementById("exportStep2")
        .addEventListener("click", function () {
            const dataURL = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataURL;
            link.download = `${originalFileName}_step2.png`;
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

function setupStep3() {
    console.log("Setting up step 3");
    const canvas = document.getElementById("transformedCanvas");
    const ctx = canvas.getContext("2d");

    if (typeof cv === "undefined" || !cv.Mat) {
        console.error("OpenCV.js failed to load properly.");
        return;
    }

    // 計算四邊形的寬度和高度
    const getDistance = (p1, p2) => {
        const dx = (p1.x - p2.x) / scaleFactor;
        const dy = (p1.y - p2.y) / scaleFactor;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const width = Math.max(
        getDistance(points[0], points[1]),
        getDistance(points[2], points[3])
    );
    const height = Math.max(
        getDistance(points[1], points[2]),
        getDistance(points[3], points[0])
    );

    // 計算原始座標
    const originalPoints = points.map(point => ({
        x: point.x / scaleFactor,
        y: point.y / scaleFactor,
    }));

    // 計算目標座標（保持在原位置）
    const minX = Math.min(...originalPoints.map(p => p.x));
    const minY = Math.min(...originalPoints.map(p => p.y));
    const targetPoints = [
        { x: minX, y: minY },
        { x: minX + width, y: minY },
        { x: minX + width, y: minY + height },
        { x: minX, y: minY + height }
    ];

    // 建立轉換矩陣
    const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        originalPoints[0].x, originalPoints[0].y,
        originalPoints[1].x, originalPoints[1].y,
        originalPoints[2].x, originalPoints[2].y,
        originalPoints[3].x, originalPoints[3].y
    ]);
    const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        targetPoints[0].x, targetPoints[0].y,
        targetPoints[1].x, targetPoints[1].y,
        targetPoints[2].x, targetPoints[2].y,
        targetPoints[3].x, targetPoints[3].y
    ]);

    const transformMatrix = cv.getPerspectiveTransform(srcPoints, dstPoints);
    const src = cv.imread(originalImage);
    const dst = new cv.Mat();

    // 使用原始影像大小進行轉換
    cv.warpPerspective(
        src,
        dst,
        transformMatrix,
        new cv.Size(originalImage.width, originalImage.height)
    );

    // 調整顯示尺寸
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.7;
    const displayScale = Math.min(
        maxWidth / originalImage.width,
        maxHeight / originalImage.height,
        1
    );
    canvas.width = originalImage.width * displayScale;
    canvas.height = originalImage.height * displayScale;

    // 縮放顯示結果
    const displayMat = new cv.Mat();
    cv.resize(dst, displayMat, new cv.Size(canvas.width, canvas.height));
    cv.imshow(canvas, displayMat);

    // 釋放記憶體
    src.delete();
    dst.delete();
    displayMat.delete();
    transformMatrix.delete();
    srcPoints.delete();
    dstPoints.delete();

    document
        .getElementById("previousStep")
        .addEventListener("click", function () {
            console.log("Going back to step 2");
            showStep(2);
        });

    document
        .getElementById("exportStep3")
        .addEventListener("click", function () {
            const dataURL = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataURL;
            link.download = `${originalFileName}_transformed.png`;
            link.click();
        });
}
