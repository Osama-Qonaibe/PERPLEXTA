/**
 * PERPLEXTA DYNAMIC AUDIO ORCHESTRATION ENGINE
 * Client-Side Generative DSP Synthesis Pipeline (Web Audio API)
 * Synthesizes high-fidelity CD quality uncompressed WAV audio locally in milliseconds.
 */

// Format notes helper mapping note name/index to frequency
const NOTE_FREQS: Record<string, number> = {
  // Octave 2
  'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
  // Octave 3
  'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
  // Octave 4
  'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  // Octave 5
  'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
};

export async function generateProceduralAudio(genre: string, vocalType: string, durationNumber: number): Promise<{ buffer: AudioBuffer; blob: Blob }> {
  const sampleRate = 44100;
  // Ensure duration resides in safe territory (min 15s, max 90s)
  const duration = Math.max(15, Math.min(durationNumber || 30, 90));
  
  // Set up OfflineAudioContext for extremely fast (immediate) local synthesis
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Deep space reverb/delay architecture
  const delay = offlineCtx.createDelay(1.0);
  const feedback = offlineCtx.createGain();
  const delayFilter = offlineCtx.createBiquadFilter();
  const wetGain = offlineCtx.createGain();
  const dryGain = offlineCtx.createGain();

  // Fine tune delay and bounce curves based on style
  const isUpbeat = ['EDM', 'Pop'].includes(genre);
  delay.delayTime.value = isUpbeat ? 0.28 : 0.42; 
  feedback.gain.value = isUpbeat ? 0.30 : 0.52; 
  delayFilter.type = 'lowpass';
  delayFilter.frequency.value = isUpbeat ? 1800 : 1200;

  // Wet/dry mix adjustments
  wetGain.gain.value = isUpbeat ? 0.22 : 0.40;
  dryGain.gain.value = 0.80;

  // Reverb Delay Routing
  delay.connect(delayFilter);
  delayFilter.connect(feedback);
  feedback.connect(delay); // Loop back

  // Wire dry/wet channels to destination
  dryGain.connect(offlineCtx.destination);
  wetGain.connect(offlineCtx.destination);

  // Unified channel router helper
  const routeToMaster = (node: AudioNode) => {
    node.connect(dryGain);
    node.connect(delay);
  };

  // Define scale structure and backing chords per genre
  let chords: string[][] = [];
  let scale: string[] = [];
  let bpm = 100;
  let useDrums = true;
  let synthType: 'sawtooth' | 'triangle' | 'sine' = 'triangle';

  switch (genre) {
    case 'Epic':
    case 'Epic Orchestral':
      bpm = 90;
      chords = [
        ['A2', 'E3', 'A3', 'C4'], // Am
        ['F2', 'C3', 'F3', 'A3'], // F
        ['C2', 'G3', 'C4', 'E4'], // C
        ['G2', 'D3', 'G3', 'B3']  // G
      ];
      scale = ['A3', 'C4', 'E4', 'G4', 'A4', 'B4', 'C5', 'E5'];
      synthType = 'sawtooth';
      break;

    case 'Tarab':
    case 'Arabic Tarab':
      bpm = 82;
      chords = [
        ['D2', 'A3', 'D4', 'F#4'], // D Major (Hijaz drone basis)
        ['Eb2', 'Bb3', 'Eb4', 'G4'], // Eb Major (Hijaz transition)
        ['G2', 'D3', 'G3', 'Bb3'],   // Gm
        ['C2', 'G3', 'C4', 'Eb4']    // Cm
      ];
      // Maqam Hijaz Scale in D
      scale = ['D4', 'Eb4', 'F#4', 'G4', 'A4', 'Bb4', 'C5', 'D5'];
      synthType = 'triangle';
      break;

    case 'EDM':
    case 'EDM & Techno':
      bpm = 128;
      chords = [
        ['A2', 'A3', 'C4', 'E4'], // Am
        ['F2', 'F3', 'A3', 'C4'], // F
        ['C2', 'C3', 'E4', 'G4'], // C
        ['G2', 'G3', 'B3', 'D4']  // G
      ];
      scale = ['A3', 'B3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5'];
      synthType = 'sawtooth';
      break;

    case 'Acoustic':
    case 'Acoustic & Soft':
      bpm = 85;
      chords = [
        ['C2', 'G3', 'C4', 'E4'], // C
        ['G2', 'D3', 'G3', 'B3'], // G
        ['A2', 'E3', 'A3', 'C4'], // Am
        ['F2', 'C3', 'F3', 'A3']  // F
      ];
      scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
      synthType = 'triangle';
      break;

    case 'LoFi':
    case 'Chill Lo-Fi':
      bpm = 74;
      chords = [
        ['A2', 'G3', 'C4', 'E4'], // Am7
        ['D2', 'F3', 'C4', 'E4'], // Dm7 (with nice tension)
        ['G2', 'F3', 'B3', 'D4'], // G7
        ['C2', 'E3', 'B3', 'D4']  // Cmaj7
      ];
      scale = ['E3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'G4'];
      synthType = 'sine';
      break;

    case 'Jazz':
    case 'Jazz & Blues':
      bpm = 88;
      chords = [
        ['D2', 'F3', 'A3', 'C4'], // Dm7
        ['G2', 'F3', 'B3', 'D4'], // G7
        ['C2', 'E3', 'G3', 'B3'], // Cmaj7
        ['A2', 'G3', 'C#4', 'E4'] // A7
      ];
      scale = ['D3', 'F3', 'G3', 'Ab3', 'A3', 'C4', 'D4', 'F4'];
      synthType = 'triangle';
      break;

    case 'Pop':
    case 'Energetic Pop':
      bpm = 116;
      chords = [
        ['C2', 'C3', 'E4', 'G4'], // C
        ['A2', 'A3', 'C4', 'E4'], // Am
        ['F2', 'F3', 'A3', 'C4'], // F
        ['G2', 'G3', 'B3', 'D4']  // G
      ];
      scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
      synthType = 'sawtooth';
      break;

    default:
      bpm = 95;
      chords = [
        ['A2', 'E3', 'A3', 'C4'],
        ['F2', 'C3', 'F3', 'A3']
      ];
      scale = ['A3', 'C4', 'E4', 'G4', 'A4', 'C5'];
      synthType = 'triangle';
  }

  const beatDuration = 60 / bpm;
  const barDuration = beatDuration * 4;
  const totalBeats = Math.ceil(duration / beatDuration);

  // 1. INSTRUMENT / MELODY SCHEDULER
  const scheduleLeadNote = (freq: number, startTime: number, noteDur: number) => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    const filter = offlineCtx.createBiquadFilter();

    osc.type = synthType;
    osc.frequency.setValueAtTime(freq, startTime);

    // Warm, lush lowpass sweep for synthesizer filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isUpbeat ? 1600 : 900, startTime);
    filter.frequency.exponentialRampToValueAtTime(isUpbeat ? 600 : 400, startTime + noteDur);

    // Envelopes
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04); // Instant attack
    gain.gain.setValueAtTime(0.12, startTime + noteDur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);

    osc.connect(filter);
    filter.connect(gain);
    routeToMaster(gain);

    osc.start(startTime);
    osc.stop(startTime + noteDur);
  };

  // 2. VOCAL FORMANT SYNTHESIZER (AI Singers / Choir)
  const scheduleVocalNote = (freq: number, startTime: number, noteDur: number, currentVocal: string) => {
    const osc = offlineCtx.createOscillator();
    const subOsc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();

    // Multilayer parallel bandpass filters to physically map vocal formats (A/O/E)
    const f1 = offlineCtx.createBiquadFilter();
    const f2 = offlineCtx.createBiquadFilter();
    const f3 = offlineCtx.createBiquadFilter();

    f1.type = f2.type = f3.type = 'bandpass';
    
    // Default formants: "Ah" Vowel Formant (Vocal resonance points)
    let formants = [600, 1040, 2250]; 
    let Q = 10;

    if (currentVocal === 'Female') {
      formants = [820, 1350, 2900]; // Classical Soprano A sound
      Q = 14;
      osc.type = 'triangle';
      subOsc.type = 'sine';
    } else if (currentVocal === 'Choir' || currentVocal === 'Choir Vocal') {
      formants = [580, 1100, 2400]; // Rich cinematic full choir A
      Q = 8;
      osc.type = 'sawtooth';
      subOsc.type = 'triangle';
    } else if (currentVocal === 'Vocaloid' || currentVocal === 'AI Synth Vocal') {
      formants = [320, 1950, 3100]; // Electric futuristic robotic formant "Ee"
      Q = 18;
      osc.type = 'sawtooth';
      subOsc.type = 'sawtooth';
    } else { // Male/Default Male Vocal
      formants = [450, 880, 2100]; // Warmer lower "Oh/Ah" hybrid
      Q = 11;
      osc.type = 'sawtooth';
      subOsc.type = 'sine';
    }

    f1.frequency.setValueAtTime(formants[0], startTime);
    f2.frequency.setValueAtTime(formants[1], startTime);
    f3.frequency.setValueAtTime(formants[2], startTime);
    f1.Q.setValueAtTime(Q, startTime);
    f2.Q.setValueAtTime(Q, startTime);
    f3.Q.setValueAtTime(Q, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.15); // Human-like smooth attack
    gain.gain.setValueAtTime(0.15, startTime + noteDur * 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);

    // Dynamic pitch bend to simulate emotional vocal performance
    const pitchOffset = (Math.random() - 0.5) * 5; 
    osc.frequency.setValueAtTime(freq + pitchOffset, startTime);
    subOsc.frequency.setValueAtTime((freq * 0.5) + (pitchOffset / 2), startTime); // Sub-octave pairing for full chest voice
    
    // Pitch bending (legato slide)
    if (Math.random() > 0.4) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.25);
    }

    // Gentle LFO Vibrato (Human vocal oscillation)
    const lfo = offlineCtx.createOscillator();
    const lfoGain = offlineCtx.createGain();
    lfo.frequency.setValueAtTime(5.4 + Math.random() * 0.8, startTime); 
    lfoGain.gain.setValueAtTime(currentVocal === 'Vocaloid' ? 1.0 : 4.0, startTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfoGain.connect(subOsc.frequency);

    // Parallel formatting routing
    osc.connect(f1); osc.connect(f2); osc.connect(f3);
    subOsc.connect(f1); subOsc.connect(f2); subOsc.connect(f3);

    f1.connect(gain);
    f2.connect(gain);
    f3.connect(gain);

    routeToMaster(gain);

    lfo.start(startTime);
    osc.start(startTime);
    subOsc.start(startTime);

    lfo.stop(startTime + noteDur);
    osc.stop(startTime + noteDur);
    subOsc.stop(startTime + noteDur);
  };

  // 3. BACKING DRUMS SCHEDULER
  const playKick = (startTime: number) => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();

    osc.frequency.setValueAtTime(genre === 'EDM' ? 160 : 130, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    gain.gain.setValueAtTime(0.9, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

    osc.connect(gain);
    gain.connect(dryGain); // Kicks stay dry and punchy

    osc.start(startTime);
    osc.stop(startTime + 0.20);
  };

  const playHiHats = (startTime: number, isHalfBeat: boolean) => {
    // Noise buffer generator
    const hatDur = isHalfBeat ? 0.05 : 0.12;
    const bufSize = offlineCtx.sampleRate * hatDur;
    const buf = offlineCtx.createBuffer(1, bufSize, offlineCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = offlineCtx.createBufferSource();
    src.buffer = buf;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(isHalfBeat ? 0.05 : 0.09, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + hatDur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dryGain);

    src.start(startTime);
    src.stop(startTime + hatDur);
  };

  const playSnare = (startTime: number) => {
    const dur = 0.22;
    const bufSize = offlineCtx.sampleRate * dur;
    const buf = offlineCtx.createBuffer(1, bufSize, offlineCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = offlineCtx.createBufferSource();
    src.buffer = buf;

    const noiseFilter = offlineCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    // Warm fundamental transient snare pitch
    const bodyOsc = offlineCtx.createOscillator();
    const bodyGain = offlineCtx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(180, startTime);
    bodyOsc.frequency.linearRampToValueAtTime(100, startTime + 0.08);

    bodyGain.gain.setValueAtTime(0.35, startTime);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    src.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(dryGain);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(dryGain);

    src.start(startTime);
    bodyOsc.start(startTime);

    src.stop(startTime + dur);
    bodyOsc.stop(startTime + dur);
  };

  // 4. VINYL & AMBIENCE GENERATOR (Continuous LoFi Crackle or Epic Rumble background)
  if (['LoFi', 'Chill Lo-Fi', 'Jazz', 'Jazz & Blues'].includes(genre)) {
    // Generate soft crackling background vinyl track
    const crackleDur = duration;
    const bufSize = offlineCtx.sampleRate * crackleDur;
    const buf = offlineCtx.createBuffer(1, bufSize, offlineCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      // Crackling logic
      const r = Math.random();
      if (r > 0.9997) {
        data[i] = (Math.random() * 2 - 1) * 0.45; // Crackle/Pop dynamic event
      } else {
        data[i] = (Math.random() * 2 - 1) * 0.015; // Low hiss floor
      }
    }

    const src = offlineCtx.createBufferSource();
    src.buffer = buf;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.5;

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.08, 0);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dryGain);

    src.start(0);
    src.stop(duration);
  }

  // 5. MASTER SEQUENCER SCHEDULE LOOP
  let barIndex = 0;
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatDuration;
    const isBarStart = beat % 4 === 0;

    if (time >= duration - 1.5) break; // Start fading out before complete cutoff

    const currentChordNotes = chords[barIndex % chords.length];

    // Trigger backing rich chords at the start of each bar
    if (isBarStart) {
      const chordFrequencies = currentChordNotes.map(note => NOTE_FREQS[note] || 220);
      
      const chordDur = barDuration * 0.94; // slightly detached bars
      const playChordsStyle = ['LoFi', 'Jazz', 'Acoustic'].includes(genre) ? 'triangle' : 'sine';
      
      // Multi-osc chord triggers
      chordFrequencies.forEach((freq, chordIdx) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = playChordsStyle;
        osc.frequency.setValueAtTime(freq, time);

        // Slow attack strings or pulsing synth chords
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.4);
        gain.gain.setValueAtTime(0.08, time + chordDur * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, time + chordDur);

        osc.connect(gain);
        routeToMaster(gain);
        osc.start(time);
        osc.stop(time + chordDur);
      });

      barIndex++;
    }

    // Schedule Drums
    if (useDrums) {
      // Kicks
      if (['EDM', 'Pop', 'Energetic Pop'].includes(genre)) {
        // EDM/Pop elements: Four on the floor kick
        playKick(time);
        
        // EDM Hihat offbeats
        playHiHats(time + beatDuration * 0.5, true);
        
        // Snare on backbeats
        if (beat % 4 === 1 || beat % 4 === 3) {
          playSnare(time);
        }
      } else if (['Epic', 'Epic Orchestral', 'Tarab', 'Arabic Tarab'].includes(genre)) {
        // Dramatic downbeats
        if (beat % 4 === 0) {
          playKick(time);
          // Pair kick with deep thaddish layers
          playKick(time + 0.08);
        }
        if (beat % 4 === 2) {
          playSnare(time);
        }
      } else if (['LoFi', 'Chill Lo-Fi', 'Jazz', 'Jazz & Blues'].includes(genre)) {
        // Relaxed swing rhythm
        if (beat % 4 === 0 || beat % 4 === 2) {
          playKick(time);
        }
        if (beat % 4 === 2) {
          playSnare(time);
        }
        // Swing high-hats
        playHiHats(time, false);
        playHiHats(time + beatDuration * 0.66, true);
      }
    }

    // Schedule Melody Lead
    if (beat % 2 === 0) {
      // Pick random scale degree matching current key
      const scaleDegreeIdx = Math.floor(Math.random() * scale.length);
      const noteName = scale[scaleDegreeIdx];
      const freq = NOTE_FREQS[noteName] || 440;
      const noteDur = beatDuration * (Math.random() > 0.4 ? 1.8 : 0.8);

      const isInstrumental = ['None', 'Instrumental'].includes(vocalType);
      
      if (isInstrumental) {
        // Instrumental lead pluck
        scheduleLeadNote(freq, time, noteDur);
      } else {
        // Vocal Humming/Vocaloid performances are scheduled alternately
        if (beat % 4 === 0 || beat % 4 === 2) {
          scheduleVocalNote(freq, time, noteDur * 1.5, vocalType);
        } else {
          scheduleLeadNote(freq * 0.5, time, noteDur); // Soft base instrument backing singer
        }
      }
    }
  }

  // Set up rendering callback
  const renderedBuffer = await offlineCtx.startRendering();
  
  // Format to correct Wav blob in milliseconds
  const wavBlob = bufferToWav(renderedBuffer);
  return { buffer: renderedBuffer, blob: wavBlob };
}

