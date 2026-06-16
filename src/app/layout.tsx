import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MorangoAI CRM - Voice Calling Agent Automation',
  description: 'Scalable CRM Dashboard integrated with Vapi Voice Agent and n8n Workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
