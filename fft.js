let sampleRate = 8000;

let samples = [
    { re: 0.46, im: 0},
    { re: 0.72, im: 0},
    { re: -0.30, im: 0},
    { re: -0.09, im: 0},
    { re: -0.16, im: 0},
    { re: -0.20, im: 0},
    { re: 0.00, im: 0},
    { re: -0.43, im: 0},
];


function complexAdd(A, B){
    return {
        re: A.re + B.re,
        im: A.im + B.im
    };
}

function complexSubtract(A, B){
    return {
        re: A.re - B.re,
        im: A.im - B.im
    };
}

function complexMultiply(A, B){
    let first = A.re * B.re;
    let outside = A.re * B.im;
    let inside = A.im * B.re;
    let last = A.im * B.im;

    return {
        re: first - last,
        im: inside + outside
    };

}



function myFFT(samples){
    let N = samples.length; //samples are just the complex numbers

    if(Math.log2(N) % 1 != 0){
        throw new Error("Array is not a power of 2"); //needs to be power of 2 to avoid empty subarrays
    }

    if(N <= 1){
        return samples;
    } 
    let M = N / 2;

    let even = new Array(M);
    let odd = new Array(M);


    for(let i = 0; i < M; i++){
        even[i] = samples[2 * i + 0];
        odd[i] = samples[2*i + 1];
    }

    console.log("Even Samples", even.map(x => x.re));
    console.log("Odd Samples", odd.map(x => x.re));

    even = myFFT(even);
    odd = myFFT(odd);

    let output = new Array(N);

    for(let k = 0; k < M; k++){
        let twiddleFactor = {
            re: Math.cos(2 * Math.PI * k/N),
            im: -Math.sin(2 * Math.PI * k/N)
        };
        let twiddledOdd = complexMultiply(odd[k], twiddleFactor);
        output[k] = complexAdd(even[k], twiddledOdd); //to fix the stack structure of recursion
        output[k + M] = complexSubtract(even[k], twiddledOdd);
    }

    return output;
}

output = myFFT(samples);
console.log("myFFT results, ", myFFT(samples));

function findHighestMagnitude(fftOutput, sampleRate){
    let length = fftOutput.length;
    let half = length / 2;

    let maxMag = 0;
    let maxBin = 0;

    for(let i = 1; i < half; i++){
        let currBin = fftOutput[i];
        let currMag = Math.sqrt(currBin.re * currBin.re + currBin.im * currBin.im);
        if(currMag > maxMag){
            maxMag = currMag;
            maxBin = i;
        }
    }
    const frequency = maxBin * sampleRate / length;
    return {
        bin: maxBin,
        frequency: frequency,
        magnitude: maxMag
    };
}

magnitudeOutput = findHighestMagnitude(output, sampleRate);
noteNumber = Math.round(12 * Math.log2(magnitudeOutput.frequency / 440) + 69);
console.log("max mag, ", magnitudeOutput);
console.log(noteNumber);


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

noteName = getNoteName(magnitudeOutput.frequency);
console.log(noteName);