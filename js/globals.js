export const state = {
    // Step 1 variables
    originalImage: null,
    originalFileName: "",
    scaleFactor: 1,
    transformedImage: null,
    transformedMat: null,

    // Step 2 variables
    points: [],
    selectedPoint: null,

    // Step 3 variables
    transformedImagePosition: { x: 0, y: 0 },
    transformedImageSize: { width: 0, height: 0 },
    canvasSize: { width: 0, height: 0 },
    isDragging: false,
    isResizing: false,
    resizeType: '',
    startPos: { x: 0, y: 0 }
};
