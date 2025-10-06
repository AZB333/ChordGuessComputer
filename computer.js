// const mic_btn = document.querySelector("#mic");
// const playback = document.querySelector(".playback");

// mic_btn.addEventListener("click", ToggleMic);

// let can_record = false;
// let is_recording = false;

// let recorder = null;

// let chunks = [];

// function SetupAudio(){
//     if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
//         navigator.mediaDevices
//         .getUserMedia({
//             audio: true
//         })
//         .then(SetupStream)
//         .catch(err =>{
//             console.error(err);
//         })
//     }
// }


// SetupAudio();


// function SetupStream(stream){
//     recorder = new MediaRecorder(stream);

//     recorder.ondataavailable = e =>{
//         chunks.push(e.data);
//     };

//     recorder.onstop = e =>{
//     const blob = new Blob(chunks, { type: "audio/ogg;"});
//     chunks = [];
//     const audioURL = window.URL.createObjectURL(blob);
//     playback.src = audioURL;
//     };

//     can_record = true;
// }

// function ToggleMic(){
//     if(!can_record){
//         console.log("can't record");
//         return;
//     }

//     is_recording = !is_recording;
//     if(is_recording){
//         recorder.start();
//         mic_btn.classList.add("is-recording");
//     }
//     else{
//         recorder.stop();
//         mic_btn.classList.remove("is-recording");
//     }
// }


const startButton = document.getElementById("start-btn");
const stopButton = document.getElementById("stop-btn");
const pitchDisplay = document.getElementById("pitch");

let audioContext;
let analyser;
let bufferLength;
let data;
let animationId = null;
let stream = null;


function getNoteName(frequency) {
    if (!frequency) return null;

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const noteNumber = 12 * (Math.log2(frequency / 440)) + 69;
    const roundedNote = Math.round(noteNumber);
    const noteIndex = (roundedNote % 12 + 12) % 12; // handles negative values
    const octave = Math.floor(roundedNote / 12) - 1; // MIDI starts at octave -1

    const cents = Math.floor((noteNumber - roundedNote) * 100);

    return {
    name: noteNames[noteIndex],
    octave: octave,
    fullName: `${noteNames[noteIndex]}${octave}`,
    centsOff: cents
    };
}


stopButton.addEventListener("click", () => {
    if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    }
    if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    }
    if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
    audioContext = null;
    }

    startButton.disabled = false;
    stopButton.disabled = true;
    pitchDisplay.textContent = "--";
});

startButton.addEventListener("click", async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bufferLength = analyser.fftSize;
    data = new Float32Array(bufferLength);

    source.connect(analyser);
    detectPitch();
});

function detectPitch() {
    analyser.getFloatTimeDomainData(data);
    let pitches = autoCorrelateMultiple(data, audioContext.sampleRate, 3);
    
    if (pitches.length === 0) {
        pitchDisplay.textContent = "0";
    } else {
        let displayText = pitches.map(pitch => {
            let note = getNoteName(pitch);
            return `${pitch.toFixed(1)} Hz (${note.fullName})`;
        }).join('\n');
        pitchDisplay.textContent = displayText;
    }
    
    animationId = requestAnimationFrame(detectPitch);
}


function autoCorrelateMultiple(buffer, sampleRate, numPeaks = 3) {
    let SIZE = buffer.length;
    let maxSamples = Math.floor(SIZE / 2);
    let rms = 0;
    let correlations = new Array(maxSamples);
    let peaks = [];
    
    // Calculate RMS
    for (let i = 0; i < SIZE; i++) {
        let val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return [];
    
    // Calculate all correlations
    for (let offset = 1; offset < maxSamples; offset++) { // start at 1 to skip DC
        let correlation = 0;
        for (let i = 0; i < maxSamples; i++) {
            correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
        }
        correlations[offset] = 1 - (correlation / maxSamples);
    }
    
    // Find local maxima above threshold
    for (let i = 1; i < correlations.length - 1; i++) {
        if (correlations[i] > 0.3 && // lower threshold for secondary peaks
            correlations[i] > correlations[i-1] && 
            correlations[i] > correlations[i+1]) {
            peaks.push({
                offset: i,
                correlation: correlations[i],
                frequency: sampleRate / i
            });
        }
    }
    
    // Sort by correlation strength and return top N
    return peaks
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, numPeaks)
        .map(peak => peak.frequency);
}