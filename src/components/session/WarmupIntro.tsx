import AppCard from "@/components/ui/AppCard";
import { LearningPageCanvas } from "@/components/ui/learning-surface";

type WarmupIntroProps = {
  topicLabel: string;
  /** e.g. 練習 / 驗收 / 主題學習 */
  nextFlowLabelZh: string;
};

/**
 * Copy-first card: warm-up is not graded; it primes memory before the main line.
 */
export default function WarmupIntro({ topicLabel, nextFlowLabelZh }: WarmupIntroProps) {
  return (
    <LearningPageCanvas className="border-sky-200/70 bg-sky-50/50">
      <AppCard padding="md" className="border-white/80 bg-white/90">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Warm-up · 2 分鐘</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">先熱身，再進入主線</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
          這不是正式測驗，也不會影響通過與否或主題熟練度。目的只是用幾題最近接觸過的內容，幫大腦從「待機」切到「學習模式」。
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>共 3 題微題組，約 2 分鐘內可做完</li>
          <li>可隨時略過整段熱身，但預設建議先做完</li>
          <li>做完後再進入：{nextFlowLabelZh}（{topicLabel}）</li>
        </ul>
      </AppCard>
    </LearningPageCanvas>
  );
}
