import { QuizDiscovery } from "../quiz/QuizPage";
import { Hero } from "../home/Hero";
import { SocialProof } from "../home/SocialProof";
import { StudentProblems } from "../home/StudentProblems";
import { HowItWorks } from "../home/HowItWorks";
import { SuccessJourney } from "../home/SuccessJourney";
import { SemesterHub } from "../home/SemesterHub";
import { TopNotes } from "../home/TopNotes";
import { PYQAnalysis } from "../home/PYQAnalysis";
import { Community } from "../home/Community";
import { PopularBundles } from "../home/PopularBundles";
import { CreditSpotlight } from "../home/CreditSpotlight";
import { FAQ } from "../home/FAQ";
import { Newsletter } from "../home/Newsletter";

export function HomePage() {
  return (
    <main>
      <Hero />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><QuizDiscovery /></div>
      <SocialProof />
      <StudentProblems />
      <HowItWorks />
      <SuccessJourney />
      <SemesterHub />
      <TopNotes />
      <PYQAnalysis />
      <Community />
      <PopularBundles />
      <CreditSpotlight />
      <FAQ />
      <Newsletter />
    </main>
  );
}
