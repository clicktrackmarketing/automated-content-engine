# Content Machine

You are orchestrating the Content Machine — a semi-automated pipeline that takes weekly topics and produces scheduled social media posts across Instagram Reels, YouTube Shorts, and LinkedIn.

**Input:** The user provides topics (or file paths in filmed mode) as a comma-separated list: `$ARGUMENTS`

---

## Mode Detection

Parse `$ARGUMENTS` to determine the production mode:

### AI-Generated Mode (default)
```
/content-machine topic1, topic2, topic3
```
No `--filmed` flag. Topics are text strings describing video concepts. The pipeline generates all video from scratch (AI clips, AI voiceover).

### Filmed Mode
```
/content-machine --filmed ~/Desktop/vid1.mp4, ~/Desktop/vid2.mp4, ~/Desktop/vid3.mp4
```
The `--filmed` flag is present. Arguments after it are file paths to source footage the speaker filmed on camera. The pipeline edits this footage (adding B-roll, overlays, captions) rather than generating video from scratch.

**Set a variable `MODE` = `filmed` or `ai-generated` and carry it through all subsequent phases.**

---

## Pipeline Overview

```
Topics/Footage → Content Strategist → [USER GATE 1] → Video Director → Post-Producer → Caption Writer → Review File → [USER GATE 2] → Social Publisher
```

There are 2 user gates where production pauses for approval. Do not skip these.

---

## Step-by-Step Execution

### Phase 1: Initialize Batch

#### AI-Generated Mode
1. Parse the topics from the input: `$ARGUMENTS`
2. Determine today's date for the batch name: `batch-YYYY-MM-DD`
3. Create the batch directory structure:
   ```
   projects/batch-YYYY-MM-DD/
   ```
4. For each topic (N = 1, 2, 3, ...), initialize the video project:
   ```bash
   ./tools/init-project.sh batch-YYYY-MM-DD/video-N
   ```

#### Filmed Mode
1. Strip the `--filmed` flag from `$ARGUMENTS` and parse the remaining comma-separated file paths
2. Validate each file path exists (error if not found)
3. Determine today's date for the batch name: `batch-YYYY-MM-DD`
4. Create the batch directory structure:
   ```
   projects/batch-YYYY-MM-DD/
   ```
5. For each source file (N = 1, 2, 3, ...), initialize and ingest:
   ```bash
   # Initialize project directory
   ./tools/init-project.sh batch-YYYY-MM-DD/video-N

   # Copy source footage into the project
   cp "<source-file-path>" projects/batch-YYYY-MM-DD/video-N/clips/source.mp4

   # Extract audio from source footage
   PATH="/opt/homebrew/bin:$PATH"
   ffmpeg -y -i projects/batch-YYYY-MM-DD/video-N/clips/source.mp4 \
     -vn -c:a aac -b:a 192k \
     projects/batch-YYYY-MM-DD/video-N/audio/source-audio.aac

   # Transcribe audio with word-level timestamps
   cd ~/hyperframes && npx hyperframes transcribe \
     --input ../projects/batch-YYYY-MM-DD/video-N/audio/source-audio.aac \
     --json \
     --output ../projects/batch-YYYY-MM-DD/video-N/audio/transcript.json
   cd -
   ```
6. After all files are ingested, verify each `video-N/` has:
   - `clips/source.mp4` (copied)
   - `audio/source-audio.aac` (extracted)
   - `audio/transcript.json` (transcribed with word-level timestamps)

### Phase 2: Generate Briefs (Content Strategist)

#### AI-Generated Mode
Invoke the `content-strategist` agent with all topics. The strategist will:
- Read brand system files (style guide, prompt library, brief template)
- Generate a completed `brief.md` for each topic
- Save to `projects/batch-YYYY-MM-DD/video-N/brief.md`

#### Filmed Mode
Invoke the `content-strategist` agent with `mode: filmed` and the batch path. The strategist will:
- Read brand system files (style guide, prompt library, brief template)
- Read each `video-N/audio/transcript.json` to understand what the speaker said
- Derive topic, hook, and CTA from the actual transcript (not invented)
- Identify B-roll insertion points and select Higgsfield prompts
- Generate a `brief.md` with a shot list that marks each row as **SOURCE** or **B-ROLL**
- Save to `projects/batch-YYYY-MM-DD/video-N/brief.md`

### Phase 3: USER GATE 1 — Approve Briefs

**STOP HERE and present the briefs to the user for approval.**

Display a summary of each brief:
- Video title
- Hook line
- Script word count and target duration
- Number of B-roll moments
- CTA

Ask the user to approve, request changes, or reject each brief. Wait for explicit approval before proceeding. If changes are requested, update the briefs and re-present.

**Do not proceed to video production until the user approves all briefs.**

---

### Phase 4: Video Production (Video Director + Team)

