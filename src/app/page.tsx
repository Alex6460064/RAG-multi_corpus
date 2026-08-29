import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { CorpusHeader } from "@/components/corpus-header";
import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <>
      <DisclaimerBanner />
      <CorpusHeader />
      <Chat />
    </>
  );
}
