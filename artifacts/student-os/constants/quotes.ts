export const QUOTES = [
  "The secret of getting ahead is getting started.",
  "It always seems impossible until it's done.",
  "Don't watch the clock; do what it does. Keep going.",
  "Believe you can and you're halfway there.",
  "Success is the sum of small efforts repeated every day.",
  "You don't have to be great to start, but you have to start to be great.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream big. Start small. Act now.",
  "Education is the most powerful weapon you can use to change the world.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Your only limit is your mind.",
  "Do something today that your future self will thank you for.",
  "Little by little, a little becomes a lot.",
  "Study now, shine later.",
  "Every day is a chance to learn something new.",
  "The expert in anything was once a beginner.",
  "Small steps every day add up to big results.",
  "Strive for progress, not perfection.",
  "Knowledge is power. Stay curious.",
  "One day or day one. You decide.",
  "Be the student you needed when you were struggling.",
  "Learning is not attained by chance; it must be sought with ardor.",
  "The beautiful thing about learning is that nobody can take it away from you.",
];

export function getDailyQuote(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}