#### AI-Generated Mode
For each approved brief, invoke the `video-director` agent in team mode. The director will:
- Parse the brief and create a shot list
- Spawn the production team (scene-generator, overlay-composer, audio-producer)
- Coordinate parallel production
- Hand off to post-producer for assembly

#### Filmed Mode
For each approved brief, invoke the `video-director` agent in team mode with `mode: filmed`. The director will:
- Parse the brief (shot list has SOURCE and B-ROLL rows)
- Spawn a reduced team: **scene-generator** (B-roll only) + **overlay-composer** + **post-producer**
- **No audio-producer** — audio already exists from the source footage
- Scene-generator generates only the rows marked B-ROLL in the shot list
- Post-producer assembles using filmed-mode workflow (source footage + B-roll interleaved, continuous source audio)

#### Both Modes
The post-producer will:
- Assemble the 9:16 master video (`final-reels.mp4`)
- Generate the 16:9 LinkedIn variant (`final-linkedin.mp4`)
- Both saved to `projects/batch-YYYY-MM-DD/video-N/output/`

### Phase 5: Generate Captions (Caption Writer)

Invoke the `caption-writer` agent for each video. The caption writer will:
- Read each video's brief for context
- Generate 3 caption files per video:
  - `captions/instagram.md`
  - `captions/youtube.md`
  - `captions/linkedin.md`

### Phase 6: Generate Review File

Create `projects/batch-YYYY-MM-DD/review.md` with the following format:

```markdown
# Content Review — Batch YYYY-MM-DD

Review all videos below. Check the approval box for each video you approve.
Add change notes in the designated section if changes are needed.

---

## Video 1: [Title]

### Script Preview
> [First 2-3 lines of the script]

### Output Files
- 9:16 (IG Reels + YT Shorts): `video-1/output/final-reels.mp4`
- 16:9 (LinkedIn): `video-1/output/final-linkedin.mp4`

### Instagram Caption Preview
> [First 2 lines of instagram.md]

### YouTube Title
> [Title from youtube.md]

### LinkedIn Caption Preview
> [First 2 lines of linkedin.md]

### Proposed Schedule
- Instagram Reel: [Day, Time]
- YouTube Short: [Day, Time]
- LinkedIn: [Day, Time]

### Change Notes
<!-- Add any change requests here -->

- [x] Approved for publishing

---

## Video 2: [Title]
...

---

## Batch Approval

- [x] All videos reviewed and approved for publishing
```

**Important:** Pre-check the approval boxes (`[x]`) so the user only needs to uncheck if they want changes. This reduces friction.

### Phase 7: USER GATE 2 — Review and Approve

**STOP HERE and present the review file to the user.**

Tell the user:
1. The review file is at `projects/batch-YYYY-MM-DD/review.md`
2. They should review each video, caption, and schedule
3. Uncheck any approval boxes for videos that need changes
4. Add change notes for anything that needs adjustment
5. When ready, confirm approval

**Do not proceed to publishing until the user confirms approval.**

If changes are requested:
- Make the requested changes (re-generate captions, adjust schedule, etc.)
- Update the review file
- Re-present for approval

---

### Phase 8: Publish (Social Publisher)

After the user confirms approval, invoke the `social-publisher` agent. The publisher will:
1. Verify all approval checkboxes in review.md
2. Discover connected accounts
3. Upload media files
4. Schedule posts across all platforms
5. Log results to `projects/batch-YYYY-MM-DD/publish-log.md`

### Phase 9: Confirmation

Present the publish log to the user showing:
- Total posts scheduled
- Schedule dates/times for each platform
- Any failures or issues

---

## Batch Directory Structure (Final)

```
projects/batch-YYYY-MM-DD/
  video-1/
    brief.md
    clips/ images/ overlays/ audio/
    output/
      final-reels.mp4      (9:16 for IG + YT)
      final-linkedin.mp4   (16:9)
    captions/
      instagram.md
      youtube.md
      linkedin.md
  video-2/ ...
  video-3/ ...
  review.md
  publish-log.md
```

---

## Error Recovery

- If brief generation fails for a topic, skip it and note the failure. Continue with remaining topics.
- If video production fails, log the error, skip that video, and continue with remaining videos.
- If caption generation fails, the social publisher can still proceed with manually written captions.
- If publishing fails for a specific platform, log the error and continue with other platforms.
- Always produce as much as possible rather than stopping entirely on a single failure.

---

## Environment Requirements

Ensure these are set before starting:
- `GHL_API_KEY` — for social publishing
- `GHL_LOCATION_ID` — for social publishing
- `ELEVEN_API_KEY` — for voiceover generation (used by audio-producer in AI-generated mode only)

If publishing env vars are missing, the pipeline can still run through Gate 2 (producing videos and captions). Publishing will fail gracefully with a clear error message.

**Filmed mode note:** `ELEVEN_API_KEY` is not required in filmed mode since no voiceover is generated — the source footage audio is used as-is.
