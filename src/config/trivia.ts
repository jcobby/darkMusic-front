/**
 * DMY Trivia questions. `answer` is the right option; the game shuffles the
 * order and picks 8 per play. Every answer comes from the site's own content
 * (artist bio, releases and credits, label story). Keep it to the music: Lenko
 * Psycho's songs, lyrics, videos, collaborations and DMY releases.
 */

export interface TriviaQuestion {
  q: string;
  answer: string;
  wrong: [string, string, string];
}

export const TRIVIA: TriviaQuestion[] = [
  {
    q: "What's Lenko Psycho's latest single?",
    answer: "Stubborn Abele",
    wrong: ["It's Working", "Shiver", "Ready"],
  },
  {
    q: "Who produced “Stubborn Abele”?",
    answer: "Roddy Hanz",
    wrong: ["Appietus", "Lenko Psycho", "Vince Cobbs"],
  },
  {
    q: "Who features on “It's Working”?",
    answer: "Lalid & Kofi Mole",
    wrong: ["Okese1", "Lalid & Okese1", "Nobody — it's a solo track"],
  },
  {
    q: "Who mixed and mastered “It's Working”?",
    answer: "Appietus",
    wrong: ["Roddy Hanz", "Vince Cobbs", "Lenko Psycho"],
  },
  {
    q: "What's the name of Lenko Psycho's fan community?",
    answer: "Lenko Army🧠🖤 (LA)",
    wrong: ["The Psycho Squad", "Yard Gang", "The DMY Fam"],
  },
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
];

export const TRIVIA_PER_GAME = 8;
