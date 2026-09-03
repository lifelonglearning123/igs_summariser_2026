/**
 * Default prompts and service definitions shared by the API routes and the UI.
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

/**
 * The services an IGS can file a meeting under, with the guidance the
 * classifier uses to decide whether the meeting covered each one.
 */
export const SERVICES = [
  {
    key: 'strategic_innovation_coaching',
    label: 'Strategic and Innovation Coaching',
    guidance:
      'Covered when the conversation involves coaching, advice or strategic discussion with the business about its growth, strategy, innovation, operations, team, markets or plans. Almost every coaching session covers this.',
  },
  {
    key: 'funding_and_investment',
    label: 'Funding and Investment',
    guidance:
      'Covered when the conversation includes any substantive discussion of funding: grants (for example Innovate UK), loans or debt finance, equity investment, investors, fundraising or finance applications, whether secured, applied for or planned.',
  },
  {
    key: 'gbip',
    label: 'GBIP / BIP (Global Business Innovation Programme)',
    guidance:
      'Covered only when the transcript mentions GBIP or GIP, the Global Business Innovation Programme, by acronym or by name.',
  },
] as const;

export type ServiceKey = (typeof SERVICES)[number]['key'];

/** Deterministic trigger for the GBIP service: the acronyms GBIP or GIP. */
export const GBIP_TRIGGER_PATTERN = /\bG[\s-]?BIP\b|\bGIP\b/i;
