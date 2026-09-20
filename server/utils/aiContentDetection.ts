import { VerificationAiAssessment } from '../../src/types';

/**
 * Cautious heuristic assessment for AI-generated application text/portfolio profiles.
 * IMPORTANT: AI likelihood must NEVER automatically approve or reject verification.
 * The administrator must inspect the actual evidence.
 */
export function evaluateAiContentLikelihood(
  justification: string = '',
  evidenceLinks: string[] = [],
  evidenceDocs: string[] = []
): VerificationAiAssessment {
  let aiScore = 15; // baseline low
  const text = justification.toLowerCase();

  // Typical boilerplate AI phrasing markers
  const boilerplatePhrases = [
    'as an ai',
    'in the realm of',
    'testament to',
    'delve into',
    'tapestry of',
    'beacon of',
    'seamlessly',
    'furthermore',
    'pinnacle of',
    'fostering a vibrant ecosystem',
    'endeavoring to synthesize',
    'in conclusion'
  ];

  let phraseMatches = 0;
  for (const phrase of boilerplatePhrases) {
    if (text.includes(phrase)) {
      phraseMatches++;
      aiScore += 18;
    }
  }

  // Very short generic text
  if (justification.trim().split(/\s+/).length < 8) {
    aiScore += 10;
  }

  // Strong authentic signals (reduces AI likelihood)
  if (evidenceLinks.length >= 2) {
    aiScore -= 15;
  }
  if (evidenceDocs.length > 0) {
    aiScore -= 10;
  }
  if (text.includes('github.com') || text.includes('x.com') || text.includes('twitter.com') || text.includes('artstation')) {
    aiScore -= 10;
  }

  // Clamp 5 - 95
  aiScore = Math.max(5, Math.min(95, aiScore));

  let likelihood: 'low' | 'medium' | 'high' = 'low';
  let notes = 'Application demonstrates authentic creator voice with verifiable personal evidence.';

  if (aiScore >= 65) {
    likelihood = 'high';
    notes = 'Contains structured synthetic phrasing patterns or minimal personalized artifacts.';
  } else if (aiScore >= 40) {
    likelihood = 'medium';
    notes = 'Balanced structure with partial stylized phrasing. Standard manual review recommended.';
  }

  return {
    likelihood,
    score: aiScore,
    label: likelihood === 'low' ? 'Low' : likelihood === 'medium' ? 'Medium' : 'High',
    disclaimer: 'Automated estimate — may be inaccurate. Human review required.',
    notes
  };
}
