# Editing Method: Finding Pauses and Tightening Without Damage

Hard-won notes from real edits. Two of these cost a full re-render to learn.

---

## 1. `silencedetect` is peak-based and will lie to you

ffmpeg's `silencedetect` filter measures **peak** amplitude. On a talking-head take with a
continuous room-tone bed, occasional ticks poke above the threshold and the filter reports
**no silence at all** — even at `-20dB`.

On one 67-second take it reported zero silence. The take actually contained **15.78 seconds**
of it, including a single **3.64-second** dead pause.

Measure **RMS** in short windows instead:

```python
HOP = int(0.020 * sr)                      # 20 ms
db = [20*log10(sqrt((frame**2).mean())) for frame in frames]
```

Typical separation on a decent take:

| Content    | RMS level     |
|------------|---------------|
| Speech     | -15 to -30 dB |
| Room tone  | -43 to -53 dB |

A ~25dB gap makes the pauses unmistakable. Treat anything below **-40dB RMS** for **≥0.24s**
as a real pause.

## 2. Cut the dead air. Do not speed up the speech.

The tempting fix for a slow take is a global `atempo`. Don't. Even 1.13x is audible on
speech, and viewers notice it as "rushed" without being able to say why.

Cut the silence instead:

- Keep a **0.10s margin** on each side of every cut so no consonant onset or tail is clipped.
- Leave **0.18–0.26s** of pause behind — a hard-butted cut sounds breathless.
- Cuts land entirely inside RMS-verified silence, so no word can be damaged.

On the take above this removed 10.53s (67.7s → 57.1s) with speech untouched at 1.0x.

## 3. whisper drifts across long pauses — cut first, then transcribe

whisper (and whisper.cpp) will happily place words **inside** a silence. On the same take it
put three words ~2.9s early, in the middle of the 3.6s gap. Captions built from those
timestamps appear before the speaker says anything.

Order matters:

1. Detect silence by RMS on the **original** audio
2. **Cut** the dead air
3. **Re-transcribe the tightened audio**
4. Build captions and graphics from those new timings

With the long pauses gone, whisper has nothing to drift into. Worst-case drift fell from
**2.9s to 0.22s** (mean 0.127s). Snap any word whose start still falls in a detected gap
forward to the true onset — but only when the gap exceeds ~0.12s, or you will push captions
late on ordinary soft consonants.

## 4. Verify every render by re-transcription

Non-negotiable. Extract the rendered audio, transcribe it, and diff word-for-word against
the source transcript. **Normalise before comparing** or you will chase phantom failures:

- numerals: `nine` / `9`, `eight` / `8`
- merged tokens: `chat GPT` / `ChatGPT`
- ASR spelling variants of the same spoken word
- unstressed articles: `the` / `a`

Only a change in the **word sequence** is a real defect. A substitution at the same index is
an ASR artifact; a deletion is a clipped word and must block the render.

## 5. Author overlays on the timeline the audio actually has

Build captions and graphics against the final audio timeline, composite, and apply any
remaining time manipulation **once** to the finished composite. Overlays authored against one
timeline and composited onto another will drift, and the drift grows along the video.
