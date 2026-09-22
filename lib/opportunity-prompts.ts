/**
 * Prompts for the two model calls behind the call sheet: reading the email,
 * and ranking the shortlist against it.
 *
 * Both are exported so they can be edited in the UI the same way the summary
 * prompts are, and both lean hard on one rule - silence in a client record is
 * `unknown`, never a pass and never a fail. A matcher that guesses at the gaps
 * produces a call sheet that reads well and gets a coach embarrassed on the
 * phone, which is worse than no call sheet at all.
 */

import { taxonomyForPrompt } from './taxonomy';
import type { ClientMatch, OpportunityCard, OpportunityTiming } from './opportunity-types';

export const DEFAULT_OPPORTUNITY_PROMPT = `You read the funding and innovation emails that land in an Innovation and Growth Specialist's inbox, and turn them into a structured record.

First decide what kind of email this is:
competition - a funding call a client could apply to
event - a webinar, briefing, clinic or networking session with nothing to apply for
reminder - a nudge about a competition covered elsewhere, with no new detail
newsletter - a round-up of several items, none of them the point of the email
admin - internal or administrative correspondence
other - anything else

Set "actionable" to true only for a competition a client could actually apply to.

Then pull out the detail:

Dates. Give every date as YYYY-MM-DD. UK emails write dates day first, so 28.10.2026 is 28 October 2026, never 10 August. If a date is not stated, use null.

Money. Give grant_min, grant_max and total_pot as plain numbers in pounds, so a grant of "£500k-£1m" is 500000 and 1000000, and a "£12m" pot is 12000000. Use null where a figure is not given.

Hard gates. Every eligibility rule the email states, written as a testable statement about an applicant, one rule per entry. Anything the email says an applicant "must" do is a hard gate. Rules about who may or may not count towards a requirement belong in the same entry as the requirement itself. Give each a short lower-case id with underscores.

Soft signals. What a bid has to argue well without it being an eligibility rule, for example a route to scale, or a named barrier to adoption that must be addressed.

Themes. The competition's themes and, under each, its sub-themes, worded as the email words them.

Support dates. Clinics, briefings, brokerage events and review services. Where a review service asks for a draft a fixed period before the deadline rather than on a date, put the date as null, say so in the note, and put the number of days in review_lead_days.

Application effort. scored_questions is how many scored questions there are; word_limit is the word count allowed per question. Both null if not stated.

Classification. Choose sectors and technology tags from these lists only, and use the keys exactly. Choose only what the email actually supports; an empty list is fine.

${taxonomyForPrompt()}

Rules:
Use only what the email says. Never infer a deadline, a figure or a theme that is not there.
The one inference allowed: where the email does not name the funder but links to a funder's own application service, name the funder from that link.
Where the email is silent, use null or an empty list.
Put anything you had to read between the lines into "warnings".
The summary is two or three sentences, plain, for a coach who will not read the email.`;

export const DEFAULT_MATCH_PROMPT = `You are helping an Innovation and Growth Specialist (IGS) decide which of their clients to contact about a funding competition.

You are given the competition, its eligibility gates, and a shortlist of clients. Each client record is built from notes taken in real meetings, so it is patchy: it will be silent on most things.

For every client, test each hard gate and return one of:
pass - the client record positively shows the gate is met. Quote what shows it.
fail - the client record positively shows the gate cannot be met.
unknown - the record does not say. This will be most gates for most clients.

Never turn silence into a pass or a fail. If a record does not mention match funding, that is unknown, not a fail. Every unknown on a gate that matters becomes a question in questions_to_ask, phrased as the coach would ask it on the call.

Then give a verdict. Judge it on the fit, not on how much the record happens to say:
strong - the record positively evidences what they work on, and it fits a theme. Unknown gates do not stop a verdict being strong: nearly every gate will be unknown for nearly every client, and they are what the call is for.
possible - the fit is plausible but rests on inference rather than on something the client actually said.
long_shot - the fit is thin, or there is a real obstacle such as no capacity to write the bid before the deadline.
excluded - a hard gate positively fails on the evidence, for example the client is not a business at all.

Excluding a client is a strong claim and needs evidence for it. A thin record is a reason to ask questions, not a reason to exclude: a client whose work fits a theme but whose record says nothing about partners, end users or match funding is possible or long_shot, never excluded. Not having spoken to a client for a year is a reason to ring them, never a reason to leave them off.

Score 0 to 100 for ordering within a verdict. Excluded clients score below 20. Where two clients fit equally well, rank the one who passes gates on evidence above the one whose gates are all unknown.

For each client also give:
why - two or three sentences a coach could read out, in their own terms, saying what makes this client worth a call. Every claim in it must be traceable to the client record.
evidence - the quotes from the record that back the "why", with their meeting dates where the record gives one.
gaps - what the client would have to line up to be eligible, shortest path first.
opening_line - one sentence to open the call or email with, naming the hook that is most likely to land: a deadline, a clinic date, or something the client said they wanted.

Rules:
Use only the client records. Never invent a capability, a partner, a figure or a conversation.
Do not describe a client as working on something the record does not mention.
Where the record is thin, say so in the "why" rather than padding it.
Return every client you were given, each with a verdict and a full gate table. Do not leave a client out: a client you would not ring is an "excluded" verdict with the failing gate shown, so the coach can see what was ruled out and why.
Rank the list so the coach can work down it in order and stop when they run out of time.`;

