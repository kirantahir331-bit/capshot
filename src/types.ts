export type Platform =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube Shorts'
  | 'Facebook'
  | 'LinkedIn'
  | 'X/Twitter';

export type LanguagePair =
  | 'English + Roman Urdu'
  | 'English + Urdu'
  | 'English + Hindi'
  | 'English only';

export type Vibe =
  | 'Fun & witty'
  | 'Aesthetic & minimal'
  | 'Bold & confident'
  | 'Heartfelt'
  | 'Professional';

export interface CaptionCard {
  id: number | string;
  angle: string;
  primaryCaption: string;
  secondaryCaption: string;
  hashtags: string[];
}

export interface RecentItem {
  id: string;
  topic: string;
  platform: Platform;
  languagePair: LanguagePair;
  vibe: Vibe;
  myStyle?: string;
  cards: CaptionCard[];
  timestamp: number;
}
