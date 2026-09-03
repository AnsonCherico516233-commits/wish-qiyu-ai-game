import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '如你所愿｜祁煜 AI 文字游戏',
  description: '一场由你与 AI 共同续写的跨世界线沉浸式文字游戏。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