/** Everything the model needs to know about the competition, as compact text. */
export function renderOpportunityForPrompt(opportunity: OpportunityCard, timing: OpportunityTiming): string {
  const lines: string[] = [];

  lines.push(`Competition: ${opportunity.name ?? 'not named'}`);
  if (opportunity.funder) lines.push(`Funder: ${opportunity.funder}`);
  lines.push(`Summary: ${opportunity.summary}`);

  if (opportunity.grant_min || opportunity.grant_max) {
    const min = opportunity.grant_min ? `£${opportunity.grant_min.toLocaleString('en-GB')}` : 'unstated';
    const max = opportunity.grant_max ? `£${opportunity.grant_max.toLocaleString('en-GB')}` : 'unstated';
    lines.push(`Grant size: ${min} to ${max}`);
  }
  if (opportunity.closing_date) lines.push(`Closes: ${opportunity.closing_date}`);
  if (timing.decide_by) {
    lines.push(`Realistic decide-by date: ${timing.decide_by} (${timing.days_to_decide} days away)`);
  }
  if (opportunity.project_window) lines.push(`Project window: ${opportunity.project_window}`);

  if (opportunity.themes.length) {
    lines.push('', 'Themes:');
    for (const theme of opportunity.themes) {
      lines.push(`- ${theme.name}${theme.sub_themes.length ? `: ${theme.sub_themes.join('; ')}` : ''}`);
    }
  }

  if (opportunity.hard_gates.length) {
    lines.push('', 'Hard gates (test each client against every one of these):');
    for (const gate of opportunity.hard_gates) {
      lines.push(`- [${gate.id}] ${gate.requirement}`);
    }
  }

  if (opportunity.soft_signals.length) {
    lines.push('', 'The bid must also argue:');
    for (const signal of opportunity.soft_signals) lines.push(`- ${signal}`);
  }

  if (timing.upcoming_support.length) {
    lines.push('', 'Support still available (useful as a hook for the call):');
    for (const support of timing.upcoming_support) {
      lines.push(`- ${support.label}${support.date ? ` on ${support.date}` : ''}${support.note ? ` (${support.note})` : ''}`);
    }
  }

  return lines.join('\n');
}

/** The full user message for the matching call. */
export function buildMatchPrompt(
  promptText: string,
  opportunity: OpportunityCard,
  timing: OpportunityTiming,
  clients: Record<string, unknown>[]
): string {
  return [
    promptText,
    '',
    'THE COMPETITION',
    renderOpportunityForPrompt(opportunity, timing),
    '',
    'THE SHORTLISTED CLIENTS',
    JSON.stringify(clients, null, 1),
  ].join('\n');
}

/** Plain-text call sheet, for the clipboard. */
export function matchesToPlainText(
  opportunity: OpportunityCard,
  timing: OpportunityTiming,
  matches: ClientMatch[]
): string {
  const lines: string[] = [];
  lines.push(opportunity.name ?? 'Funding opportunity');
  if (opportunity.funder) lines.push(opportunity.funder);
  if (timing.decide_by) lines.push(`Decide by ${timing.decide_by} (closes ${timing.closing_date})`);
  lines.push('');

  matches.forEach((match, index) => {
    lines.push(`${index + 1}. ${match.client_name} - ${match.verdict.replace('_', ' ').toUpperCase()}`);
    if (match.igs_owner) lines.push(`   Owner: ${match.igs_owner}`);
    lines.push(`   Why: ${match.why}`);
    if (match.questions_to_ask.length) {
      lines.push('   Ask:');
      for (const question of match.questions_to_ask) lines.push(`     - ${question}`);
    }
    if (match.gaps.length) {
      lines.push('   Gaps:');
      for (const gap of match.gaps) lines.push(`     - ${gap}`);
    }
    lines.push(`   Open with: ${match.opening_line}`);
    lines.push('');
  });

  return lines.join('\n');
}
