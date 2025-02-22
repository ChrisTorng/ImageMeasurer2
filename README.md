# Photo Distortion Correction Tool

This is a simple web tool that corrects a distorted quadrilateral region in a photo into a proper rectangle while preserving the complete image.

## How to Use

1. Visit the [Photo Distortion Correction Tool website](https://christorng.github.io/ImageMeasurer2/)
2. Upload a photo that contains distortion.
3. Drag the four corner points to select the quadrilateral region that should be rectangular.
4. Click "Next" to perform the correction.
5. The correction result will display the complete transformed image, including areas outside the selected region.
6. If needed, adjust the boundaries or return to re-select, then export the result.

## Features

- Pure web application with no installation required.
- Supports drag-and-drop image upload.
- Live preview of correction results.
- Preserves the complete image without clipping edges.
- Automatically calculates the full transformation range.
- Can export both the selected region and corrected image.
- Uses OpenCV.js for image processing.

## Technical Details

- Developed using plain HTML, CSS, and JavaScript.
- Uses OpenCV.js to perform perspective transformations.
- Processes images locally without uploading to a server.
- Computes the complete distortion matrix to retain all image content.

## Source Code

The project source is available on [GitHub](https://github.com/ChrisTorng/ImageMeasurer2).

## License

This project is licensed under the MIT License.