export async function generateProceduralTrack(genre: string, vocalType: string, durationNumber: number): Promise<Blob> {
  const result = await generateProceduralAudio(genre, vocalType, durationNumber);
  return result.blob;
}

/**
 * Standard uncompressed WAV encoder
 */
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = Raw uncompressed LPCM 
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChan * bytesPerSample;
  
  const length = buffer.length * numOfChan * bytesPerSample + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(pos + i, s.charCodeAt(i));
    }
    pos += s.length;
  };

  // Standard RIFF/WAVE header fields
  writeString('RIFF');                          // ChunkID
  setUint32(length - 8);                        // ChunkSize
  writeString('WAVE');                          // Format
  
  writeString('fmt ');                          // Subchunk1ID
  setUint32(16);                                // Subchunk1Size
  setUint16(format);                            // AudioFormat
  setUint16(numOfChan);                         // NumChannels
  setUint32(sampleRate);                        // SampleRate
  setUint32(sampleRate * blockAlign);           // ByteRate
  setUint16(blockAlign);                        // BlockAlign
  setUint16(bitDepth);                          // BitsPerSample

  writeString('data');                          // Subchunk2ID
  setUint32(buffer.length * numOfChan * bytesPerSample); // Subchunk2Size

  // Fetch channel buffers
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Interleave and scale multi-channel audio data to 16bit PCM samples
  const totalSamples = buffer.length;
  for (let offset = 0; offset < totalSamples; offset++) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = channels[i][offset];
      // Clamps sample to valid boundaries
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      
      // Map float scale to short signed 16-bit integer boundaries [-32768, 32767]
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}
