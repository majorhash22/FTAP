/* FTAP content settings. Edit this file, save it, then refresh index.html.
   Paths are relative to index.html. Keep commas and quotation marks intact.
   Never put bot tokens, passwords, or private details in this public file. */
window.FTAP_CONFIG = {
  name: 'FTAP',
  fullName: 'Full-Time Adulting, Part-Time Gaming',
  discordInvite: '', // Add your https://discord.gg/... invite when ready.
  applicationChannel: '', // Optional: e.g. #introductions.
  // Leave blank when the Node server hosts this site. For a separately hosted
  // static frontend, set the backend's HTTPS origin, e.g. https://ftap-api.example.com/.
  // API keys and admin passwords belong only in server environment variables.
  matchApiBaseUrl: '',
  // Results on /matches. Keys are the match IDs printed beside each fixture.
  // Team IDs: wraith, kneegrow, kat-and-friends, apex, baddiengan, scourge.
  // Add confirmed results here, for example:
  // 'r1-m1': { winner: 'wraith', mvp: { name: 'Kobe', team: 'wraith' } }
  // Omit winner or mvp until confirmed. No result is assumed from the date.
  matchResults: {},
  announcements: [
    {
      category: 'Community',
      title: 'Welcome to FTAP',
      image: 'assets/optimized/vault.webp',
      imagePosition: '80% 50%',
      summary: 'Pag umay ka na sa buhay sa labas, tara! pasok agad sa disc.',
      body: 'Welcome to Full-Time Adulting, Part-Time Gaming. We are a community for competitive games, social hangouts, and friendships that go beyond the screen. Real life comes first. Drop into voice when you can, find a party, and make yourself at home.'
    },
    {
      category: 'Around the server',
      title: 'Your community, in one place',
      image: 'assets/optimized/icefrogdota.webp',
      imagePosition: '48% 50%',
      summary: "Meet the crew, find the next event, and catch up on what's latest.",
      body: 'This is the FTAP community hub. Member spotlights, event dates, staff introductions, and community memories will live here as they are shared. Until then, Discord is the place to find the latest conversations and plans.'
    }
  ],
  members: [],
  /* Example member (replace these values with real, approved details):
  members: [{
    name: 'Display name', pronouns: '', role: 'Community member',
    games: ['Dota 2'], playstyle: 'Competitive',
    bio: 'A short introduction written by this member.',
    quote: 'An optional favorite line.',
    image: 'assets/members/display-name.jpg'
  }],
  Image is optional; a styled initials avatar appears when omitted.
  */
  staff: [],
  /* staff: [{ name: 'Display name', role: 'Moderator',
       bio: 'How this person helps the community.', image: '' }], */
  events: [],
  /* Use an ISO 8601 date with an explicit timezone for startsAt and endsAt:
  events: [{ title: 'Event name', type: 'Gaming night',
    startsAt: 'YYYY-MM-DDTHH:mm:ss+08:00',
    endsAt: 'YYYY-MM-DDTHH:mm:ss+08:00',
    location: 'Discord voice', description: 'Details and how to take part.' }],
  Events display in each visitor's local timezone. Past events are omitted.
  */
  gallery: [
    {
      src: 'assets/optimized/hero.webp',
      alt: 'An armored adventurer facing a red portal in a ruined stone arena.',
      title: 'Into the next game',
      category: 'FTAP community artwork',
      caption: 'Original fantasy artwork for FTAP. The real adventures happen with the party.'
    }
  ],
  /* Add your actual screenshots or photos here with members' permission.
     Example: { src: 'assets/gallery/party.jpg', alt: 'Describe the image',
       title: 'A memorable night', category: 'Community moments', caption: '' }
  */
  rules: [
    { title: 'Respect the person.', text: 'Different backgrounds. Different skill levels. Treat everyone like a teammate.' },
    { title: 'Compete without the toxicity.', text: 'Play to win. Leave harassment, slurs, and personal attacks out of the party.' },
    { title: 'Keep it in the right channel.', text: 'Give conversations, game invites, and spoilers the right home.' },
    { title: "Protect each other's privacy.", text: 'Ask before sharing personal information, private messages, or photos.' },
    { title: 'Skip the spam.', text: 'No scams, unsolicited promotions, or repeated pings. Keep the server useful.' },
    { title: 'Let real life come first.', text: 'Work, family, and a little sleep matter. Nobody owes the queue their time.' }
  ],
  faqs: [
    { question: 'Malalakas ba mga tao jan?', answer: 'Malalakas. Malalakas mang-asar.' },
    { question: 'Pag washed-up na gameplay ko or lowskilled ako pwede ba ko dito?', answer: 'Tara, sama ka na sa listahan.' },
    { question: 'How do I meet other members?', answer: 'Drop into a conversation or voice channel, introduce yourself, and watch for community events. The member roster will also feature introductions as they become available.' },
    { question: 'How do I join?', answer: 'Use the Join Discord button when the community invite is available. You can also prepare an introduction through this website and share it in Discord.' },
    { question: 'How do I ask for help?', answer: 'Contact a moderator in Discord. For a private concern, use a private message rather than posting another member’s information in a public channel.' }
  ]
};
