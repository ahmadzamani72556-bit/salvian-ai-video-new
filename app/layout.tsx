import './globals.css';
import './studio.css';
import './logo.css';

export const metadata = {
  title: 'SALVIAN AI VIDEO',
  description: 'Long Video Creation Studio untuk membuat video 5–8 menit dengan AI.',
  icons: {
    icon: '/salvian-ai-video-logo.svg',
    apple: '/salvian-ai-video-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
