# IGS Summariser

A Business Coach Summary Transcriber and funding-opportunity matcher, built with Next.js 14+.

**This runs locally, by design.** It reads your Outlook mailbox over COM and keeps its database in a file on your machine, so nothing about your clients leaves the building. It is not built to be hosted: the dev and start scripts bind to `127.0.0.1`, and the API routes are deliberately unauthenticated because the only caller is the person sitting at the machine. Serving it to anything but localhost would need real authentication first.

## Features

✨ **Modern UI/UX** - Built with React, Tailwind CSS, and custom shadcn/ui components
🔐 **Authentication** - Email/password login system with JWT tokens
📄 **File Upload** - Support for .txt and .docx files
🤖 **AI-Powered** - GPT-4o integration for intelligent summarization
⚙️ **Advanced Parameters** - Fine-tune AI responses with temperature, top-p, and penalty controls
📊 **Results Export** - Download summaries as text files
🎨 **Professional Design** - Clean, intuitive dashboard with gradient branding
📬 **Funding Inbox** - One Sync button reads your Outlook mail and returns a de-duplicated list sorted by when you have to decide
🎯 **Opportunity Matcher** - Turn one funding email into a ranked list of which clients to contact and why
🗂️ **Salesforce Supports** - Every transcript is checked against the 13 supports on the Salesforce list, with a quote from the meeting as evidence

## Salesforce Supports

After a summary, the dashboard sorts the 13 Salesforce supports into three groups, fixed by what the AI found so nothing moves while you tick:

- **Suggested to record** - the meeting spent real time on it. These are ticked for you.
- **Mentioned in passing** - it came up briefly. Your call; not ticked.
- **Not discussed** - folded away, but you can still tick one the transcript missed.

Each suggestion carries a one-line reason and a short quote from the transcript. Quotes are checked against the transcript before they are shown, so a quote the model invented is dropped rather than displayed. A support named outright (GBIP, GIP, Invest-Ability, Women in Innovation...) is never left in "Not discussed", however the model judged it.

Tick what you will record, then write each one up, or use **Write up all** in the footer. Each support has its own write-up prompt, editable under Prompts. Only ticked supports go into the copy and the Word export.

The list lives in `lib/services.ts`: the Salesforce name, the line the coach sees, the classifier's guidance, the name patterns and the default write-up prompt, all in one entry per support. To add or retire a support, edit that list.

## Funding Inbox

`/inbox` has one button. Press **Sync emails** and the app reads your Outlook mailbox on this machine, keeps what looks like funding, collapses duplicates, and sorts what is left by when you actually have to decide.

**How the sync works**

1. **Read the mailbox.** `lib/server/outlook-sync.ts` drives classic Outlook over COM from a short PowerShell script. No Azure app registration, no admin consent, no forwarding address, no third party: it runs as you, on your machine. It also sidesteps the `.msg` problem, because COM hands back the body as text.
2. **Skip what is already read.** Every message is remembered by its Outlook entry id. A second press of Sync over the same window makes **zero** model calls - the difference between a button that is cheap to press and one that is not.
3. **Triage cheaply.** `lib/mail-triage.ts` scores each new message on funder names, call language and funding URLs before a single token is spent. On a real 30-day inbox this cut 216 messages to 40. It is deliberately generous: a false positive costs one model call and gets filed as noise, a false negative loses a competition.
4. **Read, de-duplicate, sort.** Survivors go through the same pipeline as a pasted email, then collapse into opportunities and sort by decide-by date.

At most 25 emails are read per sync; the rest wait for the next press and the response says how many.

**Check first.** The Check button runs the whole sync except the model calls, and reports how many emails would be read. Free, and about three seconds.

**De-duplication** runs in two passes, because one is not enough on real mail. The first matches the competition URL - Innovate UK puts the competition number in the path. The second catches what that misses: the same call in a funder briefing and again in a weekly digest, where one says "Innovate UK" and the other "UK Research and Innovation" and only one carries the link. Those match on competition name, and only when their closing dates do not contradict each other, so two rounds of one programme stay apart.

**Sorted by decide-by, not arrival.** Round-ups, webinars and admin drop into a collapsed group at the bottom. Anything already closed sinks but is still listed, because a coach asked about it still wants to know it has gone.

