/**
 * Default summary prompts shared by the API routes and the UI. The Salesforce
 * supports and their write-up prompts live in `services.ts`.
 *
 * The two summary prompts are the client-approved wording from the original
 * Streamlit app (ai.py). Users can edit them in the dashboard; the API falls
 * back to these defaults when no prompt is supplied.
 */

export const DEFAULT_MAIN_POINTS_PROMPT = `Extract Basic Information
Title
Date/Time
Participants

Generate a Concise Meeting Summary
Summarize the main discussion points in 150 words or fewer.
Include strategic priorities, key decisions, and important challenges.

Format:
Structure the output as follows:

Basic Information:
[A bullet point for each of Title, Date/Time and Participants, with the label in bold followed by a : (colon) and then the value. If a value is not stated in the transcript, write "Not explicitly stated"]

Concise Meeting Summary:
[One paragraph of 150 words or fewer]`;

export const DEFAULT_RECOMMENDATIONS_PROMPT = `Identify Business Insights and Challenges
Review the transcript for insights, opportunities and challenges facing the client.

Identify Outputs & Outcomes
Review the transcript for any mention of the following Outputs & Outcomes:
Accessed New Markets
Debt Finance Raised
EEN Network Advisory Achievement
Grant Funding Secured
Investment Raised
Jobs Created
Jobs Maintained
Partnering Achievement
Cross-reference each output and include it in the "Outputs & Outcomes" section if mentioned.

Identify Referrals to Other Support
Review the transcript for referrals and match against the following categories:
DBT (DIT)
Local Service (Growth Hub)
Knowledge Base/Universities
Knowledge Transfer Network
National Enquiry Gateway
Catapult
Private Sector Support
Scale Up Programme EOI
Peer-to-Peer Network
Other (please state)

Identify Key Actions
Extract no more than five clear and actionable steps for participants to progress.

Format:
Structure the output as follows:

Business Insights/Opportunities/Challenges:
[Generate a bullet point list presenting each I/O/C in bold followed by a : (colon) and then an explanation]

Outputs & Outcomes:
[Generate a bullet point list presenting each Output and Outcome in bold followed by a : (colon) and then an explanation]

Referrals to Other Support:
[Generate a bullet point list presenting each I/O/C in bold followed by a : (colon) and then an explanation]

Actions:
[Generate a numbered bullet point list of no more than five actions presenting each Action/Activity in bold followed by a : (colon) and then an explanation]

Always include all four section headings in this order. If nothing applies under a heading, write "None identified".`;
