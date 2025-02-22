let originalImage = null;
let points = [];
let selectedPoint = null;
let originalFileName = "";
let scaleFactor = 1;
let transformedImage = null;
let transformedMat = null;
let canvasSize = { width: 0, height: 0 };  // Track canvas size

async function onOpenCvReady() {
    window.cv = await window.cv;
}

function showStep(step) {
    console.log(`Switching to step ${step}`);
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(`step${step}-info`).classList.add('active');
    document.getElementById(`step${step}-canvas`).classList.add('active');
    document.getElementById(`step${step}-buttons`).classList.add('active');
}

function handleFileUpload(file) {
    originalFileName = file.name.split(".").slice(0, -1).join(".");
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            originalImage = img;
            document.body.classList.add('has-image');
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
            // Create a temporary canvas for exporting the original size image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            const tempCtx = tempCanvas.getContext("2d");

            // Draw the original image
            tempCtx.drawImage(originalImage, 0, 0);

            // Convert the coordinates of the points on the screen back to the original size
            const originalSizePoints = points.map(point => ({
                x: point.x / scaleFactor,
                y: point.y / scaleFactor
            }));

            // Draw the quadrilateral on the original size canvas
            tempCtx.beginPath();
            tempCtx.moveTo(originalSizePoints[0].x, originalSizePoints[0].y);
            for (let i = 1; i < originalSizePoints.length; i++) {
                tempCtx.lineTo(originalSizePoints[i].x, originalSizePoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.strokeStyle = "red";
            tempCtx.lineWidth = 2;
            tempCtx.stroke();

            // Draw the four corner points
            originalSizePoints.forEach((point) => {
                tempCtx.beginPath();
                tempCtx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                tempCtx.fillStyle = "red";
                tempCtx.fill();
            });

            const dataURL = tempCanvas.toDataURL("image/png");
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

let transformedImagePosition = { x: 0, y: 0 };
let transformedImageSize = { width: 0, height: 0 };
let isDragging = false;
let isResizing = false;
let resizeType = '';
let startPos = { x: 0, y: 0 };

function initializeTransformedImage(width, height) {
  const canvas = document.getElementById('transformedCanvas');
  canvasSize = { width, height };          // Set canvas size
  canvas.width = width;
  canvas.height = height;
  
  // Set transformed image size (keep unchanged)
  transformedImageSize = {
    width: width,
    height: height
  };
  centerTransformedImage();
}

function centerTransformedImage() {
  const canvas = document.getElementById('transformedCanvas');
  transformedImagePosition = {
    x: (canvas.width - transformedImageSize.width) / 2,
    y: (canvas.height - transformedImageSize.height) / 2
  };
}

function setupTransformedImageControls() {
  const container = document.querySelector('.transformedContainer');
  const canvas = document.getElementById('transformedCanvas');
  const handles = document.querySelectorAll('.resize-handle');

  // Move image
  canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas) {
      isDragging = true;
      startPos = {
        x: e.clientX - transformedImagePosition.x,
        y: e.clientY - transformedImagePosition.y
      };
    }
  });

  // Adjust canvas size (not image size)
  handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizeType = Array.from(handle.classList)
        .find(c => ['right', 'bottom', 'corner'].includes(c));
      startPos = {
        x: e.clientX,
        y: e.clientY,
        width: canvasSize.width,    // Use canvas size
        height: canvasSize.height
      };
      e.stopPropagation();
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      transformedImagePosition = {
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      };
      redrawTransformedImage();
    } else if (isResizing) {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;

      // Adjust canvas size
      if (resizeType.includes('right') || resizeType === 'corner') {
        canvasSize.width = Math.max(transformedImageSize.width * 0.2, 
          startPos.width + dx);
      }
      if (resizeType.includes('bottom') || resizeType === 'corner') {
        canvasSize.height = Math.max(transformedImageSize.height * 0.2, 
          startPos.height + dy);
      }

      // Update canvas size
      const canvas = document.getElementById('transformedCanvas');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      redrawTransformedImage();
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
  });
}