**The local database**

`data/inbox.json`, on the machine the app runs on. No cloud, no vendor, no client correspondence leaving the building. It holds the opportunities, the call sheets (so a match is paid for once), the sync settings, and the ids of every email already read. Writes go through a temp file and a rename, so an interrupted write cannot corrupt it. `data/` is gitignored - it is real correspondence and must never be committed.

Move it with `IGS_DATA_DIR`. Reset it from the UI, or `DELETE /api/sync`.

Because there is no request timeout to work around, a sync reads up to 200 emails in one press rather than being chopped into batches. That ceiling is a spending limit, not a time limit - set `IGS_MAX_EMAILS_PER_SYNC` to change it, and use Check first to see the number before anything is spent.

**Requirements:** Windows, classic Outlook installed with a mail profile. Outlook may ask once for permission for a program to read your mail. Without it, the manual drop zone still takes `.eml` and `.txt` files - see below.

**Adding emails by hand.** Under "Add saved emails by hand" you can drop `.eml` or `.txt` files, which is the fallback where Outlook COM is unavailable. New Outlook and Outlook on the web write `.eml` when you drag messages out; classic Outlook writes `.msg`, which is detected and reported rather than silently failing (use Sync instead, or File > Save As > Text Only). `lib/email-parse.ts` handles multipart MIME, quoted-printable, base64, encoded-word subjects and HTML-only bodies, cuts the quoted history off the bottom, and drops corporate disclaimers.

Try it on `samples/emails/`: a briefing, the same competition forwarded by a colleague, and a newsletter. Three emails in, two items out.

## Opportunity Matcher

`/opportunities` turns one pasted funding email into a call sheet. The inbox uses the same pipeline per item.

**How it works**

1. **Read the email.** One model call turns it into a structured card: type (competition, event, newsletter, admin), closing date, grant size, eligibility gates, themes, clinic dates. Nothing is inferred that the email does not say, except the funder when the email links to that funder's own application service.
2. **Work out the decide-by date.** The closing date is the wrong number to act on. `lib/opportunity-timing.ts` subtracts the lead time the bid really needs - drafting time implied by the scored questions, any review service that wants notice, time to assemble a consortium and to recruit a named end user - and shows its working so you can argue with it.
3. **Prefilter the register.** `lib/client-register.ts` scores every client with no model call at all. Only topical relevance (technology tags, or the competition's own theme words appearing in the coach's notes) can put a client on the shortlist. Sector overlap, grant appetite and recency only move a relevant client up or down - being spoken to last week is not a reason to ring someone again.
4. **Rank the shortlist.** One model call tests each client against each gate as pass / fail / **unknown**, and unknowns become questions to ask on the call rather than reasons to drop someone. An exclusion is only honoured if a gate positively fails; a client excluded merely for having a thin record is demoted to a long shot and stays on the sheet.

Everything ruled out is listed with its reason, so you can see where the list ends rather than wondering what was quietly dropped.

**The client register**

The register is a JSON file you load in the browser. It is kept in `localStorage` and sent only to score a match. Copy the shape from `samples/client-register.sample.json`; `samples/nmip-email.sample.txt` is a real competition briefing, with the people's names changed, to try it on.

Only `name` is required. Everything else is optional, because a register built from meeting notes is sparse by nature and the matcher is built to turn gaps into questions:

```json
{
  "clients": [
    {
      "id": "northgate-coatings",
      "name": "Northgate Coatings Ltd",
      "igs_owner": "Alex L",
      "last_contact": "2026-08-14",
      "is_business": true,
      "sme_status": "small",
      "sectors": ["advanced_manufacturing"],
      "tech_tags": ["coatings_surface", "advanced_materials"],
      "grant_appetite": "keen",
      "match_funding_capacity": "strong",
      "named_partners": ["University of Strathclyde"],
      "live_bids": [],
      "notes": "Low-friction anti-corrosion coatings for offshore wind turbine bearings.",
      "evidence": [
        { "field": "tech_tags", "quote": "We're developing a low-friction coating for offshore turbine bearings.", "meeting_date": "2026-08-14" }
      ]
    }
  ]
}
```

