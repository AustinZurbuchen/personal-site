// Test fixture shaped like the document the Flask API returns from /getResume.
//
// A FUNCTION, not a shared const: several tests mutate their copy (short quotes
// array, missing section, string star counts) and a shared object would bleed
// that mutation into the next test. Note also that RTK/immer deep-freezes
// whatever object is dispatched into the store, so a shared const would end up
// frozen after the first test that used it.
//
// The shape here is what the COMPONENTS read, not what emptyResume declares:
// profile.age / profile.location are rendered by src/components/details/index.js
// and appear nowhere in emptyResume, which is exactly the pass-through the
// reducer test pins.
export function resumeFixture() {
  return {
    profile: {
      name: "Ada Lovelace",
      subtitle: "Analytical Engine enthusiast",
      description: "Writes clean, elegant, efficient code.",
      age: "36 years",
      location: "London, England",
    },
    experiences: {
      school: [
        {
          company: "SAN JOSE STATE",
          dateLabel: "May 2018",
          title: "BS, Computer Science",
          body: "Java, JS, algorithms.",
        },
      ],
      work: [
        {
          company: "BeyondID",
          dateLabel: "May 2021 - Present",
          title: "Technical Consultant",
          body: "Okta implementations.",
        },
        {
          company: "Google Fiber",
          dateLabel: "Jul 2018 - Jan 2020",
          title: "Tools Specialist",
          body: "Front-end features.",
        },
      ],
    },
    abilities: {
      languages: [
        { ability: "JavaScript", stars: 5 },
        { ability: "Dart", stars: 3 },
      ],
      technologies: [{ ability: "ReactJS", stars: 4 }],
    },
    quotes: [
      { quote: "Experiences quote", by: "- A" },
      { quote: "Abilities quote", by: "- B" },
      { quote: "Contact quote", by: "- C" },
    ],
    links: {
      email: "ada@example.com",
      linkedin: "https://linkedin.example/ada",
      github: "https://github.example/ada",
    },
  };
}
