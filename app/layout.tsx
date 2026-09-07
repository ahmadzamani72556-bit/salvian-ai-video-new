import './globals.css';

export const metadata = {
  title: 'SALVIAN AI VIDEO',
  description: 'Buat video YouTube dengan AI dari satu ide.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}