`sectors` and `tech_tags` must use keys from `lib/taxonomy.ts` - both sides of a match are normalised into that one vocabulary. Unknown tags are ignored with a warning. A client with notes but no tags is still shortlisted: the notes are swept for the same vocabulary.

`evidence` is what makes the call sheet trustworthy. Every claim the matcher makes has to trace back to something the client actually said, with the date they said it.

## Tech Stack

**Frontend:**
- Next.js 14+ (React)
- Tailwind CSS
- Custom UI Components (shadcn/ui-inspired)
- Zustand (State Management)
- Axios (HTTP Client)

**Backend:**
- FastAPI (Python)
- JWT Authentication
- OpenAI GPT-4o API
- python-docx for document processing

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd igs-summariser
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   npm install
   ```

4. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

### Running the Application

```bash
npm install
npm run build
npm start          # http://127.0.0.1:3000
```

`npm run dev` for development. Both bind to the loopback address, so the app is not reachable from the office network.

The FastAPI code under `backend/` and the Vercel, Railway, Docker and Azure deployment files are from an earlier design and are not used by this app.

### Configuration

Put your OpenAI key in `.env.local`:

```
OPENAI_API_KEY=sk-...
```

Optional:

- `IGS_DATA_DIR` - where the local database lives (default `./data`)
- `IGS_MAX_EMAILS_PER_SYNC` - model calls one sync may make (default 200)

## API Endpoints

### Authentication
- `POST /api/login` - Login and receive JWT token

### Processing
- `POST /api/summary` - Process transcript and generate summary
  - Requires: Authentication token, file or transcript text, AI parameters
  - Returns: Action points and recommendations

### Health
- `GET /health` - Check API health status

## Usage

1. Open `http://localhost:3000` in your browser
2. Login with demo credentials (or set up your own user in the backend)
3. Upload a transcript file or paste text
4. Adjust AI parameters if desired
5. Click "Generate Summary" to analyze the transcript
6. View results and download as needed

## Configuration

### AI Parameters

- **Temperature** (0-1): Higher = more creative, Lower = more deterministic
- **Top P** (0-1): Controls diversity via nucleus sampling
- **Frequency Penalty** (-2 to 2): Reduces repetition
- **Presence Penalty** (-2 to 2): Encourages discussing new topics

## Project Structure

```
igs-summariser/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Login page
│   ├── dashboard/         # Dashboard page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── *.tsx             # Feature components
├── lib/                  # Utilities and helpers
│   ├── auth-store.ts    # Zustand auth store
│   ├── auth-context.tsx # React auth context
│   └── api-client.ts    # API communication
├── backend/             # FastAPI backend
│   ├── main.py         # FastAPI application
│   └── requirements.txt # Python dependencies
├── package.json         # Frontend dependencies
├── tsconfig.json       # TypeScript config
├── tailwind.config.js  # Tailwind configuration
└── next.config.js      # Next.js configuration
```

## Customization

### Adding New Users

Edit `backend/main.py` and add users to `USERS_DB`:
```python
USERS_DB = {
    "user@example.com": {
        "password": "password123",
        "id": "user_unique_id",
    }
}
```

### Changing AI Prompts

Modify the prompts in `backend/main.py`:
- `action_points_prompt` - Controls action point extraction
- `recommendations_prompt` - Controls recommendation generation

### UI Customization

- Colors: Edit `app/globals.css` CSS variables
- Components: Located in `components/`
- Styling: Using Tailwind CSS

## Troubleshooting

### Backend Connection Error
- Ensure FastAPI server is running on http://localhost:8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### OpenAI API Error
- Verify `OPENAI_API_KEY` is set correctly in backend environment
- Check API key has access to gpt-4o model

### File Upload Issues
- Only .txt and .docx files are supported
- File size should be reasonable (< 50MB)

## Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Multiple authentication methods (OAuth, SSO)
- [ ] User dashboard with history
- [ ] Advanced transcript editing
- [ ] Multiple language support
- [ ] Email export functionality
- [ ] API rate limiting and usage tracking
- [ ] Premium features

## License

Proprietary - IGS

## Support

For issues or questions, please contact support@igs.com
