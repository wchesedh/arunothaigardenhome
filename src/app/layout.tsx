import Navbar from '@/components/Navbar';
import './globals.css'; 


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-6 px-4">{children}</main>
      </body>
    </html>
  );
}
