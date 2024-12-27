import { create } from "zustand";

const useStore = create((set) => ({
  resume: {
    experiences: {
      school: [],
      work: [],
    },
    abilities: {
      languages: [],
      technologies: [],
    },
    profile: {
      name: "",
      age: "",
      location: "",
      description: "",
      subtitle: "",
    },
    quotes: [],
    links: {
      email: "",
      linkedin: "",
      github: "",
    },
  },

  setResume: (resume) =>
    set({ resume }),
}));

export default useStore;
