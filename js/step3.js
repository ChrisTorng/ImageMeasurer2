import { state } from './globals.js';
import { showStep } from './common.js';

export function setupStep3() {
    console.log("Setting up step 3");
    const canvas = document.getElementById("transformedCanvas");
    const ctx = canvas.getContext("2d");

    if (typeof cv === "undefined" || !cv.Mat) {
        console.error("OpenCV.js failed to load properly.");
        return;
    }

    // Calculate quadrilateral width and height
    const getDistance = (p1, p2) => {
        const dx = (p1.x - p2.x) / state.scaleFactor;
        const dy = (p1.y - p2.y) / state.scaleFactor;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const width = Math.max(
        getDistance(state.points[0], state.points[1]),
        getDistance(state.points[2], state.points[3])
    );
    const height = Math.max(
        getDistance(state.points[1], state.points[2]),
        getDistance(state.points[3], state.points[0])
    );

    // Calculate original coordinates
    const originalPoints = state.points.map(point => ({
        x: point.x / state.scaleFactor,
        y: point.y / state.scaleFactor,
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
    const src = cv.imread(state.originalImage);
    const dst = new cv.Mat();

    // Transform with original image size
    // Calculate full image boundary and adjust matrix
    let corners = [
        { x: 0, y: 0 },
        { x: state.originalImage.width, y: 0 },
        { x: state.originalImage.width, y: state.originalImage.height },
        { x: 0, y: state.originalImage.height }
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

    // Save transformed result
    state.transformedMat = dst.clone();

    // Display transformed image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dst.cols;
    tempCanvas.height = dst.rows;
    cv.imshow(tempCanvas, dst);
    state.transformedImage = new Image();
    state.transformedImage.onload = function() {
        initializeTransformedImage(tempCanvas.width, tempCanvas.height);
        redrawTransformedImage();
        setupTransformedImageControls();
    };
    state.transformedImage.src = tempCanvas.toDataURL();

    // Release memory
    src.delete();
    dst.delete();
    translation.delete(); 
    adjustedMatrix.delete();
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

function initializeTransformedImage(width, height) {
    const canvas = document.getElementById('transformedCanvas');
    state.canvasSize = { width, height };
    canvas.width = width;
    canvas.height = height;

    state.transformedImageSize = {
        width: width,
        height: height
    };
    centerTransformedImage();
}

function centerTransformedImage() {
    const canvas = document.getElementById('transformedCanvas');
    state.transformedImagePosition = {
        x: (canvas.width - state.transformedImageSize.width) / 2,
        y: (canvas.height - state.transformedImageSize.height) / 2
    };
}

function setupTransformedImageControls() {
    const container = document.querySelector('.transformedContainer');
    const canvas = document.getElementById('transformedCanvas');
    const handles = document.querySelectorAll('.resize-handle');

    // Move image
    canvas.addEventListener('mousedown', (e) => {
        if (e.target === canvas) {
            state.isDragging = true;
            state.startPos = {
                x: e.clientX - state.transformedImagePosition.x,
                y: e.clientY - state.transformedImagePosition.y
            };
        }
    });

    // Adjust canvas size (not image size)
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            state.isResizing = true;
            state.resizeType = Array.from(handle.classList)
                .find(c => ['right', 'bottom', 'corner'].includes(c));
            state.startPos = {
                x: e.clientX,
                y: e.clientY,
                width: state.canvasSize.width,
                height: state.canvasSize.height
            };
            e.stopPropagation();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (state.isDragging) {
            state.transformedImagePosition = {
                x: e.clientX - state.startPos.x,
                y: e.clientY - state.startPos.y
            };
            redrawTransformedImage();
        } else if (state.isResizing) {
            const dx = e.clientX - state.startPos.x;
            const dy = e.clientY - state.startPos.y;

            // Update canvas size
            if (state.resizeType.includes('right') || state.resizeType === 'corner') {
                state.canvasSize.width = Math.max(state.transformedImageSize.width * 0.2,
                    state.startPos.width + dx);
            }
            if (state.resizeType.includes('bottom') || state.resizeType === 'corner') {
                state.canvasSize.height = Math.max(state.transformedImageSize.height * 0.2,
                    state.startPos.height + dy);
            }

            // Update canvas size
            const canvas = document.getElementById('transformedCanvas');
            canvas.width = state.canvasSize.width;
            canvas.height = state.canvasSize.height;
            redrawTransformedImage();
        }
    });

    document.addEventListener('mouseup', () => {
        state.isDragging = false;
        state.isResizing = false;
    });
}

function redrawTransformedImage() {
    const canvas = document.getElementById('transformedCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw image with position and size
    if (state.transformedImage) {
        ctx.drawImage(state.transformedImage,
            state.transformedImagePosition.x, state.transformedImagePosition.y,
            state.transformedImageSize.width, state.transformedImageSize.height);
    }
}

function exportTransformedImage() {
    if (!state.transformedMat) return;

    // Create export canvas with the same aspect ratio as the current canvas
    const exportCanvas = document.createElement('canvas');
    const scaleRatio = state.transformedMat.cols / state.transformedImageSize.width;
    exportCanvas.width = state.canvasSize.width * scaleRatio;
    exportCanvas.height = state.canvasSize.height * scaleRatio;
    const exportCtx = exportCanvas.getContext('2d');

    // Create a temporary canvas to store the transformed image in its original size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.transformedMat.cols;
    tempCanvas.height = state.transformedMat.rows;
    cv.imshow(tempCanvas, state.transformedMat);

    // Draw the transformed image onto the export canvas, maintaining position and scale
    const scaledPosition = {
        x: state.transformedImagePosition.x * scaleRatio,
        y: state.transformedImagePosition.y * scaleRatio
    };

    exportCtx.drawImage(tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        scaledPosition.x, scaledPosition.y,
        tempCanvas.width, tempCanvas.height
    );

    // Create download link
    const link = document.createElement('a');
    link.download = `${state.originalFileName}_transformed.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

export function cleanupStep3() {
    if (state.transformedMat) {
        state.transformedMat.delete();
        state.transformedMat = null;
    }
    state.transformedImage = null;
}
