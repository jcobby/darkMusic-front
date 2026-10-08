/**
 * DMY Trivia questions. `answer` is the right option; the game shuffles the
 * order and picks 8 per play. Every answer comes from the site's own content
 * (artist bio, label story, contest and Models pages) — keep it that way.
 */
export interface TriviaQuestion {
  q: string;
  answer: string;
  wrong: [string, string, string];
}

export const TRIVIA: TriviaQuestion[] = [
  {
    q: "Where did Lenko Psycho record his first studio session?",
    answer: "Escondido, San Diego",
    wrong: ["Accra, Ghana", "Atlanta, Georgia", "London, UK"],
  },
  {
    q: "Dark Music Yard is built on one principle. What is it?",
    answer: "Only good music",
    wrong: ["Hits over everything", "Follow the trends", "Fast and loud"],
  },
  {
    q: "Who features on Lenko Psycho's single “Shiver”?",
    answer: "Okese1",
    wrong: ["Nobody — it's a solo track", "The DMY choir", "A mystery guest"],
  },
  {
    q: "What does DMY stand for?",
    answer: "Dark Music Yard",
    wrong: ["Dope Music Youth", "Dark Money Yard", "Da Music Yard"],
  },
  {
    q: "Which genre is DMY's main focus?",
    answer: "Hip-hop",
    wrong: ["Highlife", "Gospel", "Afro-house"],
  },
  {
    q: "Lenko Psycho is building his name as a new voice in which country's hip-hop?",
    answer: "Ghana",
    wrong: ["Nigeria", "South Africa", "The USA"],
  },
  {
    q: "How much does the winner of each 2026 video contest take home?",
    answer: "GH₵4,000",
    wrong: ["GH₵400", "GH₵1,000", "GH₵10,000"],
  },
  {
    q: "When does voting close for the 2026 video contests?",
    answer: "31 December 2026",
    wrong: ["1 January 2027", "31 October 2026", "15 December 2026"],
  },
  {
    q: "How many points does a daily check-in earn on your DMY account?",
    answer: "5",
    wrong: ["1", "10", "50"],
  },
  {
    q: "On DMY Models, what's the lowest starting rate a model can set?",
    answer: "GH₵2,000",
    wrong: ["GH₵200", "GH₵500", "GH₵5,000"],
  },
];

export const TRIVIA_PER_GAME = 8;
