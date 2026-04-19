import "dotenv/config";

import { PrismaLibSql } from "@prisma/adapter-libsql";

import { PrismaClient } from "../generated/prisma";
import { formatQuestionValidationMessage, validateQuestionFields } from "../src/lib/question-fields";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const sampleQuestions = [
  {
    questionText: "The finance team will finalize the budget report before the board meeting next Friday.",
    optionA: "revise",
    optionB: "finalize",
    optionC: "ship",
    optionD: "repair",
    correctAnswer: "B",
    explanation: "Finalize fits the context of completing a budget report before a meeting.",
    topic: "Finance",
    difficulty: "A",
  },
  {
    questionText: "Please submit your travel receipts to accounting no later than Monday afternoon.",
    optionA: "submit",
    optionB: "borrow",
    optionC: "ignore",
    optionD: "translate",
    correctAnswer: "A",
    explanation: "Submit is the correct business verb for sending receipts to accounting.",
    topic: "Travel",
    difficulty: "A",
  },
  {
    questionText: "Customers are encouraged to complete the online survey after each support call.",
    optionA: "install",
    optionB: "complete",
    optionC: "replace",
    optionD: "negotiate",
    correctAnswer: "B",
    explanation: "People complete a survey after receiving service.",
    topic: "Customer Service",
    difficulty: "A",
  },
  {
    questionText: "The warehouse manager requested an updated delivery schedule from the logistics vendor.",
    optionA: "delivery schedule",
    optionB: "coffee machine",
    optionC: "employee badge",
    optionD: "marketing slogan",
    correctAnswer: "A",
    explanation: "A logistics vendor provides delivery schedules, not the other items.",
    topic: "Logistics",
    difficulty: "A",
  },
  {
    questionText: "All applicants must attach a current resume when applying for the sales position.",
    optionA: "a current resume",
    optionB: "a kitchen menu",
    optionC: "a train ticket",
    optionD: "a room key",
    correctAnswer: "A",
    explanation: "A resume is required when applying for a position.",
    topic: "Human Resources",
    difficulty: "A",
  },
  {
    questionText: "The conference room has been reserved for the regional planning workshop.",
    optionA: "reserved",
    optionB: "cancelled",
    optionC: "printed",
    optionD: "folded",
    correctAnswer: "A",
    explanation: "Conference rooms are reserved for meetings and workshops.",
    topic: "Business Meetings",
    difficulty: "A",
  },
  {
    questionText: "Because the shipment was delayed at customs, the retailer adjusted its launch timeline.",
    optionA: "customs",
    optionB: "cafeteria",
    optionC: "reception",
    optionD: "headquarters lobby",
    correctAnswer: "A",
    explanation: "International shipments are commonly delayed at customs.",
    topic: "Logistics",
    difficulty: "B",
  },
  {
    questionText: "Our marketing director suggested revising the campaign slogan to target younger consumers.",
    optionA: "campaign slogan",
    optionB: "parking permit",
    optionC: "safety helmet",
    optionD: "office rent",
    correctAnswer: "A",
    explanation: "Campaign slogans belong to marketing work and are revised to fit audience needs.",
    topic: "Marketing",
    difficulty: "B",
  },
  {
    questionText: "Employees who finish the cybersecurity training will receive a completion certificate.",
    optionA: "completion certificate",
    optionB: "delivery invoice",
    optionC: "hotel voucher",
    optionD: "tax refund",
    correctAnswer: "A",
    explanation: "A completion certificate is commonly issued after mandatory training.",
    topic: "Office",
    difficulty: "A",
  },
  {
    questionText: "The hotel upgraded several guests to premium rooms after the air-conditioning issue was reported.",
    optionA: "premium rooms",
    optionB: "tax forms",
    optionC: "loading docks",
    optionD: "parking meters",
    correctAnswer: "A",
    explanation: "Hotels upgrade guests to premium rooms as a service recovery action.",
    topic: "Hospitality",
    difficulty: "B",
  },
  {
    questionText: "If you need access to the payroll system, contact the HR operations coordinator.",
    optionA: "HR operations coordinator",
    optionB: "delivery driver",
    optionC: "event photographer",
    optionD: "shop cashier",
    correctAnswer: "A",
    explanation: "Payroll system access is typically managed by HR operations.",
    topic: "Human Resources",
    difficulty: "B",
  },
  {
    questionText: "The purchasing department negotiated a lower unit price with the supplier last quarter.",
    optionA: "negotiated",
    optionB: "postponed",
    optionC: "decorated",
    optionD: "assembled",
    correctAnswer: "A",
    explanation: "Purchasing departments negotiate prices with suppliers.",
    topic: "Procurement",
    difficulty: "B",
  },
  {
    questionText: "Several attendees requested a digital copy of the product brochure after the trade fair presentation.",
    optionA: "product brochure",
    optionB: "meal coupon",
    optionC: "safety ladder",
    optionD: "warehouse locker",
    correctAnswer: "A",
    explanation: "A product brochure is a standard marketing document shared after presentations.",
    topic: "Marketing",
    difficulty: "B",
  },
  {
    questionText: "Before approving the reimbursement, the supervisor reviewed the original expense receipts.",
    optionA: "expense receipts",
    optionB: "passport photos",
    optionC: "meeting posters",
    optionD: "name tags",
    correctAnswer: "A",
    explanation: "Expense receipts are required for reimbursement approval.",
    topic: "Finance",
    difficulty: "A",
  },
  {
    questionText: "The branch manager asked staff to notify clients immediately if the seminar venue changes.",
    optionA: "notify clients immediately",
    optionB: "close the cafeteria permanently",
    optionC: "print fewer invoices",
    optionD: "remove the fire alarm",
    correctAnswer: "A",
    explanation: "If a seminar venue changes, clients should be notified right away.",
    topic: "Customer Service",
    difficulty: "B",
  },
  {
    questionText: "A detailed maintenance checklist was distributed to technicians before the factory inspection.",
    optionA: "maintenance checklist",
    optionB: "conference dessert",
    optionC: "gift receipt",
    optionD: "boarding music",
    correctAnswer: "A",
    explanation: "Technicians would use a maintenance checklist before an inspection.",
    topic: "Operations",
    difficulty: "B",
  },
  {
    questionText: "To improve onboarding, the company introduced a mentorship program for new hires.",
    optionA: "mentorship program",
    optionB: "billing error",
    optionC: "customs declaration",
    optionD: "inventory barcode",
    correctAnswer: "A",
    explanation: "A mentorship program is a common onboarding improvement.",
    topic: "Human Resources",
    difficulty: "A",
  },
  {
    questionText: "The auditor asked whether the revised policy had been communicated to every department head.",
    optionA: "communicated",
    optionB: "recycled",
    optionC: "landscaped",
    optionD: "sterilized",
    correctAnswer: "A",
    explanation: "Policies are communicated to relevant managers and department heads.",
    topic: "Office",
    difficulty: "B",
  },
  {
    questionText: "Passengers on the delayed flight were offered meal vouchers and hotel accommodations.",
    optionA: "meal vouchers",
    optionB: "equipment manuals",
    optionC: "cash registers",
    optionD: "security badges",
    correctAnswer: "A",
    explanation: "Airlines commonly offer meal vouchers after long delays.",
    topic: "Travel",
    difficulty: "A",
  },
  {
    questionText: "After comparing three vendors, the committee selected the proposal with the shortest implementation timeline.",
    optionA: "the shortest implementation timeline",
    optionB: "the brightest lobby lights",
    optionC: "the oldest filing cabinet",
    optionD: "the loudest ringtone",
    correctAnswer: "A",
    explanation: "Committees compare vendor proposals on implementation needs and timeline.",
    topic: "Procurement",
    difficulty: "C",
  },
  {
    questionText: "The legal team advised executives to postpone the merger announcement until all documents were signed.",
    optionA: "postpone the merger announcement",
    optionB: "raise the cafeteria prices",
    optionC: "replace the office carpet",
    optionD: "extend the lunch break",
    correctAnswer: "A",
    explanation: "A merger announcement may need to be postponed until documentation is complete.",
    topic: "Corporate Strategy",
    difficulty: "C",
  },
  {
    questionText: "According to the revised contract, late deliveries will result in a percentage-based penalty.",
    optionA: "a percentage-based penalty",
    optionB: "a free shuttle ride",
    optionC: "an office renovation",
    optionD: "a uniform allowance",
    correctAnswer: "A",
    explanation: "Contracts often specify a financial penalty for late delivery performance.",
    topic: "Logistics",
    difficulty: "C",
  },
  {
    questionText: "The analyst attributed the sales increase primarily to stronger demand in the online channel.",
    optionA: "stronger demand in the online channel",
    optionB: "a shorter lunch menu",
    optionC: "fewer parking spaces",
    optionD: "the paint color in the lobby",
    correctAnswer: "A",
    explanation: "Sales growth is logically attributed to stronger customer demand in a channel.",
    topic: "Sales",
    difficulty: "C",
  },
  {
    questionText: "When the keynote speaker canceled, the event team quickly arranged a replacement presenter.",
    optionA: "arranged a replacement presenter",
    optionB: "closed the registration website forever",
    optionC: "shipped the stage overseas",
    optionD: "deleted every attendee email",
    correctAnswer: "A",
    explanation: "Event teams typically find a replacement presenter when a speaker cancels.",
    topic: "Business Meetings",
    difficulty: "B",
  },
];

async function main() {
  const normalizedQuestions = sampleQuestions.map((question, index) => {
    const validation = validateQuestionFields(question);

    if (!validation.ok) {
      throw new Error(formatQuestionValidationMessage(validation.issue, { rowNumber: index + 1 }));
    }

    return validation.data;
  });

  for (const question of normalizedQuestions) {
    await prisma.questionBankItem.upsert({
      where: { questionText: question.questionText },
      update: question,
      create: question,
    });
  }

  console.log(`Seeded ${normalizedQuestions.length} question records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });