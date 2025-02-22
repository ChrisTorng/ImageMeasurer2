import { state } from './globals.js';
import { showStep } from './common.js';
import { setupStep2 } from './step2.js';

export function handleFileUpload(file) {
    state.originalFileName = file.name.split(".").slice(0, -1).join(".");
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            state.originalImage = img;
            document.body.classList.add('has-image');
            setupStep2();
            showStep(2);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export function initializeStep1() {
    const uploadArea = document.getElementById("uploadArea");
    uploadArea.addEventListener("click", () => {
        document.getElementById("uploadPhoto").click();
    });
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = "#007BFF";
    });
    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = "#ccc";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            handleFileUpload(file);
        }
    });
    document
        .getElementById("uploadPhoto")
        .addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        });
}
