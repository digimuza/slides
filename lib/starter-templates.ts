import type { Slide, Theme } from "./deck";

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  slide: Slide;
};

export const starterTemplates: StarterTemplate[] = [
  {
    id: "editorial",
    name: "Editorial opening",
    description: "Introduce an idea with a strong first impression.",
    theme: "editorial",
    slide: {
      id: "opening",
      layout: "cover",
      eyebrow: "A NEW PRESENTATION",
      title: "Your big idea starts here.",
      description: "Set the scene and give your audience a reason to lean in.",
      notes: "Introduce the idea and what your audience will take away.",
    },
  },
  {
    id: "midnight",
    name: "Midnight statement",
    description: "Put one clear message at the center.",
    theme: "midnight",
    slide: {
      id: "big-idea",
      layout: "statement",
      eyebrow: "THE BIG IDEA",
      title: "Make the point that matters.",
      description: "One focused thought can move the whole conversation forward.",
      notes: "Pause after the headline, then explain why it matters.",
    },
  },
  {
    id: "botanical",
    name: "Botanical quote",
    description: "Give a memorable line room to breathe.",
    theme: "botanical",
    slide: {
      id: "quote",
      layout: "quote",
      eyebrow: "A THOUGHT TO SHARE",
      title: "The best ideas grow when we share them.",
      description: "Your name or source",
      notes: "Connect this thought to the story you want to tell.",
    },
  },
  {
    id: "first-horizon",
    name: "First Horizon cover",
    description: "Start with the First Horizon presentation style.",
    theme: "first-horizon",
    slide: {
      id: "first-horizon-opening",
      layout: "cover",
      eyebrow: "PRESENTATION TITLE",
      title: "Your story starts here.",
      description: "Add a concise subtitle for your audience.",
      notes: "Introduce the topic and replace the starter copy before presenting.",
    },
  },
];