function redrawTransformedImage() {
  const canvas = document.getElementById('transformedCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Redraw image with position and size
  if (transformedImage) {
    ctx.drawImage(transformedImage,
      transformedImagePosition.x, transformedImagePosition.y,
      transformedImageSize.width, transformedImageSize.height);
  }
}

// Modify export function
function exportTransformedImage() {
    if (!transformedMat) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = transformedMat.cols;
    exportCanvas.height = transformedMat.rows;
    cv.imshow(exportCanvas, transformedMat);
    const link = document.createElement('a');
    link.download = `${originalFileName}_transformed.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

function setupStep3() {
    console.log("Setting up step 3");
    const canvas = document.getElementById("transformedCanvas");
    const ctx = canvas.getContext("2d");

    if (typeof cv === "undefined" || !cv.Mat) {
        console.error("OpenCV.js failed to load properly.");
        return;
    }

    // Calculate quadrilateral width and height
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

    // Calculate original coordinates
    const originalPoints = points.map(point => ({
        x: point.x / scaleFactor,
        y: point.y / scaleFactor,
    }));

    // Calculate target coordinates (keep in original position)
    const minX = Math.min(...originalPoints.map(p => p.x));
    const minY = Math.min(...originalPoints.map(p => p.y));
    const targetPoints = [
        { x: minX, y: minY },
        { x: minX + width, y: minY },
        { x: minX + width, y: minY + height },
        { x: minX, y: minY + height }
    ];

    // Create transformation matrix
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

    // Transform with original image size and calculate full image boundary with matrix adjustment
    let corners = [
        { x: 0, y: 0 },
        { x: originalImage.width, y: 0 },
        { x: originalImage.width, y: originalImage.height },
        { x: 0, y: originalImage.height }
    ];
    let transformedCorners = corners.map(pt => {
        let srcMat = cv.matFromArray(3, 1, cv.CV_64FC1, [pt.x, pt.y, 1]);
        let dstMat = new cv.Mat();
        cv.gemm(transformMatrix, srcMat, 1, new cv.Mat(), 0, dstMat);
        let d = dstMat.data64F[2];
        let x = dstMat.data64F[0] / d;
        let y = dstMat.data64F[1] / d;
        srcMat.delete(); dstMat.delete();
        return { x, y };
    });
    let warpMinX = Math.min(...transformedCorners.map(p => p.x));
    let warpMinY = Math.min(...transformedCorners.map(p => p.y));
    let warpMaxX = Math.max(...transformedCorners.map(p => p.x));
    let warpMaxY = Math.max(...transformedCorners.map(p => p.y));
    let dstWidth = Math.round(warpMaxX - warpMinX);
    let dstHeight = Math.round(warpMaxY - warpMinY);

    let translation = cv.matFromArray(3, 3, cv.CV_64F, [
        1, 0, -warpMinX,
        0, 1, -warpMinY,
        0, 0, 1
    ]);
    let adjustedMatrix = new cv.Mat();
    cv.gemm(translation, transformMatrix, 1, new cv.Mat(), 0, adjustedMatrix);

    cv.warpPerspective(
        src,
        dst,
        adjustedMatrix,
        new cv.Size(dstWidth, dstHeight)
    );
    // Release temporary matrices
    translation.delete(); adjustedMatrix.delete();

    // Save complete transformed result
    transformedMat = dst.clone();

    // Display transformed image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dst.cols;
    tempCanvas.height = dst.rows;
    cv.imshow(tempCanvas, dst);
    transformedImage = new Image();
    transformedImage.onload = function() {
        initializeTransformedImage(tempCanvas.width, tempCanvas.height);
        redrawTransformedImage();
        setupTransformedImageControls();
    };
    transformedImage.src = tempCanvas.toDataURL();

    // Release memory
    src.delete();
    dst.delete();
    transformMatrix.delete();
    srcPoints.delete();
    dstPoints.delete();

    document
        .getElementById("previousStep")
        .addEventListener("click", function () {
            cleanupStep3();
            console.log("Going back to step 2");
            showStep(2);
        });

    document
        .getElementById("exportStep3")
        .addEventListener("click", function () {
            exportTransformedImage();
        });

    setupTransformedImageControls();
}

// Clean up memory when leaving step 3
function cleanupStep3() {
    if (transformedMat) {
        transformedMat.delete();
        transformedMat = null;
    }
    transformedImage = null;
}
