# WhatsApp Export Chat Parser

A browser-based viewer for exported WhatsApp conversations. Open a local export folder to browse messages and attachments, filter by date, and explore message statistics.

Built with plain HTML, CSS, and JavaScript. No build step, package installation, or backend is required. Charts use Chart.js loaded from a CDN.

## Features

- Chat bubbles with sender names, timestamps, and a left/right swap button.
- Inclusive start and end date filtering.
- Total message counts and counts per sender.
- Conversation group counts and initiator statistics, using a 30-minute gap threshold.
- Daily message and conversation group charts; click a bar to jump to that date.
- Lazy loading of images, videos, and audio, with full-size image previews.
- Voice message playback and seeking, contact downloads, and document links.

## Run locally

1. Download or clone this repository and extract it if downloaded as a ZIP.
2. Open `parser.html` directly in a desktop browser that supports folder selection, such as Chrome or Edge. Keep the accompanying `css`, `js`, and `statis` folders in place.
3. Click **Select WhatsApp Folder** and choose your extracted WhatsApp chat export folder, as described below.

No server or installation is needed.
No Internet connection is required.

## Open a conversation

1. Export a WhatsApp chat, including media if you want to view attachments.
2. Extract the export into a local folder. The chat text file must be named `_chat.txt`.
3. Click **Select WhatsApp Folder** and select that extracted folder.
4. Choose **Start** and **End** dates, then click **Apply** to update the chat and statistics.
5. Use **Swap left/right** to reverse message alignment, or click a chart bar to scroll to a date.

**Show earliest** sets the start date to the earliest message date. Click **Apply** afterward to apply it; the end date is unchanged.

Example export folder:

```text
my-chat/
├── _chat.txt
├── photo.jpg
├── voice-message.opus
└── media/
    └── video.mp4
```

Files are indexed in the selected folder and one level of subfolders. Attachment filenames must match the names referenced in the chat. Duplicate filenames overwrite earlier entries in the file index.

## Supported export format

The parser expects bracketed message headers with day/month/four-digit-year dates and a sender followed by a colon:

```text
[23/10/2026, 09:15:00] Alex: Hello!
[23/10/2026, 9:16:00 AM] Sam: Hi Alex.
This is a continuation of the same message.
[23/10/2026, 09:17:00] Alex: <attached: photo.jpg>
```

Times may use 12-hour AM/PM or 24-hour notation, with optional seconds. The comma after the date is optional. Lines without a matching header are appended to the previous message; lines before the first matching message are ignored. Left-to-right marks and narrow non-breaking spaces are normalized before parsing.

Other export layouts, including unbracketed headers and month-first dates, are not supported reliably.

| Attachment type     | Extensions                                                | Behavior                                                              |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Images and stickers | `jpg`, `jpeg`, `png`, `webp`                              | Inline preview; non-WebP images open in a larger overlay              |
| Video               | `mp4`                                                     | Browser playback controls                                             |
| Voice messages      | `opus`                                                    | Custom playback and seek controls                                     |
| Contacts            | `vcf`                                                     | Download link                                                         |
| Documents           | `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `txt` | Open a local object URL in a new tab; handling depends on the browser |

## Data handling

The application reads selected files locally through the browser's File System Access API. Its code does not upload the chat or attachments to a backend. Chart.js is fetched from an external CDN, and clicking links in messages opens external websites.

Message text is currently inserted as HTML without sanitization. Only open exports you trust; embedded HTML can affect the page or request external resources. Keep personal chat exports and media outside this repository when publishing it.

## Current limitations

- Conversation grouping intends to start a new group after a gap greater than 30 minutes. The existing grouping helper reads dates as `dd/mm/yyyy`, while the parser stores them as `yyyy/mm/dd`; group and initiator statistics can therefore be inaccurate across dates.
- Applying a range with no matching messages can raise an error during message alignment.
- Left/right alignment is designed around the first two distinct senders; larger group chats may not align consistently.
- Cancelling the folder picker, missing `_chat.txt`, and missing attachments do not have dedicated error handling.
- Attachment messages render the first attachment reference. Captions and unsupported attachment types are not displayed.
- Selecting another folder retains the current date inputs and sender alignment state. Reload the page to start fresh.
- All message elements are rendered at once, so large exports may be slow even though media loads lazily.

These limitations describe the existing implementation; this cleanup preserves its behavior.

## Project structure

```text
parser.html           Page structure and script loading
css/styles.css        Chat, charts, media controls, and modal styles
js/main.js            File loading, parsing, filtering, statistics, and rendering
statis/background.png Chat background image
```

Edit the source files directly and refresh the browser to see changes. There is no package-managed development server or automated test suite.

For static hosting, serve the repository contents over HTTPS and open `/parser.html`; the project does not currently provide an `index.html` entry point.
