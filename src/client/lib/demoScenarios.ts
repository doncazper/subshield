import type { SubmissionInput } from "../../shared/scoring";

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
  inputs: SubmissionInput[];
}

export const demoScenarios: DemoScenario[] = [
  {
    id: "mixed-queue",
    label: "Mixed review queue",
    description: "Five synthetic examples spanning clear, promotional, and hostile-language signals.",
    inputs: [
      {
        id: "preview-mixed-1",
        title: "Quick question about a build error",
        selfText: "I keep seeing this error after upgrading. What should I check?",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-mixed-2",
        title: "Limited time offer you can’t miss!!!!",
        selfText: "Act now. Message me for details and guaranteed income.",
        domain: "tinyurl.com",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-mixed-3",
        title: "Check out this community resource",
        selfText: "A reference guide that may answer common setup questions.",
        domain: "example.org",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-mixed-4",
        title: "Stop posting bad advice",
        selfText: "You're an idiot. Shut up and stop posting.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-mixed-5",
        title: "Earn cash fast today",
        selfText: "Risk free profit. Send crypto now for guaranteed income.",
        domain: "bit.ly",
        permalink: "",
        createdUtc: 0,
      },
    ],
  },
  {
    id: "promotional-patterns",
    label: "Promotional patterns",
    description: "Synthetic promotional language, link-shortener, and money-claim examples.",
    inputs: [
      {
        id: "preview-promo-1",
        title: "Free gift for every new member!!!!",
        selfText: "Act now and message me for details.",
        domain: "tinyurl.com",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-promo-2",
        title: "Earn cash with a risk free return",
        selfText: "Get $100 profit today with guaranteed income.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-promo-3",
        title: "Reference links for beginners",
        selfText: "Here is a short list of official documentation links.",
        domain: "example.org",
        permalink: "",
        createdUtc: 0,
      },
    ],
  },
  {
    id: "safety-language",
    label: "Safety language",
    description: "Synthetic examples that demonstrate published hostile-language rules.",
    inputs: [
      {
        id: "preview-safety-1",
        title: "Please stop replying",
        selfText: "You are an idiot and your advice is worthless.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-safety-2",
        title: "This is not okay",
        selfText: "I will find you and dox you.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-safety-3",
        title: "Can someone clarify the community rules?",
        selfText: "I want to make sure I understand the posting guidelines.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
    ],
  },
  {
    id: "clear-queue",
    label: "Clear queue",
    description: "Synthetic good-faith questions with no configured rule matches.",
    inputs: [
      {
        id: "preview-clear-1",
        title: "How should I prepare for the next release?",
        selfText: "I would appreciate a checklist from people who have done this before.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-clear-2",
        title: "Sharing a community-maintained guide",
        selfText: "This guide has useful references and is maintained by volunteers.",
        domain: "example.org",
        permalink: "",
        createdUtc: 0,
      },
      {
        id: "preview-clear-3",
        title: "Thanks for the detailed answer",
        selfText: "That solved my issue. I will mark this as resolved.",
        domain: "self",
        permalink: "",
        createdUtc: 0,
      },
    ],
  },
];
