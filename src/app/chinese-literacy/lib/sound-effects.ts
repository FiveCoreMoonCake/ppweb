"use client";

export function playCorrectSound() {
  try {
    const ctx = new AudioContext();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch {}
}

export function playWrongSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export function playVictoryMusic() {
  try {
    const ctx = new AudioContext();
    const bpm = 240;
    const beat = 60 / bpm;

    const playNote = (freq: number, start: number, dur: number, vol = 0.1, type: OscillatorType = "square") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };

    const C5=523.25, E5=659.25, G5=783.99, C6=1046.5, E6=1318.5;
    const notes: [number, number, OscillatorType?][] = [
      [C5, 1], [E5, 1], [G5, 1], [C6, 0.5],
      [G5, 0.5], [C6, 0.5], [E6, 2, "sawtooth"],
      [C6, 0.4], [E6, 0.4], [C6, 0.4], [E6, 0.4], [G5, 0.4], [C6, 1.5],
    ];

    let t = 0;
    for (const [freq, dur, type] of notes) {
      playNote(freq, t, dur * beat, 0.09, type || "square");
      t += dur * beat;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, ctx.currentTime + t);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + t + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.5);
  } catch {}
}
