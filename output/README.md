# FordCast — final demo deliverables

- **FordCast_Demo_1080p.mp4**: landscape 1920 × 1080, 30 fps, 2:45, H.264 / AAC; embedded English captions and original participant narration.
- **FordCast_Captions.srt**: separate editable English subtitles. Avoid enabling an additional caption track over the already captioned export if it causes duplicate captions.
- **CREDITS.md**: source links, attribution, and evidence limitations.
- **FordCast_Edit_Package.zip**: local editable production materials. The original personal media contains the metadata present in the supplied files; keep this package private. The delivered final MP4 strips source metadata and chapters.
- **QA.json** and **final-contact-sheet.jpg**: technical validation and sampled visual checks.

## Edit structure

Twelve scenes follow the supplied outline: introduction; Texas Colorado River context; current trip; evidence and missing information; crossing grouping code; synthetic closure; Spanish Drive; archived storm; no-lookahead code; study comparison; authorship; closing.

The production project is the parent folder of this output directory. `produce.py` creates cards, audio, source clips, scene videos, captions and the final export. `timeline.json` records scene times and narration trims. Dependencies are installed locally in the workspace's `.local/video-tools` folder. Rendering requires Python, Pillow, imageio-ffmpeg, and Windows Segoe UI / Consolas fonts. Inspection also uses PyAV and NumPy.

To rebuild the existing edit from its prepared media, extract the package in the same workspace layout and run `produce.py render`, then `produce.py finish`. Scene rendering reuses existing scene MP4s; remove only the particular scene file you intend to rebuild. `produce.py cards` reads the current repository code, so preserve the supplied cards when reproducing this exact edit against a changed source checkout.

The local export has not been uploaded or submitted. Review the entire final video with headphones before publishing, then check readability, audio and caption settings on the actual hosting platform.
