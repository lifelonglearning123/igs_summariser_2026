/**
 * The Salesforce supports an IGS can record a meeting against: the green rows
 * of the "SF Supports List", in the same order, so the list reads like the
 * Salesforce picklist.
 *
 * Every transcript is classified against all of them, and each has its own
 * write-up prompt that users can edit in the dashboard. `guidance` is what the
 * classifier reads; `description` is the one line the coach sees.
 */

interface ServiceFields {
  key: string;
  /** The support's name as it appears in Salesforce. */
  label: string;
  /** Short name for headings and the exported document. */
  shortLabel: string;
  /** One plain-English line telling the coach what the support is. */
  description: string;
  /** What the classifier looks for, and what not to confuse it with. */
  guidance: string;
  /**
   * A mention specific enough that the support is always put in front of the
   * coach, even if the model missed it. Programme names only; never a generic word.
   */
  namedBy?: RegExp;
  /** Default prompt for the support's Salesforce write-up. */
  writeUpPrompt: string;
}

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

const SERVICE_LIST = [
  {
    key: 'bsi_toolkit',
    label: 'BSI Business Growth ToolKit',
    shortLabel: 'BSI Business Growth ToolKit',
    description: "BSI's standards resources for Business Growth clients: which standards and certifications matter and how to use them.",
    guidance:
      'Discussed when the coach and client work through which standards, certifications or conformity routes (for example ISO 9001, ISO 13485, ISO 56001, a PAS or CE/UKCA marking) the business needs, or the coach points them to the BSI toolkit, British Standards Online or the Standards Development Portal. Not covered just because the business already holds a certificate or uses BSI as its auditor, and general regulatory talk alone does not count.',
    namedBy: /\b(?:BSI|Business Growth)\s+tool\s?kit\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the BSI Business Growth ToolKit support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about standards: which ones matter to the business, why, where it stands against them and how the coach helped.

Key details to cover, in this order:
Product or service - what the standards apply to
Standards identified - the standards, certifications or conformity marks discussed, named exactly as said
Why they matter - market access, customer or regulatory requirements, credibility or innovation management
Current position - what the business already holds or has in progress
Gaps and barriers - cost, capacity, knowledge or timescale issues
Support provided - toolkit resources, British Standards Online access, webinars or introductions the coach gave
Expected impact - what meeting the standards should unlock for the business

${WRITE_UP_FORMAT}`,
  },
  {
    // Key predates the Salesforce list; kept so saved prompt edits still apply.
    key: 'gbip',
    label: 'Global Business Innovation Programme (GBIP)',
    shortLabel: 'GBIP',
    description: 'Group visit to one overseas market, focused on one sector, to build international innovation partnerships.',
    guidance:
      "Discussed when the Global Business Innovation Programme (GBIP) is talked about: a specific GBIP market or sector visit, the client applying for or taking part in one, its fit for the programme, or the GBIP workshop, visit and follow-up stages. Not the Global Incubator Programme (GIP), which places companies in an overseas incubator, and not a DBT trade mission.",
    namedBy: /\bG[\s-]?BIP\b|\bGlobal Business Innovation Programme\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Global Business Innovation Programme (GBIP) discussion from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything relevant to the client's fit for and interest in a GBIP: the market they are targeting, the innovation they would take to it, how ready they are and what happens next.

Key details to cover, in this order:
Reason for GBIP interest - why the programme came up and how it fits the business
Target market - the country, region or market the business is looking at
Innovation focus - the product, service or technology being taken to that market
Programme details - the specific GBIP cohort, visit, deadline or dates mentioned
Readiness - capacity, resource, funding, IP or regulatory factors affecting participation
Expected benefits - what the business hopes to get from taking part
Support provided - the advice, introductions or referrals the coach gave, including any referral to the GBIP team

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'global_explorers',
    label: 'Global Explorers Grant (GE)',
    shortLabel: 'Global Explorers',
    description: "Innovate UK grant for a business's own project to explore overseas R&D and innovation partners.",
    guidance:
      "Discussed when the Global Explorers grant is talked about: the client's own project to explore R&D or innovation partners in another country, an application, the IGS endorsement it needs, or the project's costs and timing. Unlike GBIP and GIP, which are group programmes where Innovate UK arranges the travel, this is a grant to one business for its own project.",
    namedBy: /\bGlobal Explorers?\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Global Explorers Grant discussion from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's Global Explorers project: where they want to go, who they want to meet, why, and how far the application has got.

Key details to cover, in this order:
Target country and partners - the market and the R&D or innovation partners the business wants to explore
Project purpose - what the business hopes to learn, test or set up, and how it fits its internationalisation strategy
Planned activity - visits, meetings, events or trials, with any dates given
Costs and funding - the project budget, grant amount or match funding mentioned
Eligibility and endorsement - the client's support status, the IGS endorsement and any previous Global Explorers funding
Application status - whether it is planned, drafted or submitted, and the deadline
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'gip',
    label: 'Global Incubator Programme (GIP)',
    shortLabel: 'GIP',
    description: 'Places a small cohort with a leading overseas incubator for several months of mentoring and market visits.',
    guidance:
      'Discussed when the Global Incubator Programme (GIP) is talked about: a place with an overseas incubator or accelerator (for example in the USA, Canada, Singapore or Australia) through Innovate UK, applying for a cohort, the market visits or the mentoring. Not the Global Business Innovation Programme (GBIP), which is a one-week group market visit, and not a UK accelerator.',
    namedBy: /\bGIP\b|\bGlobal Incubator\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Global Incubator Programme (GIP) discussion from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything relevant to the client's fit for and progress on a GIP: the market and incubator, why it suits the business, how ready they are and what happens next.

Key details to cover, in this order:
Reason for GIP interest - why the programme came up and how it fits the business's growth plans
Target market and incubator - the country, city, incubator or cohort mentioned
Innovation focus - the product, service or technology the business would take into the incubator
Traction - the UK customers, sales or validation that make the business ready to expand
Readiness - capacity, time, funding or regulatory factors affecting participation
Programme details - application deadlines, visit dates or commitment fee mentioned
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'horizon_europe',
    label: 'Horizon Europe Pump Priming Grant',
    shortLabel: 'Horizon Europe Pump Priming',
    description: 'Small Innovate UK grant towards preparing a Horizon Europe bid: meeting partners, brokerage events, bid-writing help.',
    guidance:
      'Discussed when the client is preparing or considering a bid to a Horizon Europe call (including EIC Pathfinder or Transition) and the conversation covers building the consortium, finding EU partners, brokerage events, the National Contact Point, or the pump priming grant that pays for that preparation. A passing mention of Horizon Europe as one of many funding options is "mentioned" at most.',
    namedBy: /\bpump[\s-]?priming\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Horizon Europe Pump Priming support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's Horizon Europe bid and the preparation the pump priming grant would pay for.

Key details to cover, in this order:
Target call - the Horizon Europe call, cluster, pillar or EIC scheme named, with its deadline
Project idea - the innovation the bid would fund
Consortium - the partners in place, the partners still needed and the client's role
Preparation activity - travel to partners, brokerage or information events, network membership or bid-writing help planned
National Contact Point - any contact with, or referral to, the UK National Contact Point
Grant application - the pump priming amount, application status and timing
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'invest_ability',
    label: 'Invest-Ability',
    shortLabel: 'Invest-Ability',
    description: 'Invitation-only investment-readiness training and pitch panel for businesses planning an equity raise.',
    guidance:
      "Discussed when the Invest-Ability programme is talked about: the intensive investment-readiness training, the pitch panel, or whether the client should be put forward for a place given its planned equity raise, prior investment, technology readiness and traction. General fundraising advice without Invest-Ability belongs to Strategic Funding and Finance Support instead.",
    namedBy: /\binvest[\s-]ability\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Invest-Ability discussion from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's investment readiness and its fit for Invest-Ability.

Key details to cover, in this order:
Planned raise - the amount, type of investment and timescale
Investment history - equity already raised and from whom
Stage and traction - technology readiness, customers, revenue or market validation
Investor readiness - pitch, deck, financial model, valuation or due diligence gaps discussed
Programme fit - why Invest-Ability suits the business, and whether the coach will nominate it for training or the pitch panel
Programme details - cohort, training dates or pitch panel dates mentioned
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'ip_advance_audit',
    label: 'IP Advance - Audit',
    shortLabel: 'IP Advance Audit',
    description: "Part-funded IP audit by an IP professional, giving the business a tailored report on protecting and using its IP.",
    guidance:
      "Discussed when an IP audit is talked about: the IPO's IP Advance audit, having a patent or trade mark attorney review the business's intellectual property, or whether the client should apply for one. Not IP Advance - Access, which funds carrying out an existing IP strategy, and not general IP chat or the business paying for its own patent filings.",
    namedBy: /\bIP\s+Advance\b(?![\s-]*Access)|\bIP\s+audit/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the IP Advance - Audit support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's intellectual property and the case for an IP audit.

Key details to cover, in this order:
IP assets - the inventions, brands, designs, software, data or know-how the business holds
Current protection - patents, trade marks, designs, NDAs or agreements already in place
IP risks and gaps - exposure, ownership questions, competitor or freedom-to-operate concerns raised
Why an audit now - the growth plan, investment, partnership or market entry that makes it timely
Audit arrangements - the IP professional involved, the business's contribution, application status and timing
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'rto_catapult_grant',
    label: 'RTO Catapult Grant',
    shortLabel: 'RTO Catapult Grant',
    description: 'Fully funded grant for a business to buy services from a Catapult or research and technology organisation.',
    guidance:
      "Discussed when the client would buy technical services from a Catapult or research and technology organisation (RTO), such as testing, technical expertise, regulatory advice or partner finding, and the RTO Catapult grant (formerly the RTO voucher) to fund it comes up. Not a Knowledge Transfer Partnership or collaborative R&D with a Catapult, and not a client that is itself an RTO.",
    namedBy: /\bRTO\s*(?:and|&|\/)?\s*Catapult\b|\bCatapult\s+grant\b|\bRTO\s+(?:grant|voucher)\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the RTO Catapult Grant support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the technical challenge and the Catapult or RTO the client would work with.

Key details to cover, in this order:
Technical challenge - the problem the business needs help with
Catapult or RTO - the organisation named and the service it would provide
Planned work - testing, trials, expertise, regulatory advice or other work, with its purpose
Cost and grant - the quoted cost, grant amount and any contribution from the business
Action plan link - how the work fits the IGS action plan and the client's support status
Expected outcome - what the business will be able to do once the work is done
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'secure_innovation',
    label: 'Secure Innovation Security Review',
    shortLabel: 'Secure Innovation Review',
    description: "Subsidised NPSA and NCSC-backed review of how well the business protects its ideas, people and systems.",
    guidance:
      "Discussed when the business's own protective security is talked about: Secure Innovation, a security review, threats from state actors or espionage, insider risk, security due diligence on investors or partners, supply-chain security, or cyber security of its own systems and Cyber Essentials. A company that sells cyber security products is not covered by that alone, and an IP audit is a separate support.",
    namedBy: /\bSecure\s+Innovation\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Secure Innovation Security Review support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about how the business protects its innovation and why a security review is relevant. Keep the detail proportionate: record what was said, not sensitive specifics of the business's security arrangements.

Key details to cover, in this order:
What needs protecting - the technology, IP, data or know-how at stake
Sector and exposure - the sector, and any sensitive market, investor, partner or supply-chain exposure raised
Current security position - governance, culture, cyber and physical security as described
Risks raised - state threats, insider risk, investor or partner due diligence, or cyber concerns
Review arrangements - eligibility, the business's contribution, application status and timing
Support provided - the advice, introductions or referrals the coach gave, including Cyber Essentials

${WRITE_UP_FORMAT}`,
  },
  {
    // Key predates the Salesforce list; kept so saved prompt edits still apply.
    key: 'funding_and_investment',
    label: 'Strategic Funding and Finance Support',
    shortLabel: 'Funding and Finance',
    description: 'Coaching on funding strategy: what the business needs, and the right mix of grants, loans and investment.',
    guidance:
      'Discussed when the conversation includes any substantive discussion of funding: grants (for example Innovate UK), loans or debt finance, equity investment, investors, R&D tax credits, fundraising or finance applications, whether secured, applied for or planned. Record it alongside a named funding support (such as Invest-Ability or a specific grant) when the coach also worked on the wider funding strategy.',
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Strategic Funding and Finance Support delivered in this meeting, for the client's Salesforce record.

Read the transcript and draw out everything relevant to the client's access to finance: what they need, the routes discussed, how far they have got, what is holding them back, the support you gave and what happens next.

Key details to cover, in this order:
Funding need - how much the business is seeking, what for, and by when
Current position - stage, revenue, runway, existing funding or financial position as described
Funding routes discussed - grants (name the funder and competition), debt or loan finance, equity or investment, R&D tax credits, match funding
Progress to date - applications submitted, funding secured, investor conversations held, with amounts and dates
Barriers - investment readiness, financial information, IP, valuation, eligibility or anything else holding the business back
Support provided - the advice, introductions or referrals the coach gave, including any referral to a finance specialist or partner organisation
Outputs and outcomes - any of Grant Funding Secured, Debt Finance Raised or Investment Raised that were confirmed, with the amount and date

${WRITE_UP_FORMAT}`,
  },
  {
    // Key predates the Salesforce list; kept so saved prompt edits still apply.
    key: 'strategic_innovation_coaching',
    label: 'Strategic Innovation Management Support',
    shortLabel: 'Innovation Management',
    description: 'Coaching on innovation strategy and process, and on turning new products or services into growth.',
    guidance:
      "Discussed when the conversation involves coaching, advice or strategic discussion with the business about its growth, strategy, innovation, R&D, product roadmap, operations, team or plans, or its general IP strategy. Almost every coaching session covers this.",
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Strategic Innovation Management Support delivered in this meeting, for the client's Salesforce record.

Read the transcript and draw out everything that evidences the coaching provided: the business context, what was explored, the input you gave and what the client agreed to do.

Key details to cover, in this order:
Business context - what the company does, its stage, size and markets
Strategic priorities - the growth ambitions and objectives discussed
Innovation activity - R&D, new products or services, technology or process innovation
Challenges - the barriers, risks and constraints explored
Coaching input - the advice, challenge and frameworks the coach provided
Referrals and support - any onward referrals or other support signposted
Expected impact - the outcomes the business expects from acting on the session

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'internationalisation',
    label: 'Strategic Internationalisation Support',
    shortLabel: 'Internationalisation',
    description: 'Coaching on entering new markets: choosing markets, entry routes, regulation and finding overseas partners.',
    guidance:
      'Discussed when the coach works with the client on selling or partnering outside the UK: choosing target markets, exporting, overseas distributors or customers, market-entry regulation, or finding partners through the Enterprise Europe Network or matchmaking events. Record it alongside GBIP, GIP, Global Explorers or Horizon Europe when the coach also worked on the wider international plan.',
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Strategic Internationalisation Support delivered in this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's plans for new markets: where, why, how and what stands in the way.

Key details to cover, in this order:
Target markets - the countries or regions discussed and why
Current international activity - existing exports, customers, distributors or partners overseas
Market entry route - direct sales, distributors, licensing, partnerships or setting up locally
Regulation and standards - approvals, certification or compliance needed for those markets
Partner search - Enterprise Europe Network profiles, matchmaking events or introductions
Programmes considered - GBIP, GIP, Global Explorers, Horizon Europe or DBT support mentioned
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
  {
    key: 'women_in_innovation',
    label: 'Women In Innovation',
    shortLabel: 'Women in Innovation',
    description: "Innovate UK's Women in Innovation Awards: grant funding and a year of tailored support for women-led businesses.",
    guidance:
      "Discussed only when the Women in Innovation Awards are talked about: applying, eligibility, an award the client holds, or the support that comes with it. Never infer that it applies from a founder's name or voice, or because the business is led by a woman.",
    namedBy: /\bWomen\s+in\s+Innovation\b/i,
    writeUpPrompt: `You are an Innovation and Growth Specialist (IGS) writing up the Women In Innovation support from this meeting, for the client's Salesforce record.

Read the transcript and draw out everything about the client's Women in Innovation application or award and the support around it.

Key details to cover, in this order:
Status - whether the client is considering, applying for or already holds an award, and the round
Innovation - the product or service at the heart of the application
Stage and traction - the business's stage, revenue and plans to raise investment
Application or project - key points of the application, or progress on the funded project
Support needs - coaching, media training, investment connections or other help discussed
Support provided - the advice, introductions or referrals the coach gave

${WRITE_UP_FORMAT}`,
  },
] as const satisfies readonly ServiceFields[];

export type ServiceKey = (typeof SERVICE_LIST)[number]['key'];

export type ServiceDefinition = ServiceFields & { key: ServiceKey };

export const SERVICES: readonly ServiceDefinition[] = SERVICE_LIST;

/**
 * The prompt used to generate each service's Salesforce write-up. Users can
 * edit these in the dashboard; the API falls back to these defaults.
 */
export const DEFAULT_WRITE_UP_PROMPTS = Object.fromEntries(
  SERVICES.map((service) => [service.key, service.writeUpPrompt])
) as Record<ServiceKey, string>;

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && SERVICES.some((service) => service.key === value);
}
