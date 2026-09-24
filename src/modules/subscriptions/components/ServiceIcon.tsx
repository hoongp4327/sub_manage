import { presetById } from '../data/presets';
import { categoryOf, type Category } from '../types';

const BG: Record<Category, string> = {
  work: 'bg-cat-work',
  entertainment: 'bg-cat-fun',
  other: 'bg-cat-other',
};

export function ServiceIcon({ category, presetId, size = 'md', muted }: { category: Category; presetId?: string | null; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const emoji = presetById(presetId)?.emoji ?? categoryOf(category).emoji;
  const dim = { sm: 'size-9 text-lg rounded-xl', md: 'size-12 text-2xl rounded-2xl', lg: 'size-14 text-[28px] rounded-2xl' }[size];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${BG[category]} ${dim} ${muted ? 'opacity-60 grayscale-[35%]' : ''}`}>
      {emoji}
    </span>
  );
}
