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

export function HomePage() {
  return (
    <main>
      <Hero />
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
    </main>
  );
}
