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
    label: 'GBIP / GIP (Global Business Innovation Programme)',
    guidance:
      'Covered only when the transcript mentions GBIP or GIP, the Global Business Innovation Programme, by acronym or by name.',
  },
] as const;

export type ServiceKey = (typeof SERVICES)[number]['key'];

/** Deterministic trigger for the GBIP service: the acronyms GBIP or GIP. */
export const GBIP_TRIGGER_PATTERN = /\bG[\s-]?BIP\b|\bGIP\b/i;

/* ------------------------------------------------------------------ */
/* Per-service write-ups                                               */
/* ------------------------------------------------------------------ */

/**
 * Shared tail of every write-up prompt: the output shape a coach can paste
 * straight into Salesforce, plus the "don't invent anything" rules.
 */
const WRITE_UP_FORMAT = `Format:
Produce the output exactly as below, with no preamble, no closing remarks and no mention of these instructions.

Summary:
[One paragraph of 120 to 180 words, third person, past tense, ready to paste into Salesforce.]

Key details:
[One bullet point per item listed above, in that order, with the label in bold followed by a : (colon) and then the detail. Where the transcript does not cover an item, write "Not discussed" as its detail.]

Next steps:
[A numbered list of no more than four agreed actions, each naming the owner and any timescale that was given. If nothing was agreed, write "None agreed".]

Rules:
Use only what the transcript supports. Never invent figures, dates, organisations, programmes or commitments.
Quote amounts, dates, funder names and programme names exactly as they were said.
Keep to this service. The meeting may have covered other ground; bring it in only where it bears directly on this service, and keep the next steps to the actions that belong to it.
Write plainly for a colleague reading the CRM record, not for the client.`;

export const DEFAULT_COACHING_WRITE_UP_PROMPT = `You are an Innovation and Growth Specialist (IGS) writing up the Strategic and Innovation Coaching delivered in this meeting, for the client's Salesforce record.

Read the transcript and draw out everything that evidences the coaching provided: the business context, what was explored, the input you gave and what the client agreed to do.

Key details to cover, in this order:
Business context - what the company does, its stage, size and markets
Strategic priorities - the growth ambitions and objectives discussed
Innovation activity - R&D, new products or services, technology or process innovation
Challenges - the barriers, risks and constraints explored
Coaching input - the advice, challenge and frameworks the coach provided
Referrals and support - any onward referrals or other support signposted
Expected impact - the outcomes the business expects from acting on the session

${WRITE_UP_FORMAT}`;

export const DEFAULT_FUNDING_WRITE_UP_PROMPT = `You are an Innovation and Growth Specialist (IGS) writing up the Access to Finance support delivered in this meeting, for the client's Salesforce record.

Read the transcript and draw out everything relevant to the client's access to finance: what they need, the routes discussed, how far they have got, what is holding them back, the support you gave and what happens next.

Key details to cover, in this order:
Funding need - how much the business is seeking, what for, and by when
Current position - stage, revenue, runway, existing funding or financial position as described
Funding routes discussed - grants (name the funder and competition), debt or loan finance, equity or investment, R&D tax credits, match funding
Progress to date - applications submitted, funding secured, investor conversations held, with amounts and dates
Barriers - investment readiness, financial information, IP, valuation, eligibility or anything else holding the business back
Support provided - the advice, introductions or referrals the coach gave, including any referral to a finance specialist or partner organisation
Outputs and outcomes - any of Grant Funding Secured, Debt Finance Raised or Investment Raised that were confirmed, with the amount and date

${WRITE_UP_FORMAT}`;

export const DEFAULT_GBIP_WRITE_UP_PROMPT = `You are an Innovation and Growth Specialist (IGS) writing up the Global Business Innovation Programme (GBIP / GIP) discussion from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything relevant to the client's fit for and interest in a GBIP: the market they are targeting, the innovation they would take to it, how ready they are and what happens next.

Key details to cover, in this order:
Reason for GBIP interest - why the programme came up and how it fits the business
Target market - the country, region or market the business is looking at
Innovation focus - the product, service or technology being taken to that market
Programme details - the specific GBIP or GIP cohort, visit, deadline or dates mentioned
Readiness - capacity, resource, funding, IP or regulatory factors affecting participation
Expected benefits - what the business hopes to get from taking part
Support provided - the advice, introductions or referrals the coach gave, including any referral to the GBIP team

${WRITE_UP_FORMAT}`;

/**
 * The prompt used to generate each service's Salesforce write-up. Users can
 * edit these in the dashboard; the API falls back to these defaults.
 */
export const DEFAULT_WRITE_UP_PROMPTS: Record<ServiceKey, string> = {
  strategic_innovation_coaching: DEFAULT_COACHING_WRITE_UP_PROMPT,
  funding_and_investment: DEFAULT_FUNDING_WRITE_UP_PROMPT,
  gbip: DEFAULT_GBIP_WRITE_UP_PROMPT,
};

/** Short names used on buttons and in the exported document. */
export const SERVICE_SHORT_LABELS: Record<ServiceKey, string> = {
  strategic_innovation_coaching: 'Strategic and Innovation Coaching',
  funding_and_investment: 'Access to Finance',
  gbip: 'GBIP / GIP',
};

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && SERVICES.some((service) => service.key === value);
}
