# Generate B-Roll Prompts

Read the brand system files:
- `brand/style_guide.md`
- `brand/prompts_library.md`

Then analyze the script or video brief provided: $ARGUMENTS

## Steps

1. Read the script or brief
2. Identify every B-roll insertion point (stats, name drops, product references, abstract concepts)
3. For each insertion point, either:
   a. Select a matching prompt from `brand/prompts_library.md` and adapt it, OR
   b. Write a new prompt following the brand prompt formula
4. Adapt all prompts to the target aspect ratio (9:16 for vertical, 16:9 for landscape)
5. Output a numbered list with each prompt tagged to its timestamp in the script

## Prompt Formula

```
[Subject + action] | [Camera direction] | [Lens/depth] | [Lighting] | [Color/aesthetic] | [Style reference] | [Aspect ratio + quality]
```

## Universal Style Anchors (include in every prompt)

Adapt these from your `brand/style_guide.md`:
- Color: include your brand background, accent, and highlight colors with "high contrast"
- Lighting: "cinematic, soft cool key light, subtle rim light"
- Style: match your brand's visual aesthetic reference
- Quality: "4K cinematic, shallow depth of field, professional commercial production"

## Output Format

For each B-roll moment:
```
### B-Roll [N]: [timestamp] - [description]
**Script line:** "[the spoken words at this moment]"
**Source prompt:** [Prompt X.X from library or "Custom"]
**Ready-to-paste prompt:**
[Full prompt adapted for this video]
**Model recommendation:** [seedance_2_0 / kling3_0 / etc]
**Duration:** [3-5s]
